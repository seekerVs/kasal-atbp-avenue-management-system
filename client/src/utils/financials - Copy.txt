// client/src/utils/financials.ts

import { ItemReservation } from '../types';

// Centralize the deposit rules
export const DEPOSIT_RULES = {
  SINGLE_ITEM_PRICE_CAP: 500,
  PACKAGE_FIXED_DEPOSIT: 2000,
};

// Centralize the calculation functions
export const calculateItemDeposit = (item: ItemReservation): number => {
  const depositPerPiece = Math.min(item.price, DEPOSIT_RULES.SINGLE_ITEM_PRICE_CAP);
  return depositPerPiece * item.quantity;
};

export const calculatePackageDeposit = (): number => {
  return DEPOSIT_RULES.PACKAGE_FIXED_DEPOSIT;
};