const express = require('express');
const router = express.Router();
const RentalModel = require('../models/Rental');
const { calculateFinancials } = require('../utils/financialsCalculator');
const ReservationModel = require('../models/Reservation'); 
const AppointmentModel = require('../models/Appointment'); 
const asyncHandler = require('../utils/asyncHandler');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const toCsv = (data) => {
    if (data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const csvRows = [
        headers.join(','), // Header row
        ...data.map(row => 
            headers.map(header => {
                let cell = row[header] === null || row[header] === undefined ? '' : String(row[header]);
                // Escape commas and quotes in the cell data
                if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
                    cell = `"${cell.replace(/"/g, '""')}"`;
                }
                return cell;
            }).join(',')
        )
    ];
    return csvRows.join('\n');
};

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
            status: { $in: ['Pending', 'To Pickup', 'To Return', 'Returned', 'Completed'] }
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
    const stats = {
        Pending: 0,
        ToReturn: 0
    };
    let monthlySales = 0;
    const firstDayOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const toReturnOrders = [];
    const overdueOrders = [];

    allActiveRentals.forEach(rental => {
        // --- Calculate Stats ---
        if (rental.status === 'Pending') {
           stats.Pending = (stats.Pending || 0) + 1;
        }
        
        // Calculate monthly sales from the modern payments array
        (rental.financials?.payments || []).forEach(payment => {
            if (payment.date && new Date(payment.date) >= firstDayOfCurrentMonth) {
                monthlySales += payment.amount || 0;
            }
        });

        // --- Populate Return Lists ---
        if (rental.status === 'To Return') {
            const hasRentalItems = 
                (rental.singleRents?.length ?? 0) > 0 || 
                (rental.packageRents?.length ?? 0) > 0 || 
                rental.customTailoring?.some(item => item.tailoringType === 'Tailored for Rent-Back');

            if (hasRentalItems) {
                // Increment the ToReturn stat here, inside the check
                stats.ToReturn = (stats.ToReturn || 0) + 1;

                const itemCount =
                    (rental.singleRents?.reduce((sum, item) => sum + item.quantity, 0) || 0) +
                    (rental.packageRents?.length || 0) +
                    (rental.customTailoring?.length || 0);

                // Use UTC date parts for a timezone-safe comparison
                const rentalEndDate = new Date(rental.rentalEndDate);
                const isOverdue = new Date(rentalEndDate.getUTCFullYear(), rentalEndDate.getUTCMonth(), rentalEndDate.getUTCDate() + 1) < today;
                
                if (isOverdue) {
                    overdueOrders.push({ ...rental, itemCount });
                } else {
                    toReturnOrders.push({ ...rental, itemCount });
                }
            }
        }
    });

    stats.pendingReservations = pendingReservationsCount;
    stats.pendingAppointments = pendingAppointmentsCount;

    // Sort the lists after they are fully populated
    overdueOrders.sort((a, b) => new Date(a.rentalEndDate) - new Date(b.rentalEndDate));
    toReturnOrders.sort((a, b) => new Date(a.rentalEndDate) - new Date(b.rentalEndDate));

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
        toReturnOrders: toReturnOrders,
        overdueOrders: overdueOrders,
        weeklySalesData // This now contains the merged sales data
    });
}));

// GET /api/dashboard/export-report
router.get('/export-sales', asyncHandler(async (req, res) => {
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

// --- NEW: Export Customer List as CSV ---
router.get('/export-customers', asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const queryStartDate = new Date(startDate);
    const queryEndDate = new Date(endDate);
    queryEndDate.setUTCHours(23, 59, 59, 999);

    const [rentals, reservations] = await Promise.all([
        RentalModel.find({ createdAt: { $gte: queryStartDate, $lte: queryEndDate } }).select('customerInfo createdAt').lean(),
        ReservationModel.find({ createdAt: { $gte: queryStartDate, $lte: queryEndDate } }).select('customerInfo createdAt').lean()
    ]);

    const customerMap = new Map();
    const processCustomer = (customer, date) => {
        if (!customer || !customer.phoneNumber) return;
        if (!customerMap.has(customer.phoneNumber) || new Date(date) > new Date(customerMap.get(customer.phoneNumber).lastActivity)) {
            customerMap.set(customer.phoneNumber, {
                Name: customer.name,
                Email: customer.email || 'N/A',
                PhoneNumber: customer.phoneNumber,
                lastActivity: new Date(date).toLocaleDateString('en-US')
            });
        }
    };

    rentals.forEach(r => processCustomer(r.customerInfo[0], r.createdAt));
    reservations.forEach(r => processCustomer(r.customerInfo, r.createdAt));
    
    const customerList = Array.from(customerMap.values());
    const csvData = toCsv(customerList);

    res.header('Content-Type', 'text/csv');
    res.attachment(`Customers_${startDate}_to_${endDate}.csv`);
    res.send(csvData);
}));

// --- NEW: Export Pending Orders as CSV ---
router.get('/export-pending-orders', asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const queryStartDate = new Date(startDate);
    const queryEndDate = new Date(endDate);
    queryEndDate.setUTCHours(23, 59, 59, 999);

    const [pendingRentals, pendingReservations] = await Promise.all([
        RentalModel.find({ status: 'Pending', createdAt: { $gte: queryStartDate, $lte: queryEndDate } }).lean(),
        ReservationModel.find({ status: { $in: ['Pending', 'Confirmed'] }, createdAt: { $gte: queryStartDate, $lte: queryEndDate } }).lean()
    ]);

    const orders = [];
    pendingRentals.forEach(r => {
        orders.push({
            OrderID: r._id,
            Type: 'Rental',
            Customer: r.customerInfo[0]?.name,
            DateCreated: new Date(r.createdAt).toLocaleDateString('en-US'),
            Total: calculateFinancials(r)?.grandTotal || 0,
            Status: r.status
        });
    });
    pendingReservations.forEach(r => {
        orders.push({
            OrderID: r._id,
            Type: 'Reservation',
            Customer: r.customerInfo.name,
            DateCreated: new Date(r.createdAt).toLocaleDateString('en-US'),
            Total: calculateFinancials({ singleRents: r.itemReservations, packageRents: r.packageReservations, financials: r.financials })?.grandTotal || 0,
            Status: r.status
        });
    });
    
    const csvData = toCsv(orders.sort((a,b) => new Date(b.DateCreated) - new Date(a.DateCreated)));
    res.header('Content-Type', 'text/csv');
    res.attachment(`Pending-Orders_${startDate}_to_${endDate}.csv`);
    res.send(csvData);
}));

// --- NEW: Export Payment History as CSV ---
router.get('/export-payment-history', asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const queryStartDate = new Date(startDate);
    const queryEndDate = new Date(endDate);
    queryEndDate.setUTCHours(23, 59, 59, 999);

    const [rentals, reservations] = await Promise.all([
        RentalModel.find({ "financials.payments.date": { $gte: queryStartDate, $lte: queryEndDate } }).lean(),
        ReservationModel.find({ "financials.payments.date": { $gte: queryStartDate, $lte: queryEndDate } }).lean()
    ]);
    
    const payments = [];
    const processPayments = (order, type) => {
        (order.financials.payments || []).forEach(p => {
            if (new Date(p.date) >= queryStartDate && new Date(p.date) <= queryEndDate) {
                payments.push({
                    Date: new Date(p.date).toLocaleString('en-US'),
                    OrderID: order._id,
                    Type: type,
                    Customer: (order.customerInfo[0] || order.customerInfo)?.name,
                    Amount: p.amount,
                    Method: p.referenceNumber ? 'GCash' : 'Cash',
                    Reference: p.referenceNumber || 'N/A'
                });
            }
        });
    };

    rentals.forEach(r => processPayments(r, 'Rental'));
    reservations.forEach(r => processPayments(r, 'Reservation'));

    const csvData = toCsv(payments.sort((a,b) => new Date(b.Date) - new Date(a.Date)));
    res.header('Content-Type', 'text/csv');
    res.attachment(`Payment-History_${startDate}_to_${endDate}.csv`);
    res.send(csvData);
}));


module.exports = router;