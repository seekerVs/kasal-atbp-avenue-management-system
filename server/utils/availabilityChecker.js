// server/utils/availabilityChecker.js
const mongoose = require('mongoose');
const Item = require('../models/Item');
const Rental = require('../models/Rental');
const Reservation = require('../models/Reservation');

/**
 * A comprehensive, reusable function to check inventory availability for a given date range.
 * It aggregates conflicts from both Rentals and Reservations.
 *
 * @param {Map<string, number>} itemsRequired - A Map where key is 'ItemID-ColorName-Size' and value is the quantity required.
 * @param {Date} startDate - The start date of the desired 4-day window.
 * @param {string|null} idToExclude - The ID of the rental or reservation to exclude from the conflict check (used when rescheduling).
 * @param {mongoose.Session|null} session - An optional Mongoose session to run queries within a transaction.
 * @returns {Promise<{isAvailable: boolean, conflictingItems: Array<{name: string, variation: string}>}>} An object indicating availability and listing any conflicting items.
 */
const checkAvailability = async (itemsRequired, startDate, idToExclude = null, session = null) => {
    if (itemsRequired.size === 0) {
        return { isAvailable: true, conflictingItems: [] };
    }

    const allItemIds = Array.from(itemsRequired.keys()).map(key => new mongoose.Types.ObjectId(key.split('-')[0]));
    
    const userStartDate = new Date(startDate);
    userStartDate.setUTCHours(0, 0, 0, 0);
    const userEndDate = new Date(userStartDate);
    userEndDate.setDate(userEndDate.getDate() + 3);
    userEndDate.setUTCHours(23, 59, 59, 999);

    // --- Build base filters, conditionally adding the ID to exclude ---
    const rentalFilter = {
        status: { $in: ['To Pickup', 'To Return'] },
        rentalStartDate: { $lte: userEndDate },
        rentalEndDate: { $gte: userStartDate },
    };
    if (idToExclude && idToExclude.startsWith('KSL_')) {
        rentalFilter._id = { $ne: idToExclude };
    }

    const reservationFilter = {
        status: { $in: ['Pending', 'Confirmed'] },
        reserveDate: {
            $lte: userEndDate,
            $gte: new Date(new Date(userStartDate).setDate(userStartDate.getDate() - 3))
        },
    };
    if (idToExclude && idToExclude.startsWith('RES-')) {
        reservationFilter._id = { $ne: idToExclude };
    }

    // --- Fetch all data in parallel ---
    const [conflictingRentals, conflictingReservations, inventoryItems] = await Promise.all([
        Rental.find(rentalFilter).lean().session(session),
        Reservation.find(reservationFilter).lean().session(session),
        Item.find({ _id: { $in: allItemIds } }).lean().session(session),
    ]);

    // --- Tally booked quantities ---
    const bookedQuantities = new Map();
    const tally = (key, quantity = 1) => bookedQuantities.set(key, (bookedQuantities.get(key) || 0) + quantity);

    conflictingRentals.forEach(r => {
        r.singleRents?.forEach(i => tally(`${i.itemId}-${i.variation.color.name}-${i.variation.size}`, i.quantity));
        r.packageRents?.forEach(p => p.packageFulfillment?.forEach(f => {
            if (!f.isCustom && f.assignedItem?.itemId && f.assignedItem?.variation) {
                 const [color, size] = f.assignedItem.variation.split(', ');
                 tally(`${f.assignedItem.itemId}-${color}-${size}`);
            }
        }));
    });
    conflictingReservations.forEach(r => {
        r.itemReservations?.forEach(i => tally(`${i.itemId}-${i.variation.color.name}-${i.variation.size}`, i.quantity));
        r.packageReservations?.forEach(p => p.fulfillmentPreview?.forEach(f => {
            if (!f.isCustom && f.assignedItemId && f.variation) {
                const [color, size] = f.variation.split(', ');
                tally(`${f.assignedItemId}-${color}-${size}`);
            }
        }));
    });

    const totalStockMap = new Map();
    inventoryItems.forEach(item => {
        item.variations.forEach(v => {
            totalStockMap.set(`${item._id}-${v.color.name}-${v.size}`, { name: item.name, quantity: v.quantity });
        });
    });

    // --- Validate stock and collect conflicting items ---
    const conflictingItems = [];
    for (const [key, required] of itemsRequired.entries()) {
        const totalStockInfo = totalStockMap.get(key) || { name: 'Unknown Item', quantity: 0 };
        const booked = bookedQuantities.get(key) || 0;
        if ((totalStockInfo.quantity - booked) < required) {
            const [itemId, color, size] = key.split('-');
            conflictingItems.push({
                name: totalStockInfo.name,
                variation: `${color}, ${size}`
            });
        }
    }

    return {
        isAvailable: conflictingItems.length === 0,
        conflictingItems: conflictingItems
    };
};

module.exports = { checkAvailability };