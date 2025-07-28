// src/components/sidebar/sidebarItems.tsx

import {
  HouseDoorFill,
  CalendarCheck,
  ClipboardData,
  BoxSeam,
  Images,
  PeopleFill,
  JournalCheck,
  CalendarHeart,
  CalendarPlus,
} from "react-bootstrap-icons";
import { Icon } from "react-bootstrap-icons"; // Import the base Icon type

// A type for sub-items, where an icon is not required
export interface SubNavItem {
  title: string;
  path: string;
}

// The main NavItem type for top-level entries
export interface NavItem {
  title: string;
  path: string;
  icon: Icon; // This ensures we get proper type hints for icons
  subItems?: SubNavItem[];
}

export const sidebarItems: NavItem[] = [
  {
    title: "Dashboard",
    path: "/dashboard",
    icon: HouseDoorFill,
  },
  {
    title: "Rentals",
    path: "#", // Parent path can be "#" if it only serves as a trigger
    icon: CalendarPlus,
    subItems: [
      { title: "New Rental", path: "/new-rental" },
      { title: "Manage Rentals", path: "/manageRentals" },
    ],
  },
  {
    title: "Reservations",
    path: "/manage-reservations",
    icon: JournalCheck, // A fitting icon for reservations
  },
  {
    title: "Appointments",
    path: "#", // 2. Make Appointments a collapsible parent
    icon: CalendarHeart,
    subItems: [ 
      { title: "Manage Appointments", path: "/manage-appointments" },
      { title: "Shop Unavailability", path: "/manage-unavailability" }, // 3. Add the new link
    ],
  },
  {
    title: "Inventory",
    path: "#",
    icon: BoxSeam,
    subItems: [
      { title: "Inventory Items", path: "/inventoryItems" },
      { title: "Packages", path: "/packageItems" },
    ],
  },
  {
    title: "Content Management",
    path: "/contentManagement",
    icon: Images,
  },
  {
    title: "divider",
    path: "",
    icon: () => null, // Placeholder for dividers
  },
  {
    title: "Accounts",
    path: "/accounts",
    icon: PeopleFill,
  },
];