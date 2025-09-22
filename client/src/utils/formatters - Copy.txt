// Create new file: client/src/utils/formatters.ts

/**
 * Formats a number as a currency string with commas and two decimal places.
 * Example: 12345.67 -> "12,345.67"
 * @param value The number to format.
 * @returns A formatted currency string.
 */
export const formatCurrency = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return '0.00'; // Return a default for invalid inputs
  }
  
  // toLocaleString is the standard and best way to handle this.
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};


/**
 * Formats a file size in bytes into a human-readable string (KB, MB, etc.).
 * @param bytes The number of bytes.
 * @param decimals The number of decimal places to display.
 * @returns A formatted file size string.
 */
export const formatFileSize = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};