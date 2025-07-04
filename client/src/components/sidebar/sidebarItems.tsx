import {
  HouseDoorFill,
  CalendarCheck,
  ClipboardData,
  ArchiveFill,
  Images,
  PeopleFill,
  Speedometer2,
  BoxSeam,
  PersonCircle,
} from "react-bootstrap-icons";

export interface NavItem {
  title: string;
  path: string;
  icon: React.ElementType;
  subItems?: NavItem[];
}

export const sidebarItems: NavItem[] = [
  {
    title: "Dashboard",
    path: "/dashboard",
    icon: HouseDoorFill,
  },
  {
    title: "Rentals",
    path: "/",
    icon: ClipboardData, // better icon for transactions/rentals
    subItems: [
      {
        title: "Manage Rentals",
        path: "/manageRentals",
        icon: HouseDoorFill,
      },
      {
        title: "Single Rent",
        path: "/singleRent",
        icon: HouseDoorFill,
      },
      {
        title: "Package Rent",
        path: "/packageRent",
        icon: HouseDoorFill,
      },
      {
        title: "Custom",
        path: "/customRent",
        icon: HouseDoorFill,
      },
    ],
  },
  {
    title: "Reservations",
    path: "/reservations",
    icon: CalendarCheck, // calendar icon fits reservations
  },
  {
    title: "Inventory",
    path: "/",
    icon: BoxSeam, // Box is good for inventory
    subItems: [
      {
        title: "Inventory Items",
        path: "/inventoryItems",
        icon: HouseDoorFill,
      },
      {
        title: "Packages",
        path: "/packageItems",
        icon: HouseDoorFill,
      },
    ],
  },
  {
    title: "Content Management",
    path: "/contentManagement",
    icon: Images, // Images for media/content
  },
  {
    title: "divider",
    path: "",
    icon: () => null,
  },
  {
    title: "Accounts",
    path: "/accounts",
    icon: PeopleFill, // people icon more appropriate for accounts/users
  },
];

// {
//     title: 'Home',
//     path: '/home', // This path can be a parent route or just a trigger
//     icon: HouseDoorFill,
//     subItems: [
//       {
//         title: 'Overview',
//         path: '/home', // Changed this to link to your existing dashboard
//         icon: Speedometer2, // Just for example, sub-items can also have icons
//       },
//       {
//         title: 'Updates',
//         path: '/updates',
//         icon: Speedometer2,
//       },
//       {
//         title: 'Reports',
//         path: '/reports',
//         icon: Speedometer2,
//       },
//     ],
//   }
