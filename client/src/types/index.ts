// client/src/types/index.ts
export * from './aboutpage';
export * from './homepage';
export * from './custompage';
// ===================================================================
//
//               CORE DATA MODELS (Inventory, Packages)
//
// ===================================================================

// --- Represents a single variation of an inventory item ---
export interface ItemVariation {
  color: {
    name: string;
    hex: string;
  };
  size: string;
  quantity: number;
  imageUrl: string;
}

// --- Represents a single item in your inventory (e.g., a specific gown model) ---
export interface InventoryItem {
  _id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  composition: string[];
  features: string[];
  variations: ItemVariation[];
  createdAt?: Date; // or Date
  updatedAt?: Date; // or Date
  ageGroup?: 'Adult' | 'Kids';
  gender?: 'Male' | 'Female' | 'Unisex';
  heartCount?: number;
}

export interface InclusionItem {
  _id: string;
  wearerNum: number;
  name: string;
  isCustom?: boolean;
}

// --- UPDATED: Redefine the package assignment to link by ID ---
// It now reflects the new one-to-many relationship: one inclusion to many items.
export interface PackageAssignment {
  inclusionId: string;            // Was 'inclusionIds: string[]', now singular
  itemIds: (string | null)[];   // Was 'itemId?: string', now a plural array that can contain nulls for custom slots
  
  // NOTE: assignedItemName, variation, and imageUrl are removed from this interface.
  // Those details belong to the specific inventory item and will be looked up using the itemId.
  // This enforces a cleaner data structure on the frontend.
}

// --- Defines a color motif with its specific item assignments ---
export interface ColorMotif {
  _id?: string;
  motifName: string;
  assignments: PackageAssignment[];
}

// --- Represents a package template from your database ---
export interface Package {
  _id: string;
  name: string;
  description?: string;
  inclusions: InclusionItem[]; // Was string[], now an array of objects
  price: number;
  imageUrls: string[]; // Was imageUrl: string, now an array of strings
  colorMotifs: ColorMotif[];
}

// ===================================================================
//
//               RENTAL-SPECIFIC TYPES
//
// ===================================================================

export type RentalStatus = 'To Process' | 'To Pickup' | 'To Return' | 'Returned' | 'Completed' | 'Cancelled';

export interface BaseRentItem {
  _id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  notes?: string;
}

// --- Base for any item that is part of a rental order ---
export interface SingleRentItem extends BaseRentItem {}

// --- For custom-made items, extends the base and adds tailoring details ---
export interface CustomTailoringItem extends BaseRentItem {
  outfitCategory: string;
  outfitType: string;
  tailoringType: 'Tailored for Purchase' | 'Tailored for Rent-Back';
  measurements: { [key: string]: number | string };
  materials: string[];
  designSpecifications: string;
  referenceImages: string[];
}

// --- Defines an item assigned to a role within a rented package ---
export interface FulfillmentItem {
  itemId?: string;
  name?: string;
  variation?: string;
  imageUrl?: string;
}

// --- Defines a single role's fulfillment status in a rented package ---
export interface PackageFulfillment {
  role: string;
  wearerName?: string;
  assignedItem: FulfillmentItem | CustomTailoringItem;
  isCustom?: boolean;
}

// --- Represents a package once it has been added to a rental order ---
export interface RentedPackage extends BaseRentItem {
  packageFulfillment: PackageFulfillment[];
}

// ===================================================================
//
//               MAIN RENTAL ORDER & FINANCIALS
//
// ===================================================================
export interface PaymentDetail {
  amount: number;
  date?: Date | string;
  referenceNumber?: string | null;
}

// --- Financial data for a rental, including server-calculated fields ---
export interface Financials {
  // Stored values
  shopDiscount: number;
  depositAmount: number;
  depositReimbursed?: number; 
  downPayment?: PaymentDetail;
  finalPayment?: PaymentDetail;
  // Calculated values (from backend)
  subtotal?: number;
  itemsTotal?: number;
  requiredDeposit?: number;
  grandTotal?: number;
  totalPaid?: number;
  remainingBalance?: number;
}

// --- The main Rental Order object that combines everything ---
export interface RentalOrder {
  _id: string;
  customerInfo: CustomerInfo[];
  singleRents: SingleRentItem[];
  packageRents: RentedPackage[]; // <-- USES THE CORRECT TYPE
  customTailoring: CustomTailoringItem[];
  financials: Financials;
  rentalStartDate: string;
  rentalEndDate: string;
  status: RentalStatus;
  createdAt: string;
  updatedAt: string;
}

// ===================================================================
//
//               HELPER & MISC TYPES
//
// ===================================================================

// --- For the CustomRent form state ---
export type InitialCustomTailoringData = Omit<CustomTailoringItem, 'measurements' | 'outfitCategory' | 'outfitType'>;
export type MeasurementValues = CustomTailoringItem['measurements'];

// --- For measurement templates ---
export interface MeasurementRef {
  _id: string;
  outfitName: string;
  category: string;
  measurements: string[];
}

// --- For sensor data ---
export interface SensorData {
  _id: string;
  sensorType: 'LengthMeasurement' | 'RotaryEncoder' | string;
  position?: number;
  direction?: number;
  centimeters?: number;
  value?: number;
  updatedAt: string;
}

// ===================================================================
//
//               USER & PERMISSION TYPES (NEW & UPDATED)
//
// ===================================================================

export interface Permission {
  _id: string;
  description: string;
}

export interface Role {
  _id: string;
  name: string;
  permissions: string[];
  createdAt?: string; // Timestamps are good to have
  updatedAt?: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  // UPDATED: 'role' is now a nested object, not a simple string
  role: Role;
  createdAt: string;
}

// ===================================================================
//
//         NEW: APPOINTMENT & RESERVATION TYPES
//
// ===================================================================

// --- SHARED SUB-TYPES ---

export interface Address {
  province: string;
  city: string;
  barangay: string;
  street: string;
}

// RENAMED from BookingCustomerInfo to be more generic
export interface CustomerInfo {
  name: string;
  email?: string;
  phoneNumber: string;
  address: Address;
}

export interface Payment {
  amount: number;
  date: string | Date;
  method: 'Cash' | 'GCash' | 'Bank Transfer';
  referenceNumber?: string;
}

// --- APPOINTMENT TYPES ---

export interface Appointment {
  _id: string;
  customerInfo: CustomerInfo;
  appointmentDate: Date;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled' | 'No Show';
  statusNote?: string;
  rentalId?: string | null;
  processedItemData?: CustomTailoringItem | null;
  sourceReservationId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// --- RESERVATION TYPES ---

// RENAMED from BookingFinancials
export interface ReservationFinancials {
  shopDiscount?: number;
  depositAmount?: number;
  payments?: Payment[];
}

export interface ItemReservation {
  reservationId: string;
  itemId: string;
  itemName: string;
  variation: {
    color: string;
    size: string;
  };
  quantity: number;
  price: number;
}

// UPDATED: Now includes a link to a potential appointment
export interface FulfillmentPreview {
  role: string;
  wearerName?: string;
  isCustom: boolean;
  assignedItemId?: string;
  variation?: string;
  linkedAppointmentId?: string; // <-- NEW
}

export interface PackageReservation {
  packageReservationId: string;
  packageId: string;
  packageName: string;
  motifName?: string;
  price: number;
  fulfillmentPreview: FulfillmentPreview[];
}

export interface Reservation {
  _id: string;
  customerInfo: CustomerInfo;
  eventDate: Date;
  reserveStartDate: Date;
  reserveEndDate: Date;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  rentalId?: string | null;
  financials: ReservationFinancials;
  itemReservations: ItemReservation[];
  packageReservations: PackageReservation[];
  createdAt: Date;
  updatedAt: Date;
}

export type FormErrors = {
  [key: string]: any;
};