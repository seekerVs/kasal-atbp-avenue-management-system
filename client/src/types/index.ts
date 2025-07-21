// client/src/types/index.ts
export * from './aboutpage';
export * from './homepage';
// ===================================================================
//
//               CORE DATA MODELS (Inventory, Packages)
//
// ===================================================================

// --- Represents a single variation of an inventory item ---
export interface ItemVariation {
  color: string;
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
}

// --- Defines the structure of a package assignment within a motif ---
export interface PackageAssignment {
  role: string;
  itemId?: string; // Links to InventoryItem._id
  assignedItemName?: string;
  variation?: string;
  imageUrl?: string;
  isCustom?: boolean;
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
  inclusions: string[];
  price: number;
  imageUrl: string;
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

export interface CustomerInfo {
  name: string;
  email: string;
  phoneNumber: string;
  address: string;
}

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

export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'Admin' | 'User';
  createdAt: string;
}

// ===================================================================
//
//               BOOKING & RESERVATION TYPES
//
// ===================================================================

export interface Address {
  province: string;
  city: string;
  barangay: string;
  street: string;
}

export interface BookingCustomerInfo {
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

export interface BookingFinancials {
  shopDiscount?: number;
  depositAmount?: number;
  payments?: Payment[];
}

export interface ItemReservation {
  reservationId: string;
  status: 'Reserved' | 'Confirmed' | 'Cancelled';
  statusNote?: string;
  itemId: string;
  itemName: string;
  variation: {
    color: string;
    size: string;
  };
  quantity: number;
  price: number;
}

export interface FulfillmentPreview {
  role: string;
  wearerName?: string;
  isCustom: boolean;
  assignedItemId?: string;
  variation?: string;
}

export interface PackageReservation {
  packageReservationId: string;
  status: 'Reserved' | 'Confirmed' | 'Cancelled';
  statusNote?: string;
  packageId: string;
  packageName: string;
  motifName?: string;
  price: number;
  fulfillmentPreview: FulfillmentPreview[];
}

export interface AppointmentFor {
  sourcePackageReservationId?: string;
  role: string;
}

export interface Appointment {
  appointmentId: string;
  status: 'Pending' | 'Scheduled' | 'Completed' | 'Cancelled';
  statusNote?: string;
  appointmentFor: AppointmentFor;
  appointmentDate?: string | Date | null;
  processedItemData?: CustomTailoringItem | null; // Reuse existing type
}

export interface Booking {
  _id: string;
  customerInfo: BookingCustomerInfo;
  eventDate: string | Date;
  rentalStartDate: string | Date;
  rentalEndDate: string | Date;
  rentalId?: string | null;
  financials: BookingFinancials;
  itemReservations: ItemReservation[];
  packageReservations: PackageReservation[];
  appointments: Appointment[];
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  createdAt: string | Date;
  updatedAt: string | Date;
}

export type FormErrors = {
  customerInfo?: {
    name?: string;
    phoneNumber?: string;
    email?: string;
    address?: {
      province?: string;
      city?: string;
      barangay?: string;
      street?: string;
    };
  };
  eventDate?: string;
  reservations?: string; // For a general error like "at least one item is required"
};