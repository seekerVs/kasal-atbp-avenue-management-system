// server/utils/financialsCalculator.js

// --- CONFIGURATION: Define your business rules here ---
const DEPOSIT_RULES = {
    SINGLE_ITEM_PRICE_CAP: 500,
    PACKAGE_FIXED_DEPOSIT: 2000,
    CUSTOM_RENT_BACK_DEPOSIT_IS_FULL_PRICE: true,
};

/**
 * Calculates all financial details for a given rental object or a set of rental items.
 * This function is pure; it does not modify the database. It only runs calculations.
 *
 * @param {object} rentalData - An object containing arrays of items and financial data.
 * @param {object} shopSettings - The global shop settings object.
 * @returns {object} A comprehensive, calculated financials object.
 */
function calculateFinancials(rentalData, shopSettings = {}) {
    if (!rentalData) {
        return null;
    }

    let subtotal = 0;
    let requiredDeposit = 0;

    // --- Step 1: Calculate Subtotal & Required Deposit from all items ---
    (rentalData.singleRents || []).forEach(item => {
        subtotal += (item.price || 0) * (item.quantity || 1);
        const depositPerItem = Math.min(item.price || 0, DEPOSIT_RULES.SINGLE_ITEM_PRICE_CAP);
        requiredDeposit += depositPerItem * (item.quantity || 1);
    });

    (rentalData.packageRents || []).forEach(pkg => {
        subtotal += (pkg.price || 0) * (pkg.quantity || 1);
        requiredDeposit += DEPOSIT_RULES.PACKAGE_FIXED_DEPOSIT * (pkg.quantity || 1);
    });

    (rentalData.customTailoring || []).forEach(item => {
        subtotal += (item.price || 0) * (item.quantity || 1);
        if (item.tailoringType === 'Tailored for Rent-Back') {
            requiredDeposit += (item.price || 0) * (item.quantity || 1);
        }
    });

    // --- Step 2: Calculate Discounts ---
    const shopDiscount = rentalData.financials?.shopDiscount || 0;
    
    const itemsTotal = subtotal - shopDiscount;

    // --- Step 4: Final Financial Calculations ---
    const finalDepositAmount = rentalData.financials?.depositAmount > 0 
        ? rentalData.financials.depositAmount 
        : requiredDeposit;
        
    const grandTotal = itemsTotal + finalDepositAmount;

    const totalPaid = (rentalData.financials?.payments || []).reduce(
      (sum, payment) => sum + (payment.amount || 0), 0
    );
    
    const remainingBalance = grandTotal - totalPaid;

    // Return a clean, fully-calculated object.
    return {
        subtotal: parseFloat(subtotal.toFixed(2)),
        shopDiscount: parseFloat(shopDiscount.toFixed(2)),
        itemsTotal: parseFloat(itemsTotal.toFixed(2)),
        requiredDeposit: parseFloat(requiredDeposit.toFixed(2)),
        depositAmount: parseFloat(finalDepositAmount.toFixed(2)),
        grandTotal: parseFloat(grandTotal.toFixed(2)),
        totalPaid: parseFloat(totalPaid.toFixed(2)),
        remainingBalance: parseFloat(remainingBalance.toFixed(2)),
        payments: rentalData.financials?.payments,
        depositReimbursed: rentalData.financials?.depositReimbursed || 0,
    };
}

module.exports = { calculateFinancials };