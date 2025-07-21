const express = require('express');
const mongoose = require('mongoose');
const { nanoid } = require('nanoid');
const asyncHandler = require('../utils/asyncHandler');
const RentalModel = require('../models/Rental.js');
const ItemModel = require('../models/Item.js');
const PackageModel = require('../models/Package.js');
const { calculateFinancials } = require('../utils/financialsCalculator');
const { del } = require('@vercel/blob');

const router = express.Router();

// GET all rentals with filtering
router.get('/', asyncHandler(async (req, res) => {
    const { customerPhoneNumber, status } = req.query;
    const filter = {};
    if (customerPhoneNumber) filter['customerInfo.phoneNumber'] = { $regex: new RegExp(customerPhoneNumber, 'i') };
    if (status) filter.status = status;
    
    const rentals = await RentalModel.find(filter).sort({ createdAt: -1 }).lean(); //.lean()

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
    const { customerInfo, singleRents, packageRents, customTailoring } = req.body;

    // --- 1. Validate mandatory information ---
    if (!customerInfo || !Array.isArray(customerInfo) || customerInfo.length === 0) {
        return res.status(400).json({ message: "Valid customer information is required." });
    }
    const hasRentalData = (singleRents && singleRents.length > 0) || 
                          (packageRents && packageRents.length > 0) || 
                          (customTailoring && customTailoring.length > 0);
    if (!hasRentalData) {
        return res.status(400).json({ message: "Request must include at least one rental item." });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // --- 2. Prepare the base rental data object ---
        const newRentalId = `rent_${nanoid(8)}`;
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + 4); // Default 4-day rental period

        // This is a plain JavaScript object for assembling data.
        const rentalData = {
            _id: newRentalId,
            customerInfo,
            singleRents: [],
            packageRents: [],
            customTailoring: [],
            financials: { shopDiscount: 0, depositAmount: 0 },
            rentalStartDate: startDate.toISOString().split('T')[0],
            rentalEndDate: endDate.toISOString().split('T')[0],
            status: "To Process",
        };

        // --- 3. Process each item type and update stock ---

        // Process Single Rents
        if (singleRents && Array.isArray(singleRents) && singleRents.length > 0) {
            const stockUpdates = [];
            for (const item of singleRents) {
                const nameParts = item.name.split(',');
                if (nameParts.length < 3) throw new Error(`Invalid item name format: ${item.name}`);
                
                const size = nameParts.pop().trim();
                const color = nameParts.pop().trim();
                const productName = nameParts.join(',').trim();

                const productInDb = await ItemModel.findOne({ name: productName }).session(session);
                if (!productInDb) {
                    throw new Error(`Product "${productName}" not found in inventory.`);
                }

                const variationInDb = productInDb.variations.find(v => v.color === color && v.size === size);
                if (!variationInDb || variationInDb.quantity < item.quantity) {
                    throw new Error(`Insufficient stock for ${item.name}. Only ${variationInDb?.quantity || 0} available.`);
                }

                // Prepare the stock update operation for this item.
                stockUpdates.push({
                    updateOne: {
                        filter: { _id: productInDb._id, "variations.color": color, "variations.size": size },
                        update: { $inc: { "variations.$.quantity": -item.quantity } }
                    }
                });
            }
            
            // Execute all stock updates at once.
            if (stockUpdates.length > 0) {
                await ItemModel.bulkWrite(stockUpdates, { session });
            }
            
            // Add the items to the rental data object.
            rentalData.singleRents = singleRents;
        }

        // Process Package Rents
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
            }
            if (stockUpdates.length > 0) {
                await ItemModel.bulkWrite(stockUpdates, { session });
            }
            // Add the processed package data to the rentalData object
            rentalData.packageRents = packageRents;
        }

        // Process Custom Tailoring items
        if (customTailoring && Array.isArray(customTailoring) && customTailoring.length > 0) {
            // No stock updates needed, just add the data.
            rentalData.customTailoring = customTailoring;
        }

        // --- 4. Create and save the Mongoose document ---
        // 'rental' is only declared and initialized HERE, after rentalData is fully built.
        const rental = new RentalModel(rentalData);
        await rental.save({ session });
        
        // --- 5. Commit transaction and send response ---
        await session.commitTransaction();
        res.status(201).json(rental);

    } catch (error) {
        await session.abortTransaction();
        console.error("Rental Creation Failed:", error);
        // Let the global error handler manage the response
        throw error;
    } finally {
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
        depositReimbursed,
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

            if (depositReimbursed !== undefined) {
                if (parseFloat(depositReimbursed) > rental.financials.depositAmount) {
                     throw new Error(`Reimbursement amount of ${depositReimbursed} exceeds the paid deposit of ${rental.financials.depositAmount}.`);
                }
                rental.financials.depositReimbursed = parseFloat(depositReimbursed);
            }

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

            // First, get the calculated financials for the rental AS IT CURRENTLY STANDS
            // (including any discount/deposit changes made in this same request).
            // We create a temporary rental object for the calculator.
            const tempRentalForCalc = {
                ...rental.toObject(),
                financials: {
                    ...rental.financials,
                    shopDiscount: parseFloat(shopDiscount) || rental.financials.shopDiscount,
                    depositAmount: parseFloat(depositAmount) || rental.financials.depositAmount
                }
            };
            const calculatedFinancials = calculateFinancials(tempRentalForCalc);
            const grandTotal = calculatedFinancials.grandTotal;

            // --- THIS IS THE NEW LOGIC ---
            // If this is the very first payment...
            if (!rental.financials.downPayment && !rental.financials.finalPayment) {
                // ...check if the payment amount covers the entire grand total.
                if (payment.amount >= grandTotal) {
                    // If it's a full payment, store it in the 'finalPayment' field
                    // to signify that the rental is paid in full from the start.
                    rental.financials.finalPayment = paymentDetail;
                } else {
                    // Otherwise, it's a partial payment, so store it as a 'downPayment'.
                    rental.financials.downPayment = paymentDetail;
                }
            } else {
                // If a down payment already exists, this new payment must be the final one.
                rental.financials.finalPayment = paymentDetail;
            }
        }
        // --- Save all changes ---
        const updatedRental = await rental.save({ session });

        await session.commitTransaction();
        const calculatedFinancials = calculateFinancials(updatedRental.toObject());

        const finalResponse = {
            ...updatedRental.toObject(),
            financials: calculatedFinancials,
        };

        res.status(200).json(finalResponse);

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
        const calculatedFinancials = calculateFinancials(updatedRental.toObject());
        const finalResponse = {
            ...updatedRental.toObject(),
            financials: calculatedFinancials,
        };

        res.status(200).json(finalResponse);

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
router.put('/:rentalId/items/:itemId', asyncHandler(async (req, res) => {
    const { rentalId, itemId } = req.params;
    const { quantity, newVariation } = req.body;

    // --- 1. VALIDATE INPUT ---
    if (!quantity || quantity < 1) {
        throw new Error("Invalid quantity provided. Must be at least 1.");
    }
    if (!newVariation || !newVariation.color || !newVariation.size) {
        throw new Error("Invalid new variation data provided.");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // --- 2. FIND THE RENTAL AND THE SPECIFIC ITEM TO UPDATE ---
        const rental = await RentalModel.findById(rentalId).session(session);
        if (!rental) {
            throw new Error("Rental not found.");
        }

        const itemToUpdate = rental.singleRents.id(itemId); // Using .id() to find the subdocument
        if (!itemToUpdate) {
            res.status(404);
            throw new Error("Item not found in this rental.");
        }

        // --- 3. PARSE DETAILS OF THE ORIGINAL ITEM ---
        const originalQuantity = itemToUpdate.quantity;
        const nameParts = itemToUpdate.name.split(',');
        if (nameParts.length < 3) throw new Error(`Invalid item name format: ${itemToUpdate.name}`);
        
        const originalSize = nameParts.pop().trim();
        const originalColor = nameParts.pop().trim();
        const productName = nameParts.join(',').trim(); // Rejoin if product name had commas

        // Find the base product in the inventory
        const product = await ItemModel.findOne({ name: productName }).session(session);
        if (!product) {
            throw new Error(`Base product "${productName}" not found in inventory.`);
        }
        
        const hasVariationChanged = newVariation.color !== originalColor || newVariation.size !== originalSize;
        
        // --- 4. HANDLE STOCK ADJUSTMENTS ATOMICALLY ---
        if (hasVariationChanged) {
            // The variation is changing completely.
            // A) Check if there is enough stock for the NEW variation.
            const newVarDetails = product.variations.find(v => v.color === newVariation.color && v.size === newVariation.size);
            if (!newVarDetails || newVarDetails.quantity < quantity) {
                throw new Error(`Insufficient stock for new variation ${newVariation.color}/${newVariation.size}. Only ${newVarDetails?.quantity || 0} available.`);
            }
            // B) Restore stock for the OLD variation.
            await ItemModel.updateOne(
                { _id: product._id, "variations.color": originalColor, "variations.size": originalSize }, 
                { $inc: { "variations.$.quantity": originalQuantity } }, // Add original quantity back
                { session }
            );
            // C) Decrement stock for the NEW variation.
            await ItemModel.updateOne(
                { _id: product._id, "variations.color": newVariation.color, "variations.size": newVariation.size }, 
                { $inc: { "variations.$.quantity": -quantity } }, // Subtract new quantity
                { session }
            );
            
            // D) Update the item's details in the rental document.
            itemToUpdate.name = `${productName},${newVariation.color},${newVariation.size}`;
            itemToUpdate.imageUrl = newVarDetails.imageUrl;

        } else {
            // The variation is the same, only the quantity is changing.
            const currentVarDetails = product.variations.find(v => v.color === originalColor && v.size === originalSize);
            if (!currentVarDetails) throw new Error("Current variation details not found in inventory.");
            
            const quantityDifference = quantity - originalQuantity; // Positive if increasing, negative if decreasing
            
            // If we need MORE items (positive difference), check if there's enough stock.
            if (quantityDifference > 0 && currentVarDetails.quantity < quantityDifference) {
                throw new Error(`Insufficient stock. Only ${currentVarDetails.quantity} more available.`);
            }

            // Adjust stock by the difference. (e.g., if diff is -2, it will INC stock by 2)
            if (quantityDifference !== 0) {
                await ItemModel.updateOne(
                    { _id: product._id, "variations.color": originalColor, "variations.size": originalSize }, 
                    { $inc: { "variations.$.quantity": -quantityDifference } }, // Subtract the difference
                    { session }
                );
            }
        }

        // --- 5. UPDATE THE ITEM'S QUANTITY AND SAVE RENTAL DOCUMENT ---
        itemToUpdate.quantity = quantity;
        await rental.save({ session }); // Save changes to the rental document
        await session.commitTransaction(); // Commit all changes to the database

        // --- 6. RETURN THE FULLY UPDATED RENTAL WITH CALCULATED FINANCIALS ---
        // Fetch the updated rental document to ensure the client has the latest state
        const finalRental = await RentalModel.findById(rentalId).lean();
        const calculatedFinancials = calculateFinancials(finalRental);
        res.status(200).json({ ...finalRental, financials: calculatedFinancials });

    } catch (error) {
        await session.abortTransaction(); // Rollback all changes if any error occurs
        throw error; // Let the global error handler manage the response
    } finally {
        session.endSession(); // End the session regardless of success or failure
    }
}));

// DELETE a single item from a rental
router.delete('/:rentalId/items/:itemId', asyncHandler(async (req, res) => {
  const { rentalId, itemId } = req.params; // Using itemId from the URL parameter
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Find the rental document
    const rental = await RentalModel.findById(rentalId).session(session);
    if (!rental) {
      res.status(404);
      throw new Error("Rental not found.");
    }

    // 2. Find the specific item within the rental's 'singleRents' array by its unique _id
    // This is the Mongoose helper that makes this so much more robust.
    const itemToRemove = rental.singleRents.id(itemId);
    if (!itemToRemove) {
      res.status(404);
      throw new Error("Item not found in this rental.");
    }

    // 3. Parse the item's name to get its properties for the stock update
    const nameParts = itemToRemove.name.split(',');
    if (nameParts.length < 3) {
      // This is a safety check in case of malformed data
      console.warn(`Skipping stock restoration for malformed item name: ${itemToRemove.name}`);
    } else {
      const size = nameParts.pop().trim();
      const color = nameParts.pop().trim();
      const productName = nameParts.join(',').trim();

      // 4. Restore the stock for the removed item in the 'items' collection
      await ItemModel.updateOne(
        { 
          name: productName, 
          "variations.color": color, 
          "variations.size": size 
        },
        { $inc: { "variations.$.quantity": itemToRemove.quantity } },
        { session }
      );
    }
    
    // 5. Atomically remove the item from the 'singleRents' array using its _id.
    // Mongoose's .pull() method is designed for this and is very efficient.
    rental.singleRents.pull(itemId);

    // 6. Save the changes to the rental document
    await rental.save({ session });
    
    // 7. If all operations succeeded, commit the transaction
    await session.commitTransaction();

    // 8. Recalculate financials and send the final, updated rental object back to the client
    const updatedRentalWithFinancials = calculateFinancials(rental.toObject());
    res.status(200).json({ ...rental.toObject(), financials: updatedRentalWithFinancials });

  } catch (error) {
    // If any step failed, abort the entire transaction to maintain data integrity
    await session.abortTransaction();
    // Pass the error to the global error handler
    throw error;
  } finally {
    // Always end the Mongoose session
    session.endSession();
  }
}));

// PUT to update fulfillment of a package in a rental
// router.put('/:rentalId/packages/:packageId', asyncHandler(async (req, res) => {
//     const { rentalId, packageId } = req.params;
//     const { packageFulfillment: newFulfillment } = req.body;

//     if (!newFulfillment || !Array.isArray(newFulfillment)) {
//         res.status(400);
//         throw new Error("Invalid packageFulfillment data provided.");
//     }
    
//     const session = await mongoose.startSession();
//     session.startTransaction();

//     try {
//         // 1. Find the rental document
//         const rental = await RentalModel.findById(rentalId).session(session);
//         if (!rental) {
//             res.status(404);
//             throw new Error("Rental not found.");
//         }

//         // 2. Find the specific package sub-document by its _id
//         const packageToUpdate = rental.packageRents.id(packageId);
//         if (!packageToUpdate) {
//             res.status(404);
//             throw new Error(`Package with ID "${packageId}" not found in this rental.`);
//         }

//         // 3. --- INTELLIGENT STOCK ADJUSTMENT ---
//         // This is the new logic to compare the old state with the new state.

//         const oldItemCounts = {}; // Key: "itemId/variation", Value: count
//         const newItemCounts = {}; // Key: "itemId/variation", Value: count

//         // Count items in the *old* fulfillment (before the update)
//         packageToUpdate.packageFulfillment.forEach(fulfill => {
//             const item = fulfill.assignedItem;
//             if (item && item.itemId && item.variation) {
//                 const key = `${item.itemId}/${item.variation}`;
//                 oldItemCounts[key] = (oldItemCounts[key] || 0) + 1;
//             }
//         });

//         // Count items in the *new* fulfillment (from the request body)
//         newFulfillment.forEach(fulfill => {
//             const item = fulfill.assignedItem;
//             if (item && item.itemId && item.variation) {
//                 const key = `${item.itemId}/${item.variation}`;
//                 newItemCounts[key] = (newItemCounts[key] || 0) + 1;
//             }
//         });
        
//         // 4. Calculate the difference and prepare stock update operations
//         const stockUpdateOperations = [];
//         const allItemKeys = new Set([...Object.keys(oldItemCounts), ...Object.keys(newItemCounts)]);

//         for (const key of allItemKeys) {
//             const [itemId, variation] = key.split('/');
//             const [color, size] = variation.split(',').map(s => s.trim());
            
//             const oldCount = oldItemCounts[key] || 0;
//             const newCount = newItemCounts[key] || 0;
//             const diff = newCount - oldCount;

//             if (diff !== 0) {
//                 // If diff > 0, we need more items (decrement stock)
//                 // If diff < 0, we are returning items (increment stock)
//                 stockUpdateOperations.push({
//                     updateOne: {
//                         filter: { _id: itemId, "variations.color": color, "variations.size": size },
//                         update: { $inc: { "variations.$.quantity": -diff } }
//                     }
//                 });
//             }
//         }
        
//         // 5. Execute stock updates if any are needed
//         if (stockUpdateOperations.length > 0) {
//             await ItemModel.bulkWrite(stockUpdateOperations, { session });
//         }

//         // 6. Update the fulfillment data on the sub-document
//         packageToUpdate.packageFulfillment = newFulfillment;
        
//         // 7. Save the changes to the rental document
//         await rental.save({ session });
        
//         // 8. Commit the transaction
//         await session.commitTransaction();
        
//         // 9. Recalculate financials and send the final, updated rental object
//         const updatedRentalWithFinancials = calculateFinancials(rental.toObject());
//         res.status(200).json({ ...rental.toObject(), financials: updatedRentalWithFinancials });

//     } catch (error) {
//         await session.abortTransaction();
//         throw error;
//     } finally {
//         session.endSession();
//     }
// }));

// --- NEW: DELETE A PACKAGE FROM A RENTAL AND RESTORE STOCK ---
router.delete('/:rentalId/packages/:packageId', asyncHandler(async (req, res) => {
    const { rentalId, packageId } = req.params; // Using packageId from the URL

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 1. Find the rental document
        const rental = await RentalModel.findById(rentalId).session(session).lean();
        if (!rental) {
            res.status(404);
            throw new Error("Rental not found.");
        }

        // 2. Find the specific package sub-document by its unique _id
        const packageToRemove = rental.packageRents.find(p => p._id.toString() === packageId);
        if (!packageToRemove) {
            res.status(404);
            throw new Error(`Package with ID "${packageId}" not found in this rental.`);
        }

        // 3. Build the stock restoration operations and identify associated custom items to delete
        const stockUpdateOperations = [];
        const customItemIdsToDelete = new Set();

        if (packageToRemove.packageFulfillment && packageToRemove.packageFulfillment.length > 0) {
            for (const fulfillment of packageToRemove.packageFulfillment) {
                const item = fulfillment.assignedItem;

                // A) Gather inventory items to restore stock for
                if (item && item.itemId && item.variation) {
                    const [color, size] = item.variation.split(',').map(s => s.trim());
                    stockUpdateOperations.push({
                        updateOne: {
                            filter: { _id: item.itemId, "variations.color": color, "variations.size": size },
                            update: { $inc: { "variations.$.quantity": 1 } }
                        }
                    });
                }
                
                // B) Gather associated custom items to remove from the rental
                if (fulfillment.isCustom && item && item.itemId) {
                    customItemIdsToDelete.add(item.itemId);
                }
            }
        }
        
        // 4. Execute stock updates if any are needed
        if (stockUpdateOperations.length > 0) {
            await ItemModel.bulkWrite(stockUpdateOperations, { session });
        }

        const updatedRental = await RentalModel.findByIdAndUpdate(
            rentalId,
            {
                $pull: {
                    // Remove the package sub-document by its _id.
                    packageRents: { _id: packageId },
                    // Remove any associated custom items from their array by their _id.
                    customTailoring: { _id: { $in: Array.from(customItemIdsToDelete) } }
                }
            },
            { new: true, session } // `new: true` returns the updated document
        );
        
        // 8. Commit the transaction
        await session.commitTransaction();
        
        // 9. Recalculate financials and send the final, updated rental object
        const updatedRentalWithFinancials = calculateFinancials(updatedRental.toObject());
        res.status(200).json({ ...updatedRental.toObject(), financials: updatedRentalWithFinancials });

    } catch (error) {
        await session.abortTransaction();
        console.error("Error deleting package from rental:", error);
        throw error; // Let global error handler manage the response
    } finally {
        session.endSession();
    }
}));


// PUT to update a custom tailoring item in a rental
router.put('/:rentalId/custom-items/:itemId', asyncHandler(async (req, res) => {
    const { rentalId, itemId } = req.params;
    const updatedItemData = req.body;

    // Basic validation on the incoming data
    if (!updatedItemData || !updatedItemData.name) {
        res.status(400);
        throw new Error("Invalid custom item data provided.");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 1. Find the rental document
        const rental = await RentalModel.findById(rentalId).session(session);
        if (!rental) {
            res.status(404);
            throw new Error("Rental not found.");
        }

        // 2. Find the specific custom item sub-document by its unique _id
        const itemToUpdate = rental.customTailoring.id(itemId);
        if (!itemToUpdate) {
            res.status(404);
            throw new Error("Custom item not found in this rental.");
        }

        // 3. Update the fields of the found sub-document.
        // Object.assign is a clean way to merge the new data into the existing item.
        // We exclude _id from the update to prevent it from being accidentally changed.
        const { _id, ...dataToUpdate } = updatedItemData;
        Object.assign(itemToUpdate, dataToUpdate);

        // 4. Save the changes to the parent rental document
        await rental.save({ session });

        // 5. Commit the transaction
        await session.commitTransaction();

        // 6. Recalculate financials and send the final, updated rental object
        const updatedRentalWithFinancials = calculateFinancials(rental.toObject());
        res.status(200).json({ ...rental.toObject(), financials: updatedRentalWithFinancials });

    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}));

// DELETE a custom item from a rental
router.delete('/:rentalId/custom-items/:itemId', asyncHandler(async (req, res) => {
    const { rentalId, itemId } = req.params;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const rental = await RentalModel.findById(rentalId).session(session);
        if (!rental) {
            res.status(404);
            throw new Error("Rental not found.");
        }

        // --- NEW LOGIC: Find the item and its images BEFORE deleting ---
        const itemToRemove = rental.customTailoring.id(itemId);
        if (!itemToRemove) {
            res.status(404);
            throw new Error("Custom item not found in this rental.");
        }

        const urlsToDelete = itemToRemove.referenceImages;
        
        // --- NEW LOGIC: Delete from Vercel Blob if there are images ---
        if (urlsToDelete && urlsToDelete.length > 0) {
            await del(urlsToDelete);
            console.log(`Deleted ${urlsToDelete.length} image(s) from Vercel Blob for item ${itemId}.`);
        }
        
        // Atomically remove the custom item sub-document from the array.
        rental.customTailoring.pull(itemId);
        
        // Save the changes to the parent rental document
        await rental.save({ session });
        
        // Commit the transaction
        await session.commitTransaction();

        // Recalculate financials and send the final, updated rental object back
        const updatedRentalWithFinancials = calculateFinancials(rental.toObject());
        res.status(200).json({ ...rental.toObject(), financials: updatedRentalWithFinancials });

    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
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

// router.put('/:rentalId/custom-items-bulk', asyncHandler(async (req, res) => {
//     const { rentalId } = req.params;
//     const { customItems } = req.body; // Expect an array of custom items

//     if (!customItems || !Array.isArray(customItems)) {
//         res.status(400);
//         throw new Error("Invalid 'customItems' data provided. Expected an array.");
//     }
    
//     const session = await mongoose.startSession();
//     session.startTransaction();

//     try {
//         const rental = await RentalModel.findById(rentalId).session(session);
//         if (!rental) {
//             res.status(404);
//             throw new Error("Rental not found.");
//         }

//         // Iterate through each updated item from the request
//         for (const updatedItem of customItems) {
//             // Find the corresponding item in the rental's array by its _id
//             const itemToUpdate = rental.customTailoring.id(updatedItem._id);
//             if (itemToUpdate) {
//                 // If found, update its properties
//                 Object.assign(itemToUpdate, updatedItem);
//             } else {
//                 // Optional: Handle case where an item might be new (if needed)
//                 // For now, we assume we are only updating existing items.
//                 console.warn(`Custom item with ID ${updatedItem._id} not found in rental ${rentalId}.`);
//             }
//         }
        
//         await rental.save({ session });
//         await session.commitTransaction();

//         // Send back the fully updated rental
//         const updatedRentalWithFinancials = calculateFinancials(rental.toObject());
//         res.status(200).json({ ...rental.toObject(), financials: updatedRentalWithFinancials });

//     } catch (error) {
//         await session.abortTransaction();
//         throw error;
//     } finally {
//         session.endSession();
//     }
// }));


router.put('/:rentalId/packages/:packageId/consolidated-update', asyncHandler(async (req, res) => {
    const { rentalId, packageId } = req.params;
    const { packageFulfillment, customItems, customItemIdsToDelete, imageUrlsToDelete } = req.body; 

    if (!packageFulfillment) {
        res.status(400);
        throw new Error("Missing packageFulfillment data.");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const rental = await RentalModel.findById(rentalId).session(session);
        if (!rental) {
            res.status(404);
            throw new Error("Rental not found.");
        }

        const packageToUpdate = rental.packageRents.id(packageId);
        if (!packageToUpdate) {
            res.status(404);
            throw new Error(`Package with ID "${packageId}" not found in this rental.`);
        }
        
        // --- NEW: INTELLIGENT STOCK ADJUSTMENT LOGIC ---
        
        // Helper function to count items from a fulfillment array
        const countItems = (fulfillmentArr) => {
            const counts = new Map();
            for (const fulfill of fulfillmentArr) {
                const item = fulfill.assignedItem;
                // Only count standard inventory items with a valid assignment
                if (!fulfill.isCustom && item && item.itemId && item.variation) {
                    const key = `${item.itemId}/${item.variation}`;
                    counts.set(key, (counts.get(key) || 0) + 1);
                }
            }
            return counts;
        };

        // 1. Get the "before" and "after" counts
        const oldItemCounts = countItems(packageToUpdate.packageFulfillment);
        const newItemCounts = countItems(packageFulfillment); // from req.body

        const stockUpdateOperations = [];
        const allItemKeys = new Set([...oldItemCounts.keys(), ...newItemCounts.keys()]);
        
        // 2. Calculate the difference for each item
        for (const key of allItemKeys) {
            const [itemId, variation] = key.split('/');
            const [color, size] = variation.split(',').map(s => s.trim());
            
            const oldCount = oldItemCounts.get(key) || 0;
            const newCount = newItemCounts.get(key) || 0;
            const diff = newCount - oldCount;

            if (diff !== 0) {
                // If diff > 0, we've added items (so DECREMENT stock)
                // If diff < 0, we've removed items (so INCREMENT stock)
                stockUpdateOperations.push({
                    updateOne: {
                        filter: { _id: itemId, "variations.color": color, "variations.size": size },
                        update: { $inc: { "variations.$.quantity": -diff } }
                    }
                });
            }
        }
        
        // 3. Execute all stock updates if any are needed
        if (stockUpdateOperations.length > 0) {
            await ItemModel.bulkWrite(stockUpdateOperations, { session });
        }
        // --- END OF STOCK ADJUSTMENT LOGIC ---


        // --- Existing Deletion/Update Logic (Now part of the same transaction) ---
        if (customItemIdsToDelete && customItemIdsToDelete.length > 0) {
            const itemsBeingDeleted = rental.customTailoring.filter(
                item => customItemIdsToDelete.includes(item._id.toString())
            );
            const urlsFromDeletedItems = itemsBeingDeleted.flatMap(item => item.referenceImages || []);
            
            const allUrlsToDelete = new Set([...urlsFromDeletedItems, ...(imageUrlsToDelete || [])]);
            
            if (allUrlsToDelete.size > 0) {
                await del(Array.from(allUrlsToDelete));
            }
            
            await RentalModel.updateOne(
                { _id: rentalId },
                { $pull: { customTailoring: { _id: { $in: customItemIdsToDelete } } } },
                { session }
            );
        } 
        else if (imageUrlsToDelete && imageUrlsToDelete.length > 0) {
            await del(imageUrlsToDelete);
        }

        if (customItems && customItems.length > 0) {
            for (const updatedItem of customItems) {
                const existingItem = rental.customTailoring.id(updatedItem._id);
                if (existingItem) {
                    Object.assign(existingItem, updatedItem);
                } else {
                    rental.customTailoring.push(updatedItem);
                }
            }
        }
        
        // Finally, update the fulfillment data on the rental document
        packageToUpdate.packageFulfillment = packageFulfillment;
        
        await rental.save({ session });
        await session.commitTransaction();
        
        const finalRental = await RentalModel.findById(rentalId).lean();
        const finalData = { ...finalRental, financials: calculateFinancials(finalRental) };
        res.status(200).json(finalData);

    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}));


router.post('/from-booking', asyncHandler(async (req, res) => {
    const { bookingId, customTailoring } = req.body;

    if (!customTailoring || !Array.isArray(customTailoring) || customTailoring.length === 0) {
        res.status(400);
        throw new Error('Processed custom tailoring data is required to create a rental.');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Find the original booking to get customer info and dates
        const booking = await BookingModel.findOne({ "appointments.appointmentId": bookingId }).session(session);
        if (!booking) {
            res.status(404);
            throw new Error('Source booking for the appointment could not be found.');
        }

        const newRentalId = `rent_${nanoid(8)}`;

        const rentalData = {
            _id: newRentalId,
            customerInfo: booking.customerInfo,
            customTailoring: customTailoring, // Add the item from the request
            financials: { shopDiscount: 0, depositAmount: 0 },
            rentalStartDate: booking.rentalStartDate,
            rentalEndDate: booking.rentalEndDate,
            status: "To Process",
        };

        const newRental = new RentalModel(rentalData);
        await newRental.save({ session });

        // Update the booking to link it to the new rental and mark it complete
        await BookingModel.updateOne(
            { _id: booking._id, "appointments.appointmentId": bookingId },
            { 
              $set: { 
                status: 'Completed',
                rentalId: newRentalId,
                "appointments.$.status": 'Completed'
              }
            },
            { session }
        );

        await session.commitTransaction();
        res.status(201).json(newRental);

    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}));



module.exports = router;