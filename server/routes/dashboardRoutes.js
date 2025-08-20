const express = require('express');
const router = express.Router();
const RentalModel = require('../models/Rental');
const ReservationModel = require('../models/Reservation'); 
const AppointmentModel = require('../models/Appointment'); 
const asyncHandler = require('../utils/asyncHandler');

// GET /api/dashboard/stats
router.get('/stats', asyncHandler(async (req, res) => {
    // --- 1. Read and Normalize Date Range from Query ---
    const { startDate, endDate } = req.query;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const queryEndDate = endDate ? new Date(endDate) : new Date();
    queryEndDate.setUTCHours(23, 59, 59, 999);

    const queryStartDate = startDate ? new Date(startDate) : new Date(new Date().setDate(queryEndDate.getDate() - 6));
    queryStartDate.setUTCHours(0, 0, 0, 0);

    // --- 2. Fetch All Potentially Relevant Data in PARALLEL ---
    const [
        allActiveRentals,
        rentalSalesData,
        reservationSalesData,
        pendingReservationsCount,
        pendingAppointmentsCount
    ] = await Promise.all([
        RentalModel.find({
            status: { $in: ['To Process', 'To Pickup', 'To Return', 'Returned', 'Completed'] }
        }).lean(),
        // Aggregation for Rentals (your existing code)
        RentalModel.aggregate([
            { $project: { payments: { $concatArrays: [["$financials.downPayment"], ["$financials.finalPayment"]] } } },
            { $unwind: "$payments" },
            { $match: { "payments.amount": { $gt: 0 }, "payments.date": { $gte: queryStartDate, $lte: queryEndDate } } },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$payments.date" } }, totalSales: { $sum: "$payments.amount" } } },
            { $sort: { _id: 1 } }
        ]),
        // NEW: Aggregation for Active Reservations
        ReservationModel.aggregate([
            {
                $match: {
                    status: { $in: ['Pending', 'Confirmed'] } // Filter for active reservations
                }
            },
            {
                $unwind: "$financials.payments"
            },
            {
                $match: {
                    "financials.payments.amount": { $gt: 0 },
                    "financials.payments.date": { $gte: queryStartDate, $lte: queryEndDate }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$financials.payments.date" } },
                    totalSales: { $sum: "$financials.payments.amount" }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]),

        ReservationModel.countDocuments({ status: 'Pending' }),
        AppointmentModel.countDocuments({ status: 'Pending' }),
    ]);

    // --- 3. Process the Fetched Rental Data in JavaScript (your existing code) ---
    const stats = {};
    let monthlySales = 0;
    const firstDayOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const toReturnAndOverdue = [];

    allActiveRentals.forEach(rental => {
        const statusKey = rental.status.replace(/\s+/g, '');
        if (statusKey === 'Pending' || statusKey === 'ToReturn') {
           stats[statusKey] = (stats[statusKey] || 0) + 1;
        }

        const downPayment = rental.financials?.downPayment;
        if (downPayment && downPayment.date && new Date(downPayment.date) >= firstDayOfCurrentMonth) {
            monthlySales += downPayment.amount || 0;
        }
        const finalPayment = rental.financials?.finalPayment;
        if (finalPayment && finalPayment.date && new Date(finalPayment.date) >= firstDayOfCurrentMonth) {
            monthlySales += finalPayment.amount || 0;
        }

        if (rental.status === 'To Return') {
            const itemCount =
                (rental.singleRents?.reduce((sum, item) => sum + item.quantity, 0) || 0) +
                (rental.packageRents?.length || 0) +
                (rental.customTailoring?.length || 0);
            
            toReturnAndOverdue.push({ ...rental, itemCount });
        }
    });

    stats.pendingReservations = pendingReservationsCount;
    stats.pendingAppointments = pendingAppointmentsCount;

    const toReturnOrders = toReturnAndOverdue.filter(r => new Date(r.rentalEndDate) >= today);
    const overdueOrders = toReturnAndOverdue.filter(r => new Date(r.rentalEndDate) < today);
    overdueOrders.sort((a, b) => new Date(a.rentalEndDate) - new Date(b.rentalEndDate));

    // --- 4. MERGE the sales data from both rentals and reservations ---
    const combinedSalesMap = new Map();

    rentalSalesData.forEach(item => {
        combinedSalesMap.set(item._id, (combinedSalesMap.get(item._id) || 0) + item.totalSales);
    });
    reservationSalesData.forEach(item => {
        combinedSalesMap.set(item._id, (combinedSalesMap.get(item._id) || 0) + item.totalSales);
    });

    const weeklySalesData = Array.from(combinedSalesMap, ([_id, totalSales]) => ({ _id, totalSales }))
                                 .sort((a, b) => a._id.localeCompare(b._id));


    // --- 5. Send the Final, Compiled JSON Response ---
    res.json({
        stats,
        monthlySales,
        toReturnOrders: toReturnOrders.slice(0, 10),
        overdueOrders: overdueOrders.slice(0, 10),
        weeklySalesData // This now contains the merged sales data
    });
}));

module.exports = router;