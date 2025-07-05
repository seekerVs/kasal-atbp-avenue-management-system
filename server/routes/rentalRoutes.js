const express = require('express');
const mongoose = require('mongoose');
const { nanoid } = require('nanoid');
const asyncHandler = require('../utils/asyncHandler');
const RentalModel = require('../models/Rental.js');
const ItemModel = require('../models/Item.js');
const PackageModel = require('../models/Package.js');
const { calculateFinancials } = require('../utils/financialsCalculator');

const router = express.Router();

// GET all rentals with filtering
router.get('/', asyncHandler(async (req, res) => {
    const { customerPhoneNumber, status } = req.query;
    const filter = {};
    if (customerPhoneNumber) filter['customerInfo.phoneNumber'] = { $regex: new RegExp(customerPhoneNumber, 'i') };
    if (status) filter.status = status;
    
    const rentals = await RentalModel.find(filter).sort({ createdAt: -1 }).lean();

    // Enrich each rental with calculated financials
    const enrichedRentals = rentals.map(rental => {
        const calculated = calculateFinancials(rental);
        return { ...rental, financials: calculated };
    });

    res.status(200).json(enrichedRentals);
}));

// GET a single rental by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const rental = await RentalModel.findById(req.params.id).lean();
  if (!rental) return res.status(404).json({ message: "Rental not found." });

  // Calculate the full financial details using the helper
  const calculatedFinancials = calculateFinancials(rental);

  // Create the final response, merging the rental data with calculated financials
  const response = {
      ...rental,
      financials: calculatedFinancials,
  };

  res.status(200).json(response);
}));

// POST a new rental (single, package, or custom)
router.post('/', asyncHandler(async (req, res) => {
    // Destructure the new, flexible payload shape from the frontend
    const { customerInfo, singleRents, packageRents, customTailoring } = req.body;

    // 1. Validate mandatory customer information
    if (!customerInfo || !Array.isArray(customerInfo) || customerInfo.length === 0) {
        return res.status(400).json({ message: "Valid customer information is required." });
    }

    // 2. Validate that at least one type of rental item is included
    const hasRentalData = (singleRents && singleRents.length > 0) || 
                          (packageRents && packageRents.length > 0) || 
                          (customTailoring && customTailoring.length > 0);

    if (!hasRentalData) {
        return res.status(400).json({ message: "Request must include at least one type of rental item (single, package, or custom)." });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 3. Prepare the base rental document
        const newRentalId = `rent_${nanoid(8)}`;
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + 4); // Default 4-day rental period

        const rentalData = {
            _id: newRentalId,
            customerInfo,
            singleRents: [],
            packageRents: [],
            customTailoring: [], // Initialize all item arrays
            financials: { shopDiscount: 0, depositAmount: 0 },
            rentalStartDate: startDate.toISOString().split('T')[0],
            rentalEndDate: endDate.toISOString().split('T')[0],
            status: "To Process",
        };

        // --- Independent Processing Blocks ---

        // 4. Process Single Rents if they exist in the payload
        if (singleRents && Array.isArray(singleRents) && singleRents.length > 0) {
            // Your logic for updating stock for single items would go here.
            // This is a placeholder; you'd need to implement stock reduction.
            rentalData.singleRents = singleRents;
        }

        // 5. Process Package Rents if they exist in the payload
        if (packageRents && Array.isArray(packageRents) && packageRents.length > 0) {
            const stockUpdates = [];
            for (const pkg of packageRents) {
                if (pkg.packageFulfillment && Array.isArray(pkg.packageFulfillment)) {
                    for (const fulfillment of pkg.packageFulfillment) {
                        const item = fulfillment.assignedItem;
                        // Only update stock for actual inventory items, not custom placeholders
                        if (item && item.itemId && item.variation) {
                            const [itemColor, itemSize] = item.variation.split(', ');
                            stockUpdates.push({
                                updateOne: {
                                    filter: { _id: item.itemId, "variations.color": itemColor, "variations.size": itemSize },
                                    update: { $inc: { "variations.$.quantity": -1 } }
                                }
                            });
                        }
                    }
                }
            }
            if (stockUpdates.length > 0) {
                await ItemModel.bulkWrite(stockUpdates, { session });
            }
            // Add the processed package data to the rental document
            rentalData.packageRents = packageRents;
        }

        // 6. Process Custom Tailoring items if they exist in the payload
        if (customTailoring && Array.isArray(customTailoring) && customTailoring.length > 0) {
            // No stock updates are needed for custom items, just add the data.
            rentalData.customTailoring = customTailoring;
        }

        // 7. Save the fully constructed rental document
        const rental = new RentalModel(rentalData);
        await rental.save({ session });
        
        // 8. Commit the transaction if everything succeeded
        await session.commitTransaction();
        res.status(201).json(rental);

    } catch (error) {
        // If any step fails, abort the entire transaction
        await session.abortTransaction();
        console.error("Rental Creation Failed:", error); // Log the full error for better debugging
        // Provide a meaningful error message to the client
        res.status(500).json({ message: error.message || "An internal server error occurred during rental creation." });
    } finally {
        // Always end the session
        session.endSession();
    }
}));

router.put('/:id/process', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
        status,
        rentalStartDate,
        rentalEndDate,
        shopDiscount,
        depositAmount,
        payment
    } = req.body;

    const session = await mongoose.startSession();
    try {
        await session.startTransaction();

        const rental = await RentalModel.findById(id).session(session);
        if (!rental) {
            throw new Error("Rental not found.");
        }

        const originalStatus = rental.status;

        // --- NEW LOGIC FOR STOCK RESTORATION ---
        // Check if the status is changing TO 'Returned' from a non-returned state
        if (status === 'Returned' && originalStatus !== 'Returned') {
            const stockUpdateOperations = [];

            // 1. Restore stock for singleRents
            if (rental.singleRents?.length > 0) {
                rental.singleRents.forEach(item => {
                    const nameParts = item.name.split(',');
                    if (nameParts.length < 3) {
                        console.warn(`Skipping stock restoration for malformed item name: ${item.name}`);
                        return;
                    }
                    const size = nameParts.pop().trim();
                    const color = nameParts.pop().trim();
                    const productName = nameParts.join(',').trim();
                    stockUpdateOperations.push({
                        updateOne: {
                            filter: { name: productName, "variations.color": color, "variations.size": size },
                            update: { $inc: { "variations.$.quantity": item.quantity } }
                        }
                    });
                });
            }

            // 2. Restore stock for packageRents
            if (rental.packageRents?.length > 0) {
                rental.packageRents.forEach(pkg => {
                    pkg.packageFulfillment?.forEach(fulfillment => {
                        const item = fulfillment.assignedItem;
                        if (item && item.itemId && item.variation) {
                            const [color, size] = item.variation.split(',').map(s => s.trim());
                            stockUpdateOperations.push({
                                updateOne: {
                                    filter: { _id: item.itemId, "variations.color": color, "variations.size": size },
                                    update: { $inc: { "variations.$.quantity": 1 } }
                                }
                            });
                        }
                    });
                });
            }

            // 3. Execute all stock updates if any were generated
            if (stockUpdateOperations.length > 0) {
                await ItemModel.bulkWrite(stockUpdateOperations, { session });
            }
        }
        // --- END OF STOCK RESTORATION LOGIC ---

        // --- Update general rental info ---
        if (status) rental.status = status;
        if (rentalStartDate) rental.rentalStartDate = rentalStartDate;
        if (rentalEndDate) rental.rentalEndDate = rentalEndDate;
        
        // Ensure financials object exists before modification
        if (!rental.financials) rental.financials = {};
        
        if (shopDiscount !== undefined) {
            rental.financials.shopDiscount = parseFloat(shopDiscount) || 0;
        }
        if (depositAmount !== undefined) {
            rental.financials.depositAmount = parseFloat(depositAmount) || 0;
        }
        
        // --- Handle payment recording ---
        if (payment && typeof payment.amount === 'number' && payment.amount > 0) {
            const paymentDetail = {
                amount: payment.amount,
                date: new Date(),
                referenceNumber: payment.referenceNumber || null,
            };
            
            if (!rental.financials.downPayment) {
                rental.financials.downPayment = paymentDetail;
            } else {
                rental.financials.finalPayment = paymentDetail;
            }
        }
        
        // --- Save all changes ---
        const updatedRental = await rental.save({ session });

        await session.commitTransaction();
        res.status(200).json(updatedRental);

    } catch (error) {
        await session.abortTransaction();
        console.error(`Error processing rental ${id}:`, error);
        throw error; // Let the global error handler manage the response
    } finally {
        session.endSession();
    }
}));

// PUT to add a new item to an existing rental
router.put('/:id/addItem', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { singleRents, packageRents, customTailoring } = req.body;

    const session = await mongoose.startSession();
    
    try {
        await session.startTransaction();

        // Step 1: Fetch the rental document and ensure it can be modified.
        const rental = await RentalModel.findById(id).session(session);
        if (!rental) {
            throw new Error("Rental not found.");
        }
        
        if (rental.status !== 'To Process') {
            throw new Error(`Cannot add items to a rental with status "${rental.status}".`);
        }

        // =========================================================================
        // --- UPGRADED: Process Single Rents (if present) ---
        // =========================================================================
        if (singleRents && Array.isArray(singleRents) && singleRents.length > 0) {
            const stockUpdates = [];

            for (const newItem of singleRents) {
                // Find if an item with the exact same name (incl. variation) already exists.
                const existingItemIndex = rental.singleRents.findIndex(
                    (existing) => existing.name === newItem.name
                );
                
                // --- Perform a stock check before any modifications ---
                const nameParts = newItem.name.split(',');
                if (nameParts.length < 3) throw new Error(`Invalid item name format: ${newItem.name}`);

                const size = nameParts.pop()?.trim();
                const color = nameParts.pop()?.trim();
                const productName = nameParts.join(',').trim();
                
                const productInDb = await ItemModel.findOne({ name: productName }).session(session);
                if (!productInDb) {
                    throw new Error(`Product "${productName}" not found in inventory.`);
                }

                const variationInDb = productInDb.variations.find(v => v.color === color && v.size === size);
                if (!variationInDb || variationInDb.quantity < newItem.quantity) {
                    throw new Error(`Insufficient stock for ${newItem.name}. Only ${variationInDb?.quantity || 0} available.`);
                }
                
                // If stock is sufficient, prepare the stock update operation.
                stockUpdates.push({
                    updateOne: {
                        filter: { _id: productInDb._id, "variations.color": color, "variations.size": size },
                        update: { $inc: { "variations.$.quantity": -newItem.quantity } }
                    }
                });

                // --- Decide whether to add a new item or increment an existing one ---
                if (existingItemIndex > -1) {
                    // Scenario 1: Item EXISTS. Increment its quantity.
                    rental.singleRents[existingItemIndex].quantity += newItem.quantity;
                } else {
                    // Scenario 2: Item is NEW. Add it to the rental's array.
                    rental.singleRents.push(newItem);
                }
            }

            // Execute all prepared stock updates at once.
            if (stockUpdates.length > 0) {
                await ItemModel.bulkWrite(stockUpdates, { session });
            }
        }
        // =========================================================================

        // --- Process Package Rents (if present) --- (No changes needed here)
        if (packageRents && Array.isArray(packageRents) && packageRents.length > 0) {
            const stockUpdates = [];
            for (const pkg of packageRents) {
                if (pkg.packageFulfillment && Array.isArray(pkg.packageFulfillment)) {
                    for (const fulfillment of pkg.packageFulfillment) {
                        const item = fulfillment.assignedItem;
                        if (item && item.itemId && item.variation) {
                            const [itemColor, itemSize] = item.variation.split(', ');
                            stockUpdates.push({
                                updateOne: {
                                    filter: { _id: item.itemId, "variations.color": itemColor, "variations.size": itemSize },
                                    update: { $inc: { "variations.$.quantity": -1 } }
                                }
                            });
                        }
                    }
                }
                rental.packageRents.push(pkg);
            }
            if (stockUpdates.length > 0) {
                await ItemModel.bulkWrite(stockUpdates, { session });
            }
        }

        // --- Process Custom Tailoring (if present) --- (No changes needed here)
        if (customTailoring && Array.isArray(customTailoring) && customTailoring.length > 0) {
            rental.customTailoring.push(...customTailoring);
        }

        // Save all changes to the rental document.
        const updatedRental = await rental.save({ session });
        
        await session.commitTransaction();
        res.status(200).json(updatedRental);

    } catch (error) {
        await session.abortTransaction();
        console.error("Error adding item to rental:", error);
        throw error; 
    } finally {
        session.endSession();
    }
}));


// --- ALL OTHER RENTAL ROUTES (UPDATE/DELETE) ---
// This section includes the robust item name parsing and transaction fixes

// PUT to update a single item within a rental
router.put('/:rentalId/items/:itemName', asyncHandler(async (req, res) => {
    const { rentalId, itemName } = req.params;
    const { quantity, newVariation } = req.body;
    if (!quantity || quantity < 1) throw new Error("Invalid quantity provided.");
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const rental = await RentalModel.findById(rentalId).session(session);
        if (!rental) throw new Error("Rental not found.");
        const itemIndex = rental.singleRents.findIndex(item => item.name === itemName);
        if (itemIndex === -1) throw new Error("Item not found in this rental.");
        const originalItem = rental.singleRents[itemIndex];
        const nameParts = originalItem.name.split(',');
        if (nameParts.length < 3) throw new Error(`Invalid item name format: ${originalItem.name}`);
        const originalSize = nameParts.pop().trim();
        const originalColor = nameParts.pop().trim();
        const productName = nameParts.join(',').trim();
        const product = await ItemModel.findOne({ name: productName }).session(session);
        if (!product) throw new Error(`Base product "${productName}" not found.`);
        const hasVariationChanged = newVariation && (newVariation.color !== originalColor || newVariation.size !== originalSize);
        if (hasVariationChanged) {
            const newVarDetails = product.variations.find(v => v.color === newVariation.color && v.size === newVariation.size);
            if (!newVarDetails || newVarDetails.quantity < quantity) throw new Error(`Insufficient stock for new variation.`);
            await ItemModel.updateOne({ _id: product._id, "variations.color": originalColor, "variations.size": originalSize }, { $inc: { "variations.$.quantity": originalItem.quantity } }, { session });
            await ItemModel.updateOne({ _id: product._id, "variations.color": newVariation.color, "variations.size": newVariation.size }, { $inc: { "variations.$.quantity": -quantity } }, { session });
            rental.singleRents[itemIndex].name = `${productName},${newVariation.color},${newVariation.size}`;
            rental.singleRents[itemIndex].imageUrl = newVarDetails.imageUrl;
        } else {
            const currentVarDetails = product.variations.find(v => v.color === originalColor && v.size === originalSize);
            if (!currentVarDetails) throw new Error("Current variation not found in inventory.");
            const qtyDiff = quantity - originalItem.quantity;
            if (qtyDiff > 0 && currentVarDetails.quantity < qtyDiff) throw new Error(`Insufficient stock. Only ${currentVarDetails.quantity} more available.`);
            if (qtyDiff !== 0) await ItemModel.updateOne({ _id: product._id, "variations.color": originalColor, "variations.size": originalSize }, { $inc: { "variations.$.quantity": -qtyDiff } }, { session });
        }
        rental.singleRents[itemIndex].quantity = quantity;
        await rental.save({ session });
        await session.commitTransaction();
        const updatedRental = await RentalModel.findById(rentalId).lean();
        res.status(200).json(updatedRental);
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}));

// DELETE a single item from a rental
router.delete('/:rentalId/items/:itemName', asyncHandler(async (req, res) => {
  const { rentalId, itemName } = req.params;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const rental = await RentalModel.findById(rentalId).session(session);
    if (!rental) throw new Error("Rental not found.");
    const itemToRemove = rental.singleRents.find(item => item.name === itemName);
    if (!itemToRemove) throw new Error("Item not found in this rental.");
    const nameParts = itemToRemove.name.split(',');
    if (nameParts.length < 3) throw new Error("Invalid item name format.");
    const size = nameParts.pop().trim();
    const color = nameParts.pop().trim();
    const productName = nameParts.join(',').trim();
    await ItemModel.updateOne({ name: productName, "variations.color": color, "variations.size": size }, { $inc: { "variations.$.quantity": itemToRemove.quantity } }, { session });
    const updatedRental = await RentalModel.findByIdAndUpdate(rentalId, { $pull: { singleRents: { name: itemName } } }, { new: true, session }).lean();
    await session.commitTransaction();
    res.status(200).json(updatedRental);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}));

// PUT to update fulfillment of a package in a rental
router.put('/:rentalId/packages/:pkgName', asyncHandler(async (req, res) => {
    const { rentalId, pkgName } = req.params;
    const { packageFulfillment } = req.body;
    if (!packageFulfillment || !Array.isArray(packageFulfillment)) throw new Error("Invalid packageFulfillment data.");
    const rental = await RentalModel.findById(rentalId);
    if (!rental) throw new Error("Rental not found.");
    const packageIndex = rental.packageRents.findIndex(pkg => pkg.name === pkgName);
    if (packageIndex === -1) throw new Error(`Package "${pkgName}" not found in this rental.`);
    rental.packageRents[packageIndex].packageFulfillment = packageFulfillment;
    await rental.save();
    const updatedRental = await RentalModel.findById(rentalId).lean();
    res.status(200).json(updatedRental);
}));

// --- NEW: DELETE A PACKAGE FROM A RENTAL AND RESTORE STOCK ---
router.delete('/:rentalId/packages/:pkgName', asyncHandler(async (req, res) => {
    // --- CHANGE #1: Decode the package name from the URL ---
    const rentalId = req.params.rentalId;
    const pkgName = decodeURIComponent(req.params.pkgName); // Use the decoded name

    const session = await mongoose.startSession();
    try {
        await session.startTransaction();

        // 1. Find the rental to get the package data
        const rental = await RentalModel.findById(rentalId).session(session);
        if (!rental) throw new Error("Rental not found.");

        const packageToRemove = rental.packageRents.find(pkg => pkg.name === pkgName);
        if (!packageToRemove) throw new Error(`Package "${pkgName}" not found in this rental.`);

        // 2. Build the stock restoration operations AND identify custom items to delete
        const stockUpdateOperations = [];
        const customItemNamesToDelete = new Set(); // Use a Set to store names of custom items to remove

        if (packageToRemove.packageFulfillment && packageToRemove.packageFulfillment.length > 0) {
            for (const fulfillment of packageToRemove.packageFulfillment) {
                const item = fulfillment.assignedItem;

                // --- LOGIC FOR INVENTORY ITEMS (No change here) ---
                if (item && item.itemId && item.variation) {
                    const [color, size] = item.variation.split(',').map(s => s.trim());
                    stockUpdateOperations.push({
                        updateOne: {
                            filter: { _id: item.itemId, "variations.color": color, "variations.size": size },
                            update: { $inc: { "variations.$.quantity": 1 } }
                        }
                    });
                }
                
                // --- CHANGE #2: Identify associated custom items ---
                // If the role is designated as custom and has an assigned item name, add it to our deletion list.
                if (fulfillment.isCustom && item && item.name) {
                    customItemNamesToDelete.add(item.name);
                }
            }
        }
        
        // 3. Execute stock updates if any
        if (stockUpdateOperations.length > 0) {
            await ItemModel.bulkWrite(stockUpdateOperations, { session });
        }

        // --- CHANGE #3: Create a single, powerful update query ---
        // This query will remove the package AND the associated custom items in one go.
        const updateQuery = {
            $pull: {
                // Remove the package from the packageRents array
                packageRents: { name: pkgName },
                // Remove any custom items from the customTailoring array whose names match our list
                customTailoring: { name: { $in: Array.from(customItemNamesToDelete) } }
            }
        };

        // 4. Remove the items from the rental's arrays using the new query
        const updatedRental = await RentalModel.findByIdAndUpdate(
            rentalId,
            updateQuery, // Use the new, combined update query
            { new: true, session }
        ).lean();

        // 5. Commit the transaction
        await session.commitTransaction();
        res.status(200).json(updatedRental);

    } catch (error) {
        await session.abortTransaction();
        console.error("Error deleting package from rental:", error);
        throw error; // Let global handler manage the response
    } finally {
        session.endSession();
    }
}));


// PUT to update a custom tailoring item in a rental
router.put('/:rentalId/custom-items', asyncHandler(async (req, res) => {
    const { rentalId } = req.params;
    const updatedItem = req.body;
    if (!updatedItem || !updatedItem.name) throw new Error("Invalid custom item data.");
    const rental = await RentalModel.findById(rentalId);
    if (!rental) throw new Error("Rental not found.");
    const itemIndex = rental.customTailoring.findIndex(item => item.name === updatedItem.name);
    if (itemIndex === -1) throw new Error("Custom item not found in rental.");
    rental.customTailoring[itemIndex] = updatedItem;
    await rental.save();
    res.status(200).json(rental);
}));

// DELETE a custom item from a rental
router.delete('/:rentalId/custom-items/:itemName', asyncHandler(async (req, res) => {
    const { rentalId, itemName } = req.params;
    const updatedRental = await RentalModel.findByIdAndUpdate(
        rentalId,
        { $pull: { customTailoring: { name: itemName } } },
        { new: true }
    ).lean();
    if (!updatedRental) throw new Error("Rental not found during deletion.");
    res.status(200).json(updatedRental);
}));

// --- DELETE AN ENTIRE RENTAL DOCUMENT AND RESTORE ALL STOCK ---
router.delete('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const session = await mongoose.startSession();

    try {
        await session.startTransaction();

        // 1. Find the rental document within the transaction to get its data before deletion
        const rentalToDelete = await RentalModel.findById(id).session(session);
        if (!rentalToDelete) {
            throw new Error("Rental not found.");
        }

        const stockUpdateOperations = [];

        // 2. Process 'singleRents' to restore stock
        if (rentalToDelete.singleRents && rentalToDelete.singleRents.length > 0) {
            rentalToDelete.singleRents.forEach(item => {
                const nameParts = item.name.split(',');
                if (nameParts.length < 3) {
                    console.warn(`Skipping stock restoration for malformed item name: ${item.name}`);
                    return;
                }
                const size = nameParts.pop().trim();
                const color = nameParts.pop().trim();
                const productName = nameParts.join(',').trim();

                stockUpdateOperations.push({
                    updateOne: {
                        filter: { name: productName, "variations.color": color, "variations.size": size },
                        update: { $inc: { "variations.$.quantity": item.quantity } }
                    }
                });
            });
        }

        // 3. Process 'packageRents' and their fulfillments to restore stock
        if (rentalToDelete.packageRents && rentalToDelete.packageRents.length > 0) {
            rentalToDelete.packageRents.forEach(pkg => {
                if (pkg.packageFulfillment && pkg.packageFulfillment.length > 0) {
                    pkg.packageFulfillment.forEach(fulfillment => {
                        const assignedItem = fulfillment.assignedItem;
                        // Only process items that have a valid itemId and variation
                        if (assignedItem && assignedItem.itemId && assignedItem.variation) {
                             const [color, size] = assignedItem.variation.split(',').map(s => s.trim());
                             stockUpdateOperations.push({
                                 updateOne: {
                                     filter: { _id: assignedItem.itemId, "variations.color": color, "variations.size": size },
                                     update: { $inc: { "variations.$.quantity": 1 } } // Assuming quantity is always 1 for package fulfillment
                                 }
                             });
                        }
                    });
                }
            });
        }

        // 4. Execute all stock updates in a single batch operation if any exist
        if (stockUpdateOperations.length > 0) {
            await ItemModel.bulkWrite(stockUpdateOperations, { session });
        }

        // 5. Finally, delete the rental document itself
        await RentalModel.findByIdAndDelete(id, { session });

        // 6. If all operations succeeded, commit the transaction
        await session.commitTransaction();

        res.status(200).json({ success: true, message: `Rental ${id} deleted and stock restored successfully.` });

    } catch (error) {
        // If any error occurred, abort the entire transaction
        await session.abortTransaction();
        console.error(`Failed to delete rental ${id}:`, error);
        // Pass the error to the global error handler
        throw error; 
    } finally {
        // Always end the session
        session.endSession();
    }
}));

// --- NEW: PRE-PICKUP VALIDATION ENDPOINT ---
router.get('/:id/pre-pickup-validation', asyncHandler(async (req, res) => {
    const { id } = req.params;

    const rental = await RentalModel.findById(id).lean();
    if (!rental) {
        throw new Error("Rental not found.");
    }

    const warnings = [];

    // --- Validation 1: Check Package Fulfillment ---
    if (rental.packageRents && rental.packageRents.length > 0) {
        rental.packageRents.forEach(pkg => {
            const incompleteRoles = pkg.packageFulfillment
                .filter(fulfill => {
                    const hasItem = !!fulfill.assignedItem?.itemId;
                    const hasVariation = !!fulfill.assignedItem?.variation;
                    // A role is incomplete if it's a standard item missing details
                    return !fulfill.assignedItem?.name?.includes(':') && (!hasItem || !hasVariation);
                })
                .map(fulfill => fulfill.role);

            if (incompleteRoles.length > 0) {
                warnings.push(
                    `In package "${pkg.name.split(',')[0]}", the following roles are incomplete: ${incompleteRoles.join(', ')}.`
                );
            }
        });
    }

    // --- Validation 2: Check Custom Tailoring Items ---
    if (rental.customTailoring && rental.customTailoring.length > 0) {
        rental.customTailoring.forEach(item => {
            // Check for missing measurements. An empty object or few keys might be a flag.
            if (!item.measurements || Object.keys(item.measurements).length === 0) {
                warnings.push(
                    `Custom item "${item.name}" is missing required measurements.`
                );
            }
            // Add other checks here if needed, e.g., for materials
            if (!item.materials || item.materials.length === 0 || item.materials[0].trim() === '') {
                 warnings.push(
                    `Custom item "${item.name}" is missing material specifications.`
                );
            }
        });
    }

    res.status(200).json({ warnings });
}));


module.exports = router;