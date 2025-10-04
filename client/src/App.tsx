import "react-datepicker/dist/react-datepicker.css"; 
import "./App.css";
import "../styles.css";

// 1. Import the new router components from react-router-dom
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "react-bootstrap-icons";
import { ErrorBoundary } from "react-error-boundary";
import { Analytics } from "@vercel/analytics/react";

// Context Providers
import { AlertProvider } from "./contexts/AlertContext";

// Layout and Helper Components
import { Layout } from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import RedirectIfAuthenticated from "./components/RedirectIfAuthenticated";
import { ErrorFallback } from "./components/system/ErrorFallback";
import { InactivityManager } from "./components/InactivityManager";

// Page Components (Public)
import Home from "./layouts/home/Home";
import About from "./layouts/about/About";
import SignIn from "./layouts/signIn/SignIn";
import SignUp from "./layouts/signUp/SignUp";
import Products from "./layouts/products/Products";
import ProductViewer from "./layouts/productViewer/ProductViewer";
import Package from "./layouts/package/Package";
import PackageViewer from "./layouts/packageViewer/PackageViewer";
import CustomTailoring from "./layouts/customTailoring/CustomTailoring";
import CreateAppointmentPage from "./layouts/createAppointment/CreateAppointmentPage";
import CreateReservationPage from "./layouts/createReservation/CreateReservationPage";
import RequestTracker from "./layouts/requestTracker/RequestTracker";

// Page Components (Admin)
import Dashboard from "./layouts/dashboard/Dashboard";
import NewRental from "./layouts/newRental/NewRental";
import RentalViewer from "./layouts/rentalViewer/RentalViewer";
import SingleRent from "./layouts/singleRent/SingleRent";
import PackageRent from "./layouts/packageRent/PackageRent";
import CustomRent from "./layouts/customRent/CustomRent";
import InventoryItems from "./layouts/inventoryItems/InventoryItems";
import DamagedItems from "./layouts/damagedItems/DamagedItems";
import PackageItems from "./layouts/packageItems/PackageItems";
import ManageRentals from "./layouts/manageRentals/ManageRentals";
import ContentManagement from "./layouts/contentManagement/ContentManagement";
import Accounts from "./layouts/accounts/Accounts";
import Settings from "./layouts/settings/Settings";
import ManageReservations from "./layouts/manageReservations/ManageReservations";
import ReservationViewer from "./layouts/reservationViewer/ReservationViewer";
import ManageAppointments from "./layouts/manageAppointments/ManageAppointments";

// 2. Define the application routes using the new object-based syntax
// This happens OUTSIDE the App component function.
const router = createBrowserRouter([
  {
    // The Layout component acts as the parent for all pages, providing the nav/sidebar
    element: <Layout />,
    // We use the ErrorBoundary here to catch errors within the routing context
    errorElement: <ErrorFallback error={new Error("A routing error occurred.")} resetErrorBoundary={() => window.location.reload()} />,
    children: [
      // --- PUBLIC & SHARED ROUTES ---
      { path: "/", element: <Home /> },
      { path: "/signIn", element: <RedirectIfAuthenticated redirectTo="/dashboard"><SignIn /></RedirectIfAuthenticated> },
      { path: "/signUp", element: <RedirectIfAuthenticated redirectTo="/dashboard"><SignUp /></RedirectIfAuthenticated> },
      { path: "/about", element: <About /> },
      { path: "/products", element: <Products /> },
      { path: "/productViewer/:id", element: <ProductViewer /> },
      { path: "/packages", element: <Package /> },
      { path: "/packageViewer", element: <PackageViewer /> }, // Note: No :id, as data is passed via state
      { path: "/custom-tailoring", element: <CustomTailoring /> },
      { path: "/reservations/new", element: <CreateReservationPage /> },
      { path: "/appointments/new", element: <CreateAppointmentPage /> },
      { path: "/track-request", element: <RequestTracker /> },

      // --- ADMIN-ONLY PROTECTED ROUTES ---
      { path: "/dashboard", element: <ProtectedRoute><Dashboard /></ProtectedRoute> },
      { path: "/new-rental", element: <ProtectedRoute><NewRental /></ProtectedRoute> },
      { path: "/rentals/:id", element: <ProtectedRoute><RentalViewer /></ProtectedRoute> },
      { path: "/singleRent", element: <ProtectedRoute><SingleRent /></ProtectedRoute> },
      { path: "/packageRent", element: <ProtectedRoute><PackageRent /></ProtectedRoute> },
      { path: "/customRent", element: <ProtectedRoute><CustomRent /></ProtectedRoute> },
      { path: "/inventoryItems", element: <ProtectedRoute><InventoryItems /></ProtectedRoute> },
      { path: "/damaged-items", element: <ProtectedRoute><DamagedItems /></ProtectedRoute> },
      { path: "/packageItems", element: <ProtectedRoute><PackageItems /></ProtectedRoute> },
      { path: "/manageRentals", element: <ProtectedRoute><ManageRentals /></ProtectedRoute> },
      { path: "/contentManagement", element: <ProtectedRoute><ContentManagement /></ProtectedRoute> },
      { path: "/accounts", element: <ProtectedRoute><Accounts /></ProtectedRoute> },
      { path: "/settings", element: <ProtectedRoute><Settings /></ProtectedRoute> },
      { path: "/manage-reservations", element: <ProtectedRoute><ManageReservations /></ProtectedRoute> },
      { path: "/reservations/:id", element: <ProtectedRoute><ReservationViewer /></ProtectedRoute> },
      { path: "/manage-appointments", element: <ProtectedRoute><ManageAppointments /></ProtectedRoute> },
    ],
  },
]);


function App() {
  return (
    // The ErrorBoundary and Providers now wrap the RouterProvider
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <AlertProvider>
        <InactivityManager />
        <RouterProvider router={router} />
        <Analytics />
      </AlertProvider>
    </ErrorBoundary>
  );
}

export default App;