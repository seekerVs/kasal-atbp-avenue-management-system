// Create new file: client/src/utils/formatters.ts

/**
 * Formats a number as a currency string with commas and two decimal places.
 * Example: 12345.67 -> "12,345.67"
 * @param value The number to format.
 * @returns A formatted currency string.
 */
export const formatCurrency = (value: number | undefined | null): string => {
  if (value === undefined || value === null) {
    return '0.00'; // Return a default value for undefined/null inputs
  }
  
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};