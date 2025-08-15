/**
 * A helper function to convert a string to a title-like case,
 * where each word is capitalized. This is more effective for names
 * and addresses than a simple sentence case.
 * e.g., "maria dela cruz" -> "Maria Dela Cruz"
 * e.g., "123 rizal avenue" -> "123 Rizal Avenue"
 * @param {string} str The string to convert.
 * @returns {string} The converted string.
 */
function toTitleCase(str) {
  if (typeof str !== 'string' || !str) {
    return str;
  }
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

/**
 * A Set of keys that should NOT be sanitized. This is critical for preserving
 * data like emails, passwords, URLs, and case-sensitive IDs or enums.
 * Using a Set provides fast lookups.
 */
const EXCLUDED_KEYS = new Set([
  'email',
  'password',
  'bookingType', // Enum: 'Reservation', 'Appointment'
  'status',      // Enum: 'Pending', 'Completed', etc.
  'method',      // Enum: 'GCash', 'Cash'
  'tailoringType',// Enum: 'Tailored for Rent-Back'
  'referenceNumber',
  'variation',   // e.g., "Natural, L"
  'imageUrl',    // URL
  'referenceImages',
  'currentPassword',
  'newPassword',
  'receiptImageUrl'
]);

/**
 * A recursive function that traverses an object or an array and applies
 * the toTitleCase sanitization to all string values, except for those
 * whose keys are in the EXCLUDED_KEYS set.
 * @param {object|array} data The data to traverse.
 */
function traverseAndSanitize(data) {
  // If data is not an object (e.g., a primitive), do nothing.
  if (typeof data !== 'object' || data === null) {
    return;
  }

  // If data is an array, recursively call this function for each item.
  if (Array.isArray(data)) {
    data.forEach(item => traverseAndSanitize(item));
    return;
  }

  // If data is an object, iterate over its keys.
  for (const key in data) {
    // Ensure the key belongs to the object itself, not its prototype chain.
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const value = data[key];

      // 1. Skip excluded keys and any key ending with 'Id'.
      if (EXCLUDED_KEYS.has(key) || key.endsWith('Id')) {
        continue;
      }
      
      // 2. If the value is a string, sanitize it.
      if (typeof value === 'string') {
        data[key] = toTitleCase(value.trim());
      }
      // 3. If the value is another object or array, traverse it recursively.
      else if (typeof value === 'object' && value !== null) {
        traverseAndSanitize(value);
      }
    }
  }
}

/**
 * The main Express middleware function.
 * It takes the request object, sanitizes its body, and passes control
 * to the next middleware in the chain.
 */
const sanitizeRequestBody = (req, res, next) => {
  if (req.body) {
    traverseAndSanitize(req.body);
  }
  next();
};

module.exports = { sanitizeRequestBody };