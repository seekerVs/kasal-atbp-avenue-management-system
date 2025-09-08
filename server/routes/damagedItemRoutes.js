const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { protect } = require('../middleware/authMiddleware');
const DamagedItem = require('../models/DamagedItem');
const Item = require('../models/Item'); // We need the Item model to restore stock

const router = express.Router();

// --- GET ALL DAMAGED ITEMS ---
// METHOD: GET /api/damaged-items
// Fetches a list of all items marked as damaged, for the management page.
router.get('/', protect, asyncHandler(async (req, res) => {
    // 1. Get the search term from the query string
    const { search } = req.query;
    
    // 2. Build the filter object
    const filter = {};
    if (search) {
        // Create a case-insensitive regex for the search term
        const regex = new RegExp(search, 'i');
        // Use $or to search across multiple fields
        filter.$or = [
            { itemName: regex },
            { rentalId: regex },
            { variation: regex }
        ];
    }

    // 3. Apply the filter to the find query
    const damagedItems = await DamagedItem.find(filter).sort({ createdAt: -1 });
    
    res.status(200).json(damagedItems);
}));

// --- UPDATE A DAMAGED ITEM'S STATUS ---
// METHOD: PUT /api/damaged-items/:id
// Used to mark an item as "Repaired", "Under Repair", or "Disposed".
router.put('/:id', protect, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
        res.status(400);
        throw new Error('A new status is required.');
    }

    const damagedItemRecord = await DamagedItem.findById(id);
    if (!damagedItemRecord) {
        res.status(404);
        throw new Error('Damaged item record not found.');
    }

    const originalStatus = damagedItemRecord.status;
    
    // --- The Core Logic: Handle Stock Restoration ---
    if (status === 'Repaired' && originalStatus !== 'Repaired') {
        const [color, size] = damagedItemRecord.variation.split(',').map(s => s.trim());
        
        // Atomically increment the stock quantity for the correct variation
        const updateResult = await Item.updateOne(
            { 
                _id: damagedItemRecord.itemId, 
                'variations.color.name': color, 
                'variations.size': size 
            },
            { $inc: { 'variations.$.quantity': damagedItemRecord.quantity } }
        );

        if (updateResult.matchedCount === 0) {
            // This is a safety net. It means the original item or variation was not found.
            // We should not proceed with marking it as repaired if we can't restore stock.
            res.status(404);
            throw new Error(`Could not find the original inventory item variation for "${damagedItemRecord.itemName}" to restore stock.`);
        }
    }

    // Update the status on the damaged item record
    damagedItemRecord.status = status;
    const updatedRecord = await damagedItemRecord.save();

    res.status(200).json(updatedRecord);
}));

module.exports = router;