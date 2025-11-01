const express = require('express');
const router = express.Router();
const RentalModel = require('../models/Rental');
const ReservationModel = require('../models/Reservation'); 
const AppointmentModel = require('../models/Appointment'); 
const asyncHandler = require('../utils/asyncHandler');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

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
        // NEW: Aggregation for Rentals (Corrected)
        RentalModel.aggregate([
            {
                // Only consider rentals that could possibly have payments
                $match: {
                    status: { $in: ['Pending', 'To Pickup', 'To Return', 'Completed'] }
                }
            },
            {
                // Deconstruct the modern 'payments' array
                $unwind: "$financials.payments"
            },
            {
                // Filter the unwound payments to be within the selected date range
                $match: {
                    "financials.payments.date": { $gte: queryStartDate, $lte: queryEndDate }
                }
            },
            {
                // Group by date and sum the amounts
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$financials.payments.date" } },
                    totalSales: { $sum: "$financials.payments.amount" }
                }
            },
            {
                // Sort the final results by date
                $sort: { _id: 1 }
            }
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
            // Check if there are any actual rental items
            const hasRentalItems = 
                (rental.singleRents?.length ?? 0) > 0 || 
                (rental.packageRents?.length ?? 0) > 0 || 
                rental.customTailoring?.some(item => item.tailoringType === 'Tailored for Rent-Back');

            // Only add the rental to the "To Return" list if it actually contains items to be returned.
            if (hasRentalItems) {
                const itemCount =
                    (rental.singleRents?.reduce((sum, item) => sum + item.quantity, 0) || 0) +
                    (rental.packageRents?.length || 0) +
                    (rental.customTailoring?.length || 0);
                
                toReturnAndOverdue.push({ ...rental, itemCount });
            }
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

// GET /api/dashboard/export-report
router.get('/export-report', asyncHandler(async (req, res) => {
    // 1. Get and validate the date range from query parameters
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
        res.status(400);
        throw new Error('Both startDate and endDate are required for the report.');
    }
    
    const queryStartDate = new Date(startDate);
    queryStartDate.setUTCHours(0, 0, 0, 0);

    const queryEndDate = new Date(endDate);
    queryEndDate.setUTCHours(23, 59, 59, 999);

    // --- DATA AGGREGATION ---

    const [rentalsInRange, reservationsInRange] = await Promise.all([
        RentalModel.find({
            $or: [
                { "financials.payments.date": { $gte: queryStartDate, $lte: queryEndDate } },
                { 
                    "status": "Completed",
                    "financials.depositReimbursed": { $gt: 0 },
                    "updatedAt": { $gte: queryStartDate, $lte: queryEndDate }
                }
            ]
        }).lean(),
        ReservationModel.find({
            "financials.payments.date": { $gte: queryStartDate, $lte: queryEndDate }
        }).lean()
    ]);

    const detailedTransactions = [];
    rentalsInRange.forEach(rental => {
        (rental.financials.payments || []).forEach(payment => {
            if (payment.date >= queryStartDate && payment.date <= queryEndDate) {
                const itemCount = (rental.singleRents?.length || 0) + (rental.packageRents?.length || 0) + (rental.customTailoring?.length || 0);
                detailedTransactions.push({
                    date: payment.date,
                    transactionId: rental._id,
                    customerName: rental.customerInfo[0]?.name || 'N/A',
                    type: 'Rental Payment',
                    items: `${itemCount} item(s)`,
                    amount: payment.amount
                });
            }
        });

        if (
            rental.status === 'Completed' &&
            rental.financials.depositReimbursed > 0 &&
            rental.updatedAt >= queryStartDate &&
            rental.updatedAt <= queryEndDate
        ) {
            detailedTransactions.push({
                date: rental.updatedAt, // Use the completion date as the transaction date
                transactionId: rental._id,
                customerName: rental.customerInfo[0]?.name || 'N/A',
                type: 'Deposit Reimbursement',
                items: 'N/A', // No items associated with a reimbursement
                amount: -Math.abs(rental.financials.depositReimbursed) // Ensure it's a negative number
            });
        }
    });

    reservationsInRange.forEach(res => {
        (res.financials.payments || []).forEach(payment => {
            if (payment.date >= queryStartDate && payment.date <= queryEndDate) {
                const itemCount = (res.itemReservations?.length || 0) + (res.packageReservations?.length || 0);
                detailedTransactions.push({
                    date: payment.date,
                    transactionId: res._id,
                    customerName: res.customerInfo.name || 'N/A',
                    type: 'Reservation Payment',
                    items: `${itemCount} item(s)`,
                    amount: payment.amount
                });
            }
        });
    });
    detailedTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));

    // --- KPI CALCULATION ---
    const totalNetSales = detailedTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
    
    const [newRentalsCount, newReservationsCount] = await Promise.all([
        RentalModel.countDocuments({ createdAt: { $gte: queryStartDate, $lte: queryEndDate } }),
        ReservationModel.countDocuments({ createdAt: { $gte: queryStartDate, $lte: queryEndDate } })
    ]);
    const totalTransactions = newRentalsCount + newReservationsCount;
    const averageSaleValue = totalTransactions > 0 ? totalNetSales / totalTransactions : 0;

    // --- PDF GENERATION ---

    const filename = `Sales-Report_${startDate}_to_${endDate}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
    doc.pipe(res);

    // --- Helper Functions for PDF Generation ---
    const generateHeader = (doc) => {
        const logoPath = path.join(__dirname, '../assets/images/Logo.png');
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 40, 30, { width: 150 });
        }
        
        doc.fontSize(18).text('Sales & Rental Report', { align: 'right' })
           .fontSize(10).text(`For Period: ${startDate} to ${endDate}`, { align: 'right' })
           .text(`Generated On: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}`, { align: 'right' })
           .moveDown(2);
    };
    
     const generateTableRow = (doc, y, rowNum, date, transactionId, customer, type, summary, amount) => {
        doc.fontSize(9)
            .text(rowNum, 40, y, { width: 25 })
            .text(date, 70, y)
            .text(transactionId, 130, y)
            .text(customer, 210, y, { width: 110 })
            .text(type, 320, y, { width: 80 })
            .text(summary, 400, y, { width: 80 })
            .text(amount, 0, y, { align: 'right' });
    };

    // --- Build the PDF Document ---
    generateHeader(doc);
    
    doc.fontSize(14).text('Executive Summary', { underline: true }).moveDown();
    doc.fontSize(11)
       .text(`Total Net Sales:`, { continued: true }).font('Helvetica-Bold').text(` Php ${totalNetSales.toLocaleString('en-US', {minimumFractionDigits: 2})}`)
       .font('Helvetica').moveDown(0.5)
       .text(`Rentals Created:`, { continued: true }).font('Helvetica-Bold').text(` ${newRentalsCount}`)
       .font('Helvetica').moveDown(0.5)
       .text(`Reservations Made:`, { continued: true }).font('Helvetica-Bold').text(` ${newReservationsCount}`)
       .font('Helvetica').moveDown(0.5)
       .text(`Average Transaction Value:`, { continued: true }).font('Helvetica-Bold').text(` Php ${averageSaleValue.toLocaleString('en-US', {minimumFractionDigits: 2})}`)
       .font('Helvetica').moveDown(2);

    doc.fontSize(14).text('Detailed Transaction Log', { underline: true }).moveDown();
    
    let tableTopY = doc.y;
    const rowHeight = 20;
    const pageBottom = doc.page.height - doc.page.margins.bottom;
    
    // Table Headers
    doc.font('Helvetica-Bold');
    generateTableRow(doc, tableTopY, '#', 'Date', 'Transaction ID', 'Customer Name', 'Type', 'Item Summary', 'Amount (PHP)');
    doc.font('Helvetica');
    doc.moveTo(40, tableTopY + 15).lineTo(doc.page.width - 40, tableTopY + 15).stroke();
    tableTopY += 25;
    
    // Table Rows
    for (const [index, transaction] of detailedTransactions.entries()) {
        if (tableTopY + rowHeight > pageBottom) {
            doc.addPage();
            generateHeader(doc);
            tableTopY = 150;
            doc.font('Helvetica-Bold');
            generateTableRow(doc, tableTopY, '#', 'Date', 'Transaction ID', 'Customer Name', 'Type', 'Item Summary', 'Amount (PHP)');
            doc.font('Helvetica');
            doc.moveTo(40, tableTopY + 15).lineTo(doc.page.width - 40, tableTopY + 15).stroke();
            tableTopY += 25;
        }

        generateTableRow(
            doc,
            tableTopY,
            index + 1,
            new Date(transaction.date).toLocaleDateString('en-US'),
            transaction.transactionId,
            transaction.customerName,
            transaction.type,
            transaction.items,
            transaction.amount.toLocaleString('en-US', {minimumFractionDigits: 2})
        );
        tableTopY += rowHeight;
    }

    // --- Finalize with Page Numbers ---
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).text(`Page ${i + 1} of ${pageCount}`, 
            doc.page.margins.left, 
            doc.page.height - doc.page.margins.bottom + 10, 
            { align: 'center' }
        );
    }

    doc.end();
}));


module.exports = router;