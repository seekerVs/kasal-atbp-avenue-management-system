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
  GearFill, // Keep the Gear icon
} from "react-bootstrap-icons";
import { Icon } from "react-bootstrap-icons";

export interface SubNavItem {
  title: string;
  path: string;
}

export interface NavItem {
  title: string;
  path: string;
  icon: Icon;
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
    path: "#",
    icon: CalendarPlus,
    subItems: [
      { title: "New Rental", path: "/new-rental" },
      { title: "Manage Rentals", path: "/manageRentals" },
    ],
  },
  {
    title: "Reservations",
    path: "/manage-reservations",
    icon: JournalCheck,
  },
  {
    title: "Appointments",
    path: "/manage-appointments",
    icon: CalendarHeart,
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
    icon: () => null,
  },
  // --- CORRECTED STRUCTURE ---
  {
    title: "Accounts",
    path: "/accounts",
    icon: PeopleFill, // Accounts is a top-level item again
  },
  {
    title: "Settings",
    path: "/settings", // Settings is now a direct link
    icon: GearFill,
  },
];