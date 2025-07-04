const express = require('express');
const RentalModel = require('../models/Rental');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// GET /api/dashboard/stats
router.get('/stats', asyncHandler(async (req, res) => {
    // This logic is complex but correct based on your original file.
    // It is copied here without modification.
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    const statusCounts = await RentalModel.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
    const monthlySales = await RentalModel.aggregate([
        { $match: { status: 'Completed', updatedAt: { $gte: startOfMonth } } },
        { $project: { total: { $subtract: [{ $add: [{ $sum: '$singleRents.price' }, { $sum: '$packageRents.price' }, { $sum: '$customTailoring.price' }] }, '$financials.shopDiscount' ] } } },
        { $group: { _id: null, totalSales: { $sum: '$total' } } }
    ]);
    const toReturnOrders = await RentalModel.find({ status: 'To Return' }).sort({ rentalEndDate: 1 }).limit(5).lean();
    const overdueOrders = await RentalModel.find({ status: 'To Return', rentalEndDate: { $lt: today.toISOString().split('T')[0] } }).sort({ rentalEndDate: 1 }).limit(5).lean();
    const weeklySalesData = await RentalModel.aggregate([
        { $match: { status: { $in: ['Completed', 'Returned'] }, updatedAt: { $gte: startOfWeek } } },
        { $project: { dayOfWeek: { $dayOfWeek: '$updatedAt' }, total: { $subtract: [{ $add: [{ $sum: '$singleRents.price' }, { $sum: '$packageRents.price' }, { $sum: '$customTailoring.price' }] }, '$financials.shopDiscount' ] } } },
        { $group: { _id: '$dayOfWeek', totalSales: { $sum: '$total' } } },
        { $sort: { _id: 1 } }
    ]);
    
    const stats = statusCounts.reduce((acc, curr) => {
        acc[curr._id.replace(/\s+/g, '')] = curr.count;
        return acc;
    }, {});
    
    const finalSales = monthlySales.length > 0 ? monthlySales[0].totalSales : 0;

    res.json({ stats, monthlySales: finalSales, toReturnOrders, overdueOrders, weeklySalesData });
}));

module.exports = router;