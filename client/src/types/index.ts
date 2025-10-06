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
  _id?: string; 
  color: {
    name: string;
    hex: string;
  };
  size: string;
  quantity: number;
  imageUrls: string[];
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
  type?: 'Wearable' | 'Accessory';
}

// Represents a specific, assigned variation within a package template.
export interface AssignedItem {
  itemId: string;
  color: {
    name: string;
    hex: string;
  };
  size: string;
}

// --- UPDATED: Redefine the package assignment to link by ID ---
// It now reflects the new one-to-many relationship: one inclusion to many items.
export interface PackageAssignment {
  inclusionId: string;            // Was 'inclusionIds: string[]', now singular
  assignedItems: (AssignedItem | null)[];
}

// --- Defines a color motif with its specific item assignments ---
export interface ColorMotif {
  _id?: string;
  motifHex: string;
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

export type RentalStatus = 'Pending' | 'To Pickup' | 'To Return' | 'Completed' | 'Cancelled';

export interface BaseRentItem {
  _id: string;
  name: string; // Just the product name, e.g., "Champagne Dreams Ball Gown"
  price: number;
  quantity: number;
  imageUrl?: string;
  notes?: string;
}

// --- Base for any item that is part of a rental order ---
export interface SingleRentItem extends BaseRentItem {
  itemId: string; // The ObjectId of the original inventory item
  variation: {
    color: {
      name: string;
      hex: string;
    };
    size: string;
  };
}

// --- For custom-made items, extends the base and adds tailoring details ---
export interface CustomTailoringItem extends BaseRentItem {
  outfitCategory: string;
  outfitType: string;
  tailoringType: 'Tailored for Purchase' | 'Tailored for Rent-Back';
  measurements: { [key: string]: number | string };
  materials: string[];
  designSpecifications: string;
  referenceImages: string[];
  fittingDate: string;
  completionDate: string;
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
  sourceInclusionId?: string;
}

// --- Represents a package once it has been added to a rental order ---
export interface RentedPackage extends BaseRentItem {
  packageFulfillment: PackageFulfillment[];
  variation: {
    color: {
      name: string;
      hex: string;
    };
    size: string;
  };
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
  receiptImageUrl?: string;
}

// --- Financial data for a rental, including server-calculated fields ---
export interface Financials {
  // Stored values
  shopDiscount: number;
  depositAmount: number;
  depositReimbursed?: number; 
  payments?: PaymentDetail[];
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
  pendingInventoryConversion?: CustomTailoringItem[];
  returnReminderSent?: boolean;
}

export interface NormalizedFulfillmentItem {
  role: string;
  wearerName?: string;
  isCustom: boolean;
  notes?: string;
  assignedItem: {
    itemId?: string;
    name?: string;
    variation?: string;
    imageUrl?: string | File;
    outfitCategory?: string; // For custom items
    referenceImages?: (string | File)[]; // For custom items
  };
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
  command?: 'focusNext' | string;
  updatedAt: string;
}

// ===================================================================
//
//               USER & PERMISSION TYPES
//
// ===================================================================


export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'Super Admin' | 'Standard';
  status: 'active' | 'inactive' | 'suspended';
  
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
  referenceNumber?: string;
  receiptImageUrl?: string;
}

// --- APPOINTMENT TYPES ---

export interface Appointment {
  _id: string;
  customerInfo: CustomerInfo;
  appointmentDate: Date | null;
  timeBlock: 'morning' | 'afternoon' | null;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled' ;
  notes?: string;
  cancellationReason?: string;
  rentalId?: string | null;
  sourceReservationId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// --- RESERVATION TYPES ---

// RENAMED from ReservationFinancials
export interface ReservationFinancials {
  shopDiscount?: number;
  depositAmount?: number;
  payments?: Payment[];
  requiredDeposit?: number;
  subtotal?: number;
  grandTotal?: number;
  remainingBalance?: number;
}

export interface ItemReservation {
  reservationId: string;
  itemId: string;
  itemName: string;
  variation: {
    color: {
      name: string;
      hex: string;
    };
    size: string;
  };
  quantity: number;
  price: number;
  imageUrl?: string;
}

// UPDATED: Now includes a link to a potential appointment
export interface FulfillmentPreview {
  role: string;
  wearerName?: string;
  isCustom: boolean;
  assignedItemId?: string | InventoryItem; 
  variation?: string;
  linkedAppointmentId?: string; // <-- NEW
  notes?: string;
}

export interface PackageReservation {
  packageReservationId: string;
  packageId: string;
  packageName: string;
  motifHex?: string;
  price: number;
  fulfillmentPreview: FulfillmentPreview[];
  imageUrl?: string;
}

export interface Reservation {
  _id: string;
  customerInfo: CustomerInfo;
  reserveDate: Date;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  cancellationReason?: string;
  rentalId?: string | null;
  financials: ReservationFinancials;
  itemReservations: ItemReservation[];
  packageReservations: PackageReservation[];
  appointments?: Appointment[];
  packageAppointmentDate?: Date | null;
  packageAppointmentBlock?: 'morning' | 'afternoon' | null;
  createdAt: Date;
  updatedAt: Date;
}

export type FormErrors = {
  [key: string]: any;
};

// ===================================================================
//
//         NEW: UNAVAILABILITY & SETTINGS TYPES
//
// ===================================================================

export interface ShopSettings {
  _id: 'shopSettings';
  appointmentSlotsPerDay: number;
  gcashName?: string;
  gcashNumber?: string;
  shopAddress?: string;
  shopContactNumber?: string;
  shopEmail?: string;
}

// And modify the UnavailabilityRecord to remove 'slots'
export interface UnavailabilityRecord {
  _id: string;
  date: string;
  reason: 'Public Holiday' | 'Shop Holiday';
}