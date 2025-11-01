const express = require('express');
const mongoose = require('mongoose');
const { customAlphabet } = require('nanoid');
const asyncHandler = require('../utils/asyncHandler');
const RentalModel = require('../models/Rental.js');
const ItemModel = require('../models/Item.js');
const PackageModel = require('../models/Package.js');
const { calculateFinancials } = require('../utils/financialsCalculator');
const { del } = require('@vercel/blob');
const ReservationModel = require('../models/Reservation.js');
const AppointmentModel = require('../models/Appointment');
const { protect } = require('../middleware/authMiddleware.js');
const { sanitizeRequestBody } = require('../middleware/sanitizeMiddleware');
const DamagedItem = require('../models/DamagedItem');
const namer = require('color-namer');
const { sendReturnReminder } = require('../utils/emailService.js');
const router = express.Router();
const { checkAvailability } = require('../utils/availabilityChecker');

const nanoid_rental = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 8);

// GET all rentals with filtering
router.get('/', asyncHandler(async (req, res) => {
    const { customerPhoneNumber, status } = req.query;
    const filter = {};
    if (customerPhoneNumber) filter['customerInfo.phoneNumber'] = { $regex: new RegExp(customerPhoneNumber, 'i') };
    if (status) filter.status = status;
    
    const rentals = await RentalModel.find(filter).sort({ createdAt: -1 }).lean();
    const enrichedRentals = rentals.map(rental => ({ ...rental, financials: calculateFinancials(rental) }));
    res.status(200).json(enrichedRentals);
}));

// GET a single rental by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const rental = await RentalModel.findById(req.params.id).lean();
  if (!rental) return res.status(404).json({ message: "Rental not found." });
  const response = { ...rental, financials: calculateFinancials(rental) };
  res.status(200).json(response);
}));

// POST a new rental (single, package, or custom)
router.post('/', protect, sanitizeRequestBody, asyncHandler(async (req, res) => {
    const { customerInfo, singleRents, packageRents, customTailoring, rentalStartDate, rentalEndDate } = req.body;

    // --- 1. PRELIMINARY VALIDATION ---
    // (This part is correct and remains the same)
    if (!customerInfo || !Array.isArray(customerInfo) || customerInfo.length === 0) {
        res.status(400); throw new Error("Valid customer information is required.");
    }
    const hasRentalData = (singleRents?.length > 0) || (packageRents?.length > 0) || (customTailoring?.length > 0);
    if (!hasRentalData) {
        res.status(400); throw new Error("Request must include at least one rental item.");
    }
    if (customTailoring?.some(item => item.tailoringType === 'Tailored for Rent-Back') && !rentalStartDate) {
        res.status(400); throw new Error("A rental start date is required for rent-back items.");
    }
    
    const session = await mongoose.startSession();
    // --- THIS IS THE REFACTORED LOGIC ---
    await session.withTransaction(async () => {
        // --- 2. BUILD REQUIRED ITEMS LIST & PERFORM FINAL AVAILABILITY CHECK ---
        const itemsRequired = new Map();
        if (singleRents) {
            singleRents.forEach(item => {
                const key = `${item.itemId}-${item.variation.color.name}-${item.variation.size}`;
                itemsRequired.set(key, (itemsRequired.get(key) || 0) + item.quantity);
            });
        }
        if (packageRents) {
            packageRents.forEach(pkg => {
                (pkg.packageFulfillment || []).forEach(f => {
                    if (!f.isCustom && f.assignedItem?.itemId && f.assignedItem?.variation) {
                        const [color, size] = f.assignedItem.variation.split(', ');
                        const key = `${f.assignedItem.itemId}-${color}-${size}`;
                        itemsRequired.set(key, (itemsRequired.get(key) || 0) + 1);
                    }
                });
            });
        }

        if (itemsRequired.size > 0) {
            // IMPORTANT: The session is now automatically passed by withTransaction
            const { isAvailable, conflictingItems } = await checkAvailability(itemsRequired, rentalStartDate, null, session);
            if (!isAvailable) {
                // Throwing an error inside withTransaction automatically aborts it.
                const error = new Error(`One or more selected items have become unavailable: ${conflictingItems.map(i=>i.name).join(', ')}`);
                error.statusCode = 409;
                error.conflictingItems = conflictingItems;
                throw error;
            }
        }
        
        // --- 3. IF VALIDATION PASSES, PROCEED WITH CREATION ---
        const stockUpdates = [];
        itemsRequired.forEach((quantity, key) => {
            const [itemId, colorName, size] = key.split('-');
            stockUpdates.push({
                updateOne: {
                    filter: { _id: itemId, "variations.color.name": colorName, "variations.size": size },
                    update: { $inc: { "variations.$.quantity": -quantity } }
                }
            });
        });

        if (stockUpdates.length > 0) {
            await ItemModel.bulkWrite(stockUpdates, { session });
        }

        const newRentalId = `KSL_${nanoid_rental()}`;
        const rentalData = {
            _id: newRentalId,
            customerInfo,
            singleRents: singleRents || [],
            packageRents: packageRents || [],
            customTailoring: customTailoring || [],
            financials: { shopDiscount: 0, depositAmount: 0 },
            rentalStartDate: rentalStartDate || new Date().toISOString().split('T')[0],
            rentalEndDate: rentalEndDate || new Date(new Date().setDate(new Date().getDate() + 3)).toISOString().split('T')[0],
            status: "Pending",
        };

        // Mongoose's create method can accept a session option
        const createdRentals = await RentalModel.create([rentalData], { session });
        const rental = createdRentals[0];
        
        res.status(201).json(rental);
    });

    // The withTransaction method handles commit and abort automatically.
    session.endSession();
}));

// POST /api/rentals/:id/send-reminder
router.post('/:id/send-reminder', protect, asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Find the rental by its ID
    const rental = await RentalModel.findById(id);
    if (!rental) {
        res.status(404);
        throw new Error('Rental not found.');
    }

    // Check if the customer has an email address
    const customer = rental.customerInfo[0];
    if (!customer || !customer.email) {
        res.status(400);
        throw new Error('Cannot send reminder: Customer email address is missing.');
    }

    // Call the email service utility to send the email
    await sendReturnReminder(rental);

    // If the email was sent successfully, update the flag and save
    rental.returnReminderSent = true;
    const updatedRental = await rental.save();

    // Recalculate financials and send the final response to update the frontend
    const calculatedFinancials = calculateFinancials(updatedRental.toObject());
    const finalResponse = {
        ...updatedRental.toObject(),
        financials: calculatedFinancials,
    };

    res.status(200).json(finalResponse);
}));

router.put('/:id/process', protect, sanitizeRequestBody, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
        status,
        shopDiscount,
        depositAmount,
        depositReimbursed,
        payment,
        financials: financialUpdates
    } = req.body;

    const session = await mongoose.startSession();
    try {
        await session.startTransaction();

        const rental = await RentalModel.findById(id).session(session);
        if (!rental) {
            throw new Error("Rental not found.");
        }

        const originalStatus = rental.status;

        // --- CONSOLIDATED & CORRECTED STATUS & DATE LOGIC ---

        // 1. Handle "Mark as Picked Up" (Transition from 'To Pickup')
        if (status === 'To Return' && originalStatus === 'To Pickup') {
            const hasReturnableItems =
                (rental.singleRents?.length > 0) ||
                (rental.packageRents?.length > 0) ||
                (rental.customTailoring?.some(item => item.tailoringType === 'Tailored for Rent-Back'));

            if (hasReturnableItems) {
                // Case A: Items need to be returned -> Set status to 'To Return'
                const pickupDate = new Date();
                const returnDate = new Date(pickupDate);
                returnDate.setDate(pickupDate.getDate() + 3);

                rental.status = 'To Return';
                rental.rentalStartDate = pickupDate.toISOString().split('T')[0];
                rental.rentalEndDate = returnDate.toISOString().split('T')[0];
            } else {
                // Case B: Purchase-only -> Jump status directly to 'Completed'
                rental.status = 'Completed';
                const today = new Date().toISOString().split('T')[0];
                rental.rentalStartDate = today;
                rental.rentalEndDate = today;
            }
        }
        // 2. Handle "Move to Pickup" (Transition from 'Pending')
        else if (status === 'To Pickup' && originalStatus === 'Pending') {
            rental.status = 'To Pickup';
        }
        // 3. Handle "Mark as Returned" (which now transitions to 'Completed')
        else if (status === 'Returned' && originalStatus !== 'Returned') {
            const stockUpdateOperations = [];
            
            if (rental.singleRents?.length > 0) {
                rental.singleRents.forEach(item => {
                    stockUpdateOperations.push({
                        updateOne: {
                            filter: { _id: item.itemId, "variations.color.hex": item.variation.color.hex, "variations.size": item.variation.size },
                            update: { $inc: { "variations.$.quantity": item.quantity } }
                        }
                    });
                });
            }
            if (rental.packageRents?.length > 0) {
                rental.packageRents.forEach(pkg => {
                    pkg.packageFulfillment?.forEach(fulfillment => {
                        const item = fulfillment.assignedItem;
                        if (!fulfillment.isCustom && item && item.itemId && item.variation) {
                            const [colorName, size] = item.variation.split(',').map(s => s.trim());
                            stockUpdateOperations.push({
                                updateOne: {
                                    filter: { _id: item.itemId, "variations.color.name": colorName, "variations.size": size },
                                    update: { $inc: { "variations.$.quantity": 1 } }
                                }
                            });
                        }
                    });
                });
            }
            if (stockUpdateOperations.length > 0) {
                await ItemModel.bulkWrite(stockUpdateOperations, { session });
            }
            
            if (depositReimbursed !== undefined) {
                 if (parseFloat(depositReimbursed) > rental.financials.depositAmount) {
                     throw new Error(`Reimbursement amount of ${depositReimbursed} exceeds the paid deposit of ${rental.financials.depositAmount}.`);
                 }
                 rental.financials.depositReimbursed = parseFloat(depositReimbursed);
            }

            rental.status = 'Completed'; // Final status after a return is 'Completed'
        }
        // 4. Handle any other explicit status change that wasn't caught above
        else if (status && status !== originalStatus) {
            rental.status = status;
        }
        
        // --- FINANCIAL & PAYMENT LOGIC (UNCHANGED) ---
        if (!rental.financials) rental.financials = {};
        if (shopDiscount !== undefined) rental.financials.shopDiscount = parseFloat(shopDiscount) || 0;
        if (depositAmount !== undefined) rental.financials.depositAmount = parseFloat(depositAmount) || 0;
        
        if (payment && typeof payment.amount === 'number' && payment.amount > 0) {
            const newPayment = {
                amount: payment.amount,
                date: new Date(),
                referenceNumber: payment.referenceNumber || null,
                receiptImageUrl: payment.receiptImageUrl || undefined, 
            };

            if (!rental.financials.payments) {
                rental.financials.payments = [];
            }
            
            rental.financials.payments.push(newPayment);
        }

        if (financialUpdates) {
            // Object.assign merges the properties from the second object into the first one.
            // If financialUpdates is { applyScPwdDiscount: true }, this line will
            // add or update that specific property on rental.financials without
            // affecting other properties like payments or depositAmount.
            Object.assign(rental.financials, financialUpdates);
        }
        
        const updatedRental = await rental.save({ session });
        await session.commitTransaction();

        // Recalculate and send the final response
        const calculatedFinancials = calculateFinancials(updatedRental.toObject());
        const finalResponse = {
            ...updatedRental.toObject(),
            financials: calculatedFinancials,
        };
        res.status(200).json(finalResponse);

    } catch (error) {
        await session.abortTransaction();
        console.error(`Error processing rental ${id}:`, error);
        throw error;
    } finally {
        session.endSession();
    }
}));

router.put('/:id/reschedule', protect, asyncHandler(async (req, res) => {
    const { id: rentalId } = req.params;
    const { newStartDate } = req.body;
    if (!newStartDate) {
        res.status(400);
        throw new Error('A new start date is required.');
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const rental = await RentalModel.findById(rentalId).session(session);
        if (!rental) {
            res.status(404);
            throw new Error("Rental not found.");
        }
        if (!['Pending', 'To Pickup'].includes(rental.status)) {
            res.status(400);
            throw new Error(`Only rentals with 'Pending' or 'To Pickup' status can be rescheduled.`);
        }

        const itemsRequired = new Map();
        rental.singleRents.forEach(i => {
            const key = `${i.itemId}-${i.variation.color.name}-${i.variation.size}`;
            itemsRequired.set(key, (itemsRequired.get(key) || 0) + i.quantity);
        });
        rental.packageRents.forEach(p => p.packageFulfillment?.forEach(f => {
            if (!f.isCustom && f.assignedItem?.itemId && f.assignedItem?.variation) {
                const [color, size] = f.assignedItem.variation.split(', ');
                const key = `${f.assignedItem.itemId}-${color}-${size}`;
                itemsRequired.set(key, (itemsRequired.get(key) || 0) + 1);
            }
        }));
        
        const { isAvailable, conflictingItems } = await checkAvailability(itemsRequired, newStartDate, rentalId, session);

        if (!isAvailable) {
            const conflictMessage = `Cannot reschedule: ${conflictingItems.map(i => `${i.name} (${i.variation})`).join(', ')} unavailable.`;
            res.status(409); // 409 Conflict
            throw new Error(conflictMessage);
        }

        const userStartDate = new Date(newStartDate);
        const userEndDate = new Date(userStartDate);
        userEndDate.setDate(userEndDate.getDate() + 3);
        rental.rentalStartDate = userStartDate.toISOString().split('T')[0];
        rental.rentalEndDate = userEndDate.toISOString().split('T')[0];

        const updatedRental = await rental.save({ session });
        await session.commitTransaction();

        const calculatedFinancials = calculateFinancials(updatedRental.toObject());
        res.status(200).json({ ...updatedRental.toObject(), financials: calculatedFinancials });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}));

// GET to check if a rental reschedule is possible
router.get('/:id/check-reschedule', protect, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { date } = req.query;

    const rental = await RentalModel.findById(id).lean();
    if (!rental) {
        res.status(404);
        throw new Error("Rental not found.");
    }

    const itemsRequired = new Map();
    rental.singleRents.forEach(i => {
        const key = `${i.itemId}-${i.variation.color.name}-${i.variation.size}`;
        itemsRequired.set(key, (itemsRequired.get(key) || 0) + i.quantity);
    });
    rental.packageRents.forEach(p => p.packageFulfillment?.forEach(f => {
        if (!f.isCustom && f.assignedItem?.itemId && f.assignedItem?.variation) {
            const [color, size] = f.assignedItem.variation.split(', ');
            const key = `${f.assignedItem.itemId}-${color}-${size}`;
            itemsRequired.set(key, (itemsRequired.get(key) || 0) + 1);
        }
    }));

    const result = await checkAvailability(itemsRequired, date, id);
    res.status(200).json(result);
}));

// PUT to add a new item to an existing rental
router.put('/:id/addItem', protect, sanitizeRequestBody, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { singleRents, packageRents, customTailoring } = req.body;

    const session = await mongoose.startSession();
    
    try {
        await session.startTransaction();

        // Step 1: Fetch the rental document and ensure it can be modified.
        const rental = await RentalModel.findById(id).session(session);
        if (!rental) {
            res.status(404);
            throw new Error("Rental not found.");
        }
        
        if (rental.status !== 'Pending') {
            res.status(400);
            throw new Error(`Cannot add items to a rental with status "${rental.status}".`);
        }

        // --- Process Single Rents (if present) ---
        if (singleRents && Array.isArray(singleRents) && singleRents.length > 0) {
            const stockUpdates = [];
            for (const newItem of singleRents) {
                const existingItemIndex = rental.singleRents.findIndex(
                    (existing) => existing.itemId.toString() === newItem.itemId &&
                                  existing.variation.color.hex === newItem.variation.color.hex &&
                                  existing.variation.size === newItem.variation.size
                );
                
                const productInDb = await ItemModel.findById(newItem.itemId).session(session);
                if (!productInDb) throw new Error(`Product ID "${newItem.itemId}" not found.`);
                
                const variationInDb = productInDb.variations.find(v => v.color.hex === newItem.variation.color.hex && v.size === newItem.variation.size);
                if (!variationInDb || variationInDb.quantity < newItem.quantity) {
                    throw new Error(`Insufficient stock for ${newItem.name}.`);
                }
                
                stockUpdates.push({
                    updateOne: {
                        filter: { _id: newItem.itemId, "variations.color.hex": newItem.variation.color.hex, "variations.size": newItem.variation.size },
                        update: { $inc: { "variations.$.quantity": -newItem.quantity } }
                    }
                });

                if (existingItemIndex > -1) {
                    rental.singleRents[existingItemIndex].quantity += newItem.quantity;
                } else {
                    rental.singleRents.push(newItem);
                }
            }
            if (stockUpdates.length > 0) {
                await ItemModel.bulkWrite(stockUpdates, { session });
            }
        }

        // --- Process Package Rents (if present) with Motif Name Generation ---
        if (packageRents && Array.isArray(packageRents) && packageRents.length > 0) {
            const stockUpdates = [];
            
            const packageIds = packageRents.map(p => p.packageId);
            const packagesFromDb = await PackageModel.find({ _id: { $in: packageIds } }).session(session);
            const packageMap = new Map(packagesFromDb.map(p => [p._id.toString(), p]));

            for (const pkg of packageRents) {
                if (pkg.packageFulfillment && Array.isArray(pkg.packageFulfillment)) {
                    for (const fulfillment of pkg.packageFulfillment) {
                        const item = fulfillment.assignedItem;
                        if (item && item.itemId && item.variation) {
                            const [colorName, itemSize] = item.variation.split(', ');
                            stockUpdates.push({
                                updateOne: {
                                    filter: { _id: item.itemId, "variations.color.name": colorName, "variations.size": itemSize },
                                    update: { $inc: { "variations.$.quantity": -1 } }
                                }
                            });
                        }
                    }
                }

                const fullPackage = packageMap.get(pkg.packageId);
                if (!fullPackage) throw new Error(`Package with ID ${pkg.packageId} not found.`);

                let motifName = 'Manual';
                if (pkg.motifHex) {
                    try {
                        const names = namer(pkg.motifHex);
                        motifName = names.ntc[0]?.name.replace(/\b\w/g, char => char.toUpperCase()) || 'Custom';
                    } catch (e) { console.error("Could not name color from hex:", pkg.motifHex); }
                }

                const processedPkg = { ...pkg, name: `${fullPackage.name},${motifName}` };
                rental.packageRents.push(processedPkg);
            }
            if (stockUpdates.length > 0) {
                await ItemModel.bulkWrite(stockUpdates, { session });
            }
        }

        // --- Process Custom Tailoring (if present) ---
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

// PUT to update a single item within a rental
router.put('/:rentalId/items/:itemId', protect, asyncHandler(async (req, res) => {
    const { rentalId, itemId } = req.params;
    const { quantity, newVariation } = req.body;
    if (!quantity || quantity < 1) throw new Error("Invalid quantity.");    
    if (!newVariation || !newVariation.color || !newVariation.size) throw new Error("Invalid variation data.");

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const rental = await RentalModel.findById(rentalId).session(session);
        if (!rental) throw new Error("Rental not found.");
        const itemToUpdate = rental.singleRents.id(itemId);
        if (!itemToUpdate) {
            res.status(404);
            throw new Error("Item not found in this rental.");
        }

        const originalQuantity = itemToUpdate.quantity;
        const originalVariation = itemToUpdate.variation;
        const product = await ItemModel.findById(itemToUpdate.itemId).session(session);
        if (!product) throw new Error(`Base product not found.`);

        const hasVariationChanged = newVariation.color.hex !== originalVariation.color.hex || newVariation.size !== originalVariation.size;
        
        if (hasVariationChanged) {
            const newVarDetails = product.variations.find(v => v.color.hex === newVariation.color.hex && v.size === newVariation.size);
            if (!newVarDetails || newVarDetails.quantity < quantity) throw new Error(`Insufficient stock for new variation.`);
            
            await ItemModel.updateOne({ _id: product._id, "variations.color.hex": originalVariation.color.hex, "variations.size": originalVariation.size }, { $inc: { "variations.$.quantity": originalQuantity } }, { session });
            await ItemModel.updateOne({ _id: product._id, "variations.color.hex": newVariation.color.hex, "variations.size": newVariation.size }, { $inc: { "variations.$.quantity": -quantity } }, { session });
            
            // Update the item's details in the rental document
            itemToUpdate.variation = newVariation; // The whole object
            itemToUpdate.imageUrl = newVarDetails.imageUrls[0] || '';
        } else {
            const currentVarDetails = product.variations.find(v => v.color.hex === originalVariation.color.hex && v.size === originalVariation.size);
            if (!currentVarDetails) throw new Error("Current variation not found in inventory.");
            const quantityDifference = quantity - originalQuantity;
            if (quantityDifference > 0 && currentVarDetails.quantity < quantityDifference) throw new Error(`Insufficient stock.`);
            if (quantityDifference !== 0) {
                await ItemModel.updateOne({ _id: product._id, "variations.color.hex": originalVariation.color.hex, "variations.size": originalVariation.size }, { $inc: { "variations.$.quantity": -quantityDifference } }, { session });
            }
        }

        itemToUpdate.quantity = quantity;
        await rental.save({ session });
        await session.commitTransaction();
        const finalRental = await RentalModel.findById(rentalId).lean();
        res.status(200).json({ ...finalRental, financials: calculateFinancials(finalRental) });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}));

// DELETE a single item from a rental
router.delete('/:rentalId/items/:itemId', protect, asyncHandler(async (req, res) => {
    const { rentalId, itemId } = req.params;
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const rental = await RentalModel.findById(rentalId).session(session);
        if (!rental) { res.status(404); throw new Error("Rental not found."); }
        const itemToRemove = rental.singleRents.id(itemId);
        if (!itemToRemove) { res.status(404); throw new Error("Item not found in rental."); }

        await ItemModel.updateOne(
          { _id: itemToRemove.itemId, "variations.color.hex": itemToRemove.variation.color.hex, "variations.size": itemToRemove.variation.size },
          { $inc: { "variations.$.quantity": itemToRemove.quantity } },
          { session }
        );
        
        rental.singleRents.pull(itemId);
        await rental.save({ session });
        await session.commitTransaction();
        const updatedRentalWithFinancials = calculateFinancials(rental.toObject());
        res.status(200).json({ ...rental.toObject(), financials: updatedRentalWithFinancials });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}));

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

router.put('/:id/customer', protect, sanitizeRequestBody, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const newCustomerInfo = req.body;

    // Backend validation
    if (!newCustomerInfo || !newCustomerInfo.name || !newCustomerInfo.phoneNumber || !newCustomerInfo.address) {
        res.status(400);
        throw new Error('Incomplete customer information provided.');
    }

    const rental = await RentalModel.findById(id);
    if (!rental) {
        res.status(404);
        throw new Error('Rental not found.');
    }

    // The customerInfo is an array, so we update the first (and only) element.
    rental.customerInfo[0] = newCustomerInfo;

    const updatedRental = await rental.save();

    // Recalculate financials and send the final, updated object back
    const calculatedFinancials = calculateFinancials(updatedRental.toObject());
    const finalResponse = {
        ...updatedRental.toObject(),
        financials: calculatedFinancials,
    };
    
    res.status(200).json(finalResponse);
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
            
            const allUrlsToDelete = [...urlsFromDeletedItems, ...(imageUrlsToDelete || [])].filter(Boolean);

            if (allUrlsToDelete.length > 0) {
                await del(allUrlsToDelete);
            }
            
            await RentalModel.updateOne(
                { _id: rentalId },
                { $pull: { customTailoring: { _id: { $in: customItemIdsToDelete } } } },
                { session }
            );
        } 
        else if (imageUrlsToDelete && imageUrlsToDelete.length > 0) {
            const filteredUrls = imageUrlsToDelete.filter(Boolean);
            if (filteredUrls.length > 0) {
                await del(filteredUrls);
            }
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

        const newRentalId = `KSL_${nanoid_rental()}`;

        const rentalData = {
            _id: newRentalId,
            customerInfo: booking.customerInfo,
            customTailoring: customTailoring, // Add the item from the request
            financials: { shopDiscount: 0, depositAmount: 0 },
            rentalStartDate: booking.reserveStartDate,
            rentalEndDate: booking.reserveEndDate,
            status: "Pending",
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

// DELETE a custom item that is part of a package from a rental
// This will also clear its assignment from the package fulfillment.
router.delete('/:rentalId/packages/:packageId/custom-items/:itemId', asyncHandler(async (req, res) => {
    const { rentalId, packageId, itemId } = req.params;

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

        const itemToRemove = rental.customTailoring.id(itemId);
        if (itemToRemove) {
            // Delete associated images from Vercel Blob if they exist
            if (itemToRemove.referenceImages && itemToRemove.referenceImages.length > 0) {
                await del(itemToRemove.referenceImages);
            }
            // Remove the item from the top-level customTailoring array
            rental.customTailoring.pull(itemId);
        }

        // Find the fulfillment slot and clear its assignment
        const fulfillmentToClear = packageToUpdate.packageFulfillment.find(
            (fulfill) => fulfill.isCustom && fulfill.assignedItem?.itemId === itemId
        );

        if (fulfillmentToClear) {
            fulfillmentToClear.assignedItem = {}; // Clear the assignment
        } else {
            console.warn(`Could not find fulfillment slot for custom item ${itemId} in package ${packageId}`);
        }

        // Save all changes
        await rental.save({ session });
        await session.commitTransaction();

        const finalRental = await RentalModel.findById(rentalId).lean();
        res.status(200).json({ ...finalRental, financials: calculateFinancials(finalRental) });

    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}));

router.post('/from-reservation', protect, asyncHandler(async (req, res) => {
  const { reservationId } = req.body;
  if (!reservationId) {
    res.status(400);
    throw new Error('Reservation ID is required.');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const reservation = await ReservationModel.findById(reservationId).session(session);
    if (!reservation) {
      res.status(404);
      throw new Error('Reservation not found.');
    }
    if (reservation.status === 'Completed' || reservation.status === 'Cancelled') {
      res.status(400);
      throw new Error(`Cannot create rental from a reservation with status "${reservation.status}".`);
    }

    const stockUpdates = [];

    // --- Check and prepare stock updates for SINGLE ITEMS (Existing logic - Correct) ---
    for (const item of reservation.itemReservations) {
      const productInDb = await ItemModel.findById(item.itemId).session(session);
      if (!productInDb) throw new Error(`Item ${item.itemName} not found in inventory.`);
      
      const variationInDb = productInDb.variations.find(v => v.color.hex === item.variation.color.hex && v.size === item.variation.size);
      if (!variationInDb || variationInDb.quantity < item.quantity) {
        throw new Error(`Insufficient stock for ${item.itemName} (${item.variation.color.name}, ${item.variation.size}).`);
      }
      stockUpdates.push({
        updateOne: {
          filter: { _id: item.itemId, "variations.color.hex": item.variation.color.hex, "variations.size": item.variation.size },
          update: { $inc: { "variations.$.quantity": -item.quantity } }
        }
      });
    }

    // --- NEW LOGIC: Check and prepare stock updates for PACKAGE ITEMS ---
    if (reservation.packageReservations && reservation.packageReservations.length > 0) {
      for (const pkg of reservation.packageReservations) {
        for (const fulfillment of pkg.fulfillmentPreview) {
          // Skip custom items as they don't have stock
          if (fulfillment.isCustom) continue;

          // Check if an item has been assigned
          if (fulfillment.assignedItemId && fulfillment.variation) {
            const [colorName, size] = fulfillment.variation.split(',').map(s => s.trim());
            
            const productInDb = await ItemModel.findById(fulfillment.assignedItemId).session(session);
            if (!productInDb) throw new Error(`Assigned package item not found in inventory (ID: ${fulfillment.assignedItemId}).`);

            const variationInDb = productInDb.variations.find(v => v.color.name === colorName && v.size === size);
            if (!variationInDb || variationInDb.quantity < 1) { // Package items are always quantity 1
              throw new Error(`Insufficient stock for assigned package item: ${productInDb.name} (${fulfillment.variation}).`);
            }
            
            // Add the stock decrement operation
            stockUpdates.push({
              updateOne: {
                filter: { _id: fulfillment.assignedItemId, "variations.color.name": colorName, "variations.size": size },
                update: { $inc: { "variations.$.quantity": -1 } }
              }
            });
          }
        }
      }
    }

    // Execute all stock decrements
    if (stockUpdates.length > 0) {
      await ItemModel.bulkWrite(stockUpdates, { session });
    }

    const startDate = new Date(reservation.reserveDate);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 3);

    const newRental = new RentalModel({
      _id: `KSL_${nanoid(8)}`,
      customerInfo: [reservation.customerInfo],
      singleRents: reservation.itemReservations.map(item => ({
          itemId: item.itemId,
          name: item.itemName,
          variation: item.variation,
          price: item.price,
          quantity: item.quantity,
          imageUrl: item.imageUrl,
      })),
      // --- NEW LOGIC: Convert package reservations to package rents ---
      packageRents: reservation.packageReservations.map(pkg => {
        return {
          _id: pkg.packageReservationId, // Use the same sub-doc ID
          name: pkg.packageName, // This will be enriched later if needed
          price: pkg.price,
          quantity: 1,
          imageUrl: pkg.imageUrl,
          packageFulfillment: pkg.fulfillmentPreview.map(fulfill => ({
            role: fulfill.role,
            wearerName: fulfill.wearerName,
            isCustom: fulfill.isCustom,
            assignedItem: {
              itemId: fulfill.assignedItemId,
              variation: fulfill.variation,
              // We'll need to look up name/imageUrl if we want them here, or leave them for viewer
            }
          }))
        };
      }),
      // --- END OF NEW LOGIC ---
      customTailoring: [], // Add logic to convert linked appointments if they exist
      financials: reservation.financials,
      rentalStartDate: startDate.toISOString().split('T')[0],
      rentalEndDate: endDate.toISOString().split('T')[0],
      status: "Pending",
    });
    
    reservation.status = 'Completed';
    reservation.rentalId = newRental._id;
    
    await newRental.save({ session });
    await reservation.save({ session });
    
    await session.commitTransaction();
    res.status(201).json(newRental);

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}));

router.delete('/:rentalId/pending-conversion/:customItemId', protect, asyncHandler(async (req, res) => {
    const { rentalId, customItemId } = req.params;

    // Use findByIdAndUpdate with the $pull operator to atomically remove the item
    // from the pendingInventoryConversion array.
    const updatedRental = await RentalModel.findByIdAndUpdate(
        rentalId,
        {
            $pull: {
                pendingInventoryConversion: { _id: customItemId }
            }
        },
        { new: true } // Return the updated document after the pull operation
    );

    if (!updatedRental) {
        res.status(404);
        throw new Error('Rental not found or item already processed.');
    }

    // Recalculate financials and send back the final, updated rental object
    const finalData = { 
        ...updatedRental.toObject(), 
        financials: calculateFinancials(updatedRental.toObject()) 
    };
    res.status(200).json(finalData);
}));

// METHOD: PUT /api/rentals/:id/process-return
router.put('/:id/process-return', protect, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { late, damagedItems, depositReimbursed } = req.body;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const rental = await RentalModel.findById(id).session(session);
        if (!rental) {
            res.status(404);
            throw new Error('Rental not found.');
        }
        if (rental.status !== 'To Return') {
            res.status(400);
            throw new Error(`Cannot process return for a rental with status "${rental.status}".`);
        }

        const damagedItemsMap = new Map();
        if (damagedItems && Array.isArray(damagedItems) && damagedItems.length > 0) {
            const newDamagedRecords = damagedItems.map(item => {
                const key = `${item.itemId}-${item.variation}`;
                damagedItemsMap.set(key, (damagedItemsMap.get(key) || 0) + item.quantity);
                return { ...item, rentalId: id, status: 'Awaiting Repair' };
            });
            await DamagedItem.insertMany(newDamagedRecords, { session });
        }

        const stockUpdateOperations = [];
        const allStandardRentedItems = [
            ...rental.singleRents.map(item => ({
                itemId: item.itemId,
                variation: `${item.variation.color.name}, ${item.variation.size}`,
                quantity: item.quantity
            })),
            ...rental.packageRents.flatMap(pkg =>
                pkg.packageFulfillment
                    .filter(f => !f.isCustom && f.assignedItem && f.assignedItem.itemId)
                    .map(f => ({
                        itemId: f.assignedItem.itemId,
                        variation: f.assignedItem.variation,
                        quantity: 1
                    }))
            )
        ];

        for (const rentedItem of allStandardRentedItems) {
            const key = `${rentedItem.itemId}-${rentedItem.variation}`;
            const damagedQty = damagedItemsMap.get(key) || 0;
            const undamagedQty = rentedItem.quantity - damagedQty;
            if (undamagedQty > 0) {
                const [color, size] = rentedItem.variation.split(',').map(s => s.trim());
                stockUpdateOperations.push({
                    updateOne: {
                        filter: { 
                            _id: rentedItem.itemId,
                            'variations.color.name': color, 
                            'variations.size': size 
                        },
                        update: { $inc: { 'variations.$.quantity': undamagedQty } }
                    }
                });
            }
        }
        
        if (stockUpdateOperations.length > 0) {
            await ItemModel.bulkWrite(stockUpdateOperations, { session });
        }

        // 1. Identify undamaged "Rent-Back" items
        const undamagedRentBackItems = rental.customTailoring.filter(item => {
            if (item.tailoringType !== 'Tailored for Rent-Back') {
                return false; // Not a rent-back item
            }
            // A unique key for a custom item (using its own _id and type)
            const key = `${item._id}-Custom (${item.outfitType})`;
            // If the item's key is in the damaged map, it's damaged.
            return !damagedItemsMap.has(key);
        });
        
        // 2. Add these items to the new 'pendingInventoryConversion' field
        if (undamagedRentBackItems.length > 0) {
            rental.pendingInventoryConversion.push(...undamagedRentBackItems);
        }
        
        rental.status = 'Completed';
        if (depositReimbursed !== undefined) {
            if (parseFloat(depositReimbursed) > rental.financials.depositAmount) {
                throw new Error('Reimbursement cannot exceed the paid deposit.');
            }
            rental.financials.depositReimbursed = parseFloat(depositReimbursed);
        }
        
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
        throw error;
    } finally {
        session.endSession();
    }
}));

// PUT to add new items to an existing rental
router.put('/:id/add-items', protect, sanitizeRequestBody, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { singleRents, packageRents, customTailoring } = req.body;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const rental = await RentalModel.findById(id).session(session);
        if (!rental) {
            res.status(404);
            throw new Error("Rental not found.");
        }
        
        if (!['Pending', 'To Pickup'].includes(rental.status)) {
            res.status(400);
            throw new Error(`Cannot add items to a rental with status "${rental.status}".`);
        }

        const stockUpdates = [];

        // --- Process and VALIDATE Single Rents ---
        if (singleRents && singleRents.length > 0) {
            for (const newItem of singleRents) {
                const productInDb = await ItemModel.findById(newItem.itemId).session(session);
                if (!productInDb) {
                    throw new Error(`Product ID "${newItem.itemId}" not found.`);
                }
                const variationInDb = productInDb.variations.find(v => v.color.hex === newItem.variation.color.hex && v.size === newItem.variation.size);
                if (!variationInDb || variationInDb.quantity < newItem.quantity) {
                    throw new Error(`Insufficient stock for ${newItem.name} (${newItem.variation.color.name}, ${newItem.variation.size}). Available: ${variationInDb?.quantity || 0}, Requested: ${newItem.quantity}.`);
                }
                
                // If validation passes, add the update operation and the item to the rental
                stockUpdates.push({
                    updateOne: {
                        filter: { _id: newItem.itemId, "variations.color.hex": newItem.variation.color.hex, "variations.size": newItem.variation.size },
                        update: { $inc: { "variations.$.quantity": -newItem.quantity } }
                    }
                });
                rental.singleRents.push(newItem);
            }
        }

        // --- Process and VALIDATE Package Rents ---
        if (packageRents && packageRents.length > 0) {
            for (const newPkg of packageRents) {
                if (newPkg.packageFulfillment) {
                    for (const fulfillment of newPkg.packageFulfillment) {
                        const item = fulfillment.assignedItem;
                        if (item && item.itemId && item.variation) {
                            const [colorName, itemSize] = item.variation.split(', ');
                            
                            const productInDb = await ItemModel.findById(item.itemId).session(session);
                            if (!productInDb) throw new Error(`Package item ID "${item.itemId}" not found.`);
                            
                            const variationInDb = productInDb.variations.find(v => v.color.name === colorName && v.size === itemSize);
                            if (!variationInDb || variationInDb.quantity < 1) { // Package items are always quantity 1
                                throw new Error(`Insufficient stock for package item: ${productInDb.name} (${item.variation}).`);
                            }

                            stockUpdates.push({
                                updateOne: {
                                    filter: { _id: item.itemId, "variations.color.name": colorName, "variations.size": itemSize },
                                    update: { $inc: { "variations.$.quantity": -1 } }
                                }
                            });
                        }
                    }
                }
                rental.packageRents.push(newPkg);
            }
        }

        // --- Process Custom Tailoring (no stock validation needed) ---
        if (customTailoring && customTailoring.length > 0) {
            rental.customTailoring.push(...customTailoring);
        }

        // --- Execute stock updates (now guaranteed to be valid) ---
        if (stockUpdates.length > 0) {
            await ItemModel.bulkWrite(stockUpdates, { session });
        }

        const updatedRental = await rental.save({ session });
        await session.commitTransaction();
        
        // The frontend will recalculate financials, but we send a consistent object back.
        const calculatedFinancials = calculateFinancials(updatedRental.toObject());
        const finalResponse = {
            ...updatedRental.toObject(),
            financials: calculatedFinancials,
        };

        res.status(200).json(finalResponse);

    } catch (error) {
        await session.abortTransaction();
        console.error("Error adding items to rental:", error);
        throw error; 
    } finally {
        session.endSession();
    }
}));

// METHOD: PUT /api/rentals/:id/cancel
router.put('/:id/cancel', protect, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || typeof reason !== 'string' || reason.trim() === '') {
        res.status(400);
        throw new Error('A cancellation reason is required.');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const rental = await RentalModel.findById(id).session(session);
        if (!rental) {
            res.status(404);
            throw new Error('Rental not found.');
        }

        // Only allow cancellation for specific statuses
        if (!['Pending', 'To Pickup'].includes(rental.status)) {
            res.status(400);
            throw new Error(`Cannot cancel a rental with status "${rental.status}".`);
        }

        const stockUpdateOperations = [];

        // 1. Restore stock for single rent items
        if (rental.singleRents?.length > 0) {
            for (const item of rental.singleRents) {
                stockUpdateOperations.push({
                    updateOne: {
                        filter: { 
                            _id: item.itemId, 
                            "variations.color.hex": item.variation.color.hex, 
                            "variations.size": item.variation.size 
                        },
                        update: { $inc: { "variations.$.quantity": item.quantity } }
                    }
                });
            }
        }

        // 2. Restore stock for assigned package items
        if (rental.packageRents?.length > 0) {
            for (const pkg of rental.packageRents) {
                for (const fulfillment of pkg.packageFulfillment) {
                    const assigned = fulfillment.assignedItem;
                    if (!fulfillment.isCustom && assigned && assigned.itemId && assigned.variation) {
                        const [color, size] = assigned.variation.split(',').map(s => s.trim());
                        stockUpdateOperations.push({
                            updateOne: {
                                filter: { 
                                    _id: assigned.itemId, 
                                    "variations.color.name": color, // Match by name here as variation string stores name
                                    "variations.size": size 
                                },
                                update: { $inc: { "variations.$.quantity": 1 } }
                            }
                        });
                    }
                }
            }
        }
        
        // 3. Execute stock updates if needed
        if (stockUpdateOperations.length > 0) {
            await ItemModel.bulkWrite(stockUpdateOperations, { session });
        }

        // 4. Update the rental document
        rental.status = 'Cancelled';
        rental.cancellationReason = reason.trim();
        const updatedRental = await rental.save({ session });

        // 5. Commit the transaction
        await session.commitTransaction();

        // Recalculate and send the final response
        const calculatedFinancials = calculateFinancials(updatedRental.toObject());
        const finalResponse = {
            ...updatedRental.toObject(),
            financials: calculatedFinancials,
        };
        res.status(200).json(finalResponse);

    } catch (error) {
        await session.abortTransaction();
        console.error(`Error cancelling rental ${id}:`, error);
        throw error;
    } finally {
        session.endSession();
    }
}));


module.exports = router;