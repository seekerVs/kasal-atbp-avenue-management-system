// src/components/sidebar/sidebarItems.tsx

import {
  HouseDoorFill,
  CalendarCheck,
  ClipboardData,
  BoxSeam,
  Images,
  PeopleFill,
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
    icon: ClipboardData,
    subItems: [
      { title: "Manage Rentals", path: "/manageRentals" },
      { title: "Single Rent", path: "/singleRent" },
      { title: "Package Rent", path: "/packageRent" },
      { title: "Custom", path: "/customRent" },
    ],
  },
  {
    title: "Reservations",
    path: "/reservations",
    icon: CalendarCheck,
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