// server/utils/financialsCalculator.js

/**
 * THIS FILE IS THE SINGLE SOURCE OF TRUTH FOR ALL BUSINESS LOGIC
 * RELATED TO PRICING, DEPOSITS, AND TOTALS.
 */

// --- CONFIGURATION: Define your business rules here ---
const DEPOSIT_RULES = {
    // For single items, the deposit is the item's price, but it will not exceed this value.
    SINGLE_ITEM_PRICE_CAP: 500,

    // Every package added to a rental requires a fixed security deposit amount.
    PACKAGE_FIXED_DEPOSIT: 2000,
    
    // For custom-made items that the customer will "rent-back" to you,
    // the security deposit is the full price of making the item.
    CUSTOM_RENT_BACK_DEPOSIT_IS_FULL_PRICE: true,
};

/**
 * Calculates all financial details for a given rental object or a set of rental items.
 * This function is pure; it does not modify the database. It only runs calculations.
 *
 * @param {object} rentalData - An object containing arrays of items (singleRents, packageRents, etc.)
 *                              and potentially existing financial data (shopDiscount, depositAmount).
 * @returns {object} A comprehensive, calculated financials object.
 */
function calculateFinancials(rentalData) {
    if (!rentalData) {
        return null;
    }

    let subtotal = 0;
    let requiredDeposit = 0;

    // 1. Calculate subtotal and deposit from single items
    (rentalData.singleRents || []).forEach(item => {
        const itemTotal = (item.price || 0) * (item.quantity || 1);
        subtotal += itemTotal;
        
        const depositPerItem = Math.min(item.price || 0, DEPOSIT_RULES.SINGLE_ITEM_PRICE_CAP);
        requiredDeposit += depositPerItem * (item.quantity || 1);
    });

    // 2. Calculate subtotal and deposit from packages
    (rentalData.packageRents || []).forEach(pkg => {
        subtotal += (pkg.price || 0) * (pkg.quantity || 1);
        requiredDeposit += DEPOSIT_RULES.PACKAGE_FIXED_DEPOSIT * (pkg.quantity || 1);
    });

    // 3. Calculate subtotal and deposit from custom items
    (rentalData.customTailoring || []).forEach(item => {
        subtotal += (item.price || 0) * (item.quantity || 1);
        
        // Only "Tailored for Rent-Back" items require a security deposit.
        if (item.tailoringType === 'Tailored for Rent-Back') {
            const depositPerItem = DEPOSIT_RULES.CUSTOM_RENT_BACK_DEPOSIT_IS_FULL_PRICE 
                ? (item.price || 0) 
                : 0; // Or some other rule could go here.
            requiredDeposit += depositPerItem * (item.quantity || 1);
        }
    });

    // --- Final Calculations ---

    // Get the discount from the stored rental data, defaulting to 0.
    const shopDiscount = rentalData.financials?.shopDiscount || 0;
    
    // If the user manually entered a deposit, use that value.
    // Otherwise, use the one we just calculated based on the rules.
    const finalDepositAmount = rentalData.financials?.depositAmount > 0 
        ? rentalData.financials.depositAmount 
        : requiredDeposit;
        
    const itemsTotal = subtotal - shopDiscount;
    const grandTotal = itemsTotal + finalDepositAmount;

    // Calculate total paid from down and final payments, if they exist.
    const totalPaid = (rentalData.financials?.downPayment?.amount || 0) + (rentalData.financials?.finalPayment?.amount || 0);
    const remainingBalance = grandTotal - totalPaid;

    // Return a clean, fully-calculated object.
    return {
        subtotal: parseFloat(subtotal.toFixed(2)),
        shopDiscount: parseFloat(shopDiscount.toFixed(2)),
        itemsTotal: parseFloat(itemsTotal.toFixed(2)),
        requiredDeposit: parseFloat(requiredDeposit.toFixed(2)), // The calculated minimum based on rules.
        depositAmount: parseFloat(finalDepositAmount.toFixed(2)),   // The actual deposit being used.
        grandTotal: parseFloat(grandTotal.toFixed(2)),
        totalPaid: parseFloat(totalPaid.toFixed(2)),
        remainingBalance: parseFloat(remainingBalance.toFixed(2)),
        // Carry over existing payment details if they exist.
        downPayment: rentalData.financials?.downPayment,
        finalPayment: rentalData.financials?.finalPayment,
        depositReimbursed: rentalData.financials?.depositReimbursed || 0,
    };
}

// Export the function so other files can use it.
module.exports = { calculateFinancials };