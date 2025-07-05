// App.tsx
import "./App.css";
// Ensure this path is correct for your custom bootstrap or main stylesheet.
import "../styles.css"; // User has `../styles.css`

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react"; // Import useEffect for initial auth check
import { Spinner } from "react-bootstrap"; // Import Spinner for optional loading state
import "react-bootstrap-icons";

// Import your components
import About from "./layouts/about/About";
import Home from "./layouts/home/Home";
import Custom_navbar1 from "./components/customNavbar/CustomNavbar1";
import SignIn from "./layouts/signIn/SignIn";
import Products from "./layouts/products/Products";
import Services from "./layouts/services/Services";
import ProductViewer from "./layouts/productViewer/ProductViewer";
import Package from "./layouts/package/Package";
import CustomTailoring from "./layouts/customTailoring/CustomTailoring";
import Dashboard from "./layouts/dashboard/Dashboard"; // Corrected path assumption
import PackageViewer from "./layouts/packageViewer/PackageViewer";
import Checkout from "./layouts/checkout/Checkout";
import CompletedOrder from "./layouts/completedOrder/CompletedOrder";
import ToReturnOrder from "./layouts/toReturnOrder/ToReturnOrder";
import { NotificationProvider } from "./contexts/NotificationContext";
import NotificationContainer from "./components/notifications/NotificationContainer";

// Import helper components
import ProtectedRoute from "./components/ProtectedRoute";
import RedirectIfAuthenticated from "./components/RedirectIfAuthenticated";
import Sidebar from "./components/sidebar/Sidebar";
import SingleRent from "./layouts/singleRent/SingleRent";
import InventoryItems from "./layouts/inventoryItems/InventoryItems";
import ManageRentals from "./layouts/manageRentals/ManageRentals";
import Sign_up from "./layouts/signUp/SignUp";
import RentalViewer from "./layouts/rentalViewer/RentalViewer";
import PackageRent from "./layouts/packageRent/PackageRent";
import PackageItems from "./layouts/packageItems/PackageItems";
import CustomRent from "./layouts/customRent/CustomRent";

// Import the responsive Sidebar component

function App() {
  // Initialize navbarType based on whether an authToken exists in localStorage.
  // This runs once when the component mounts.
  const [navbarType, setNavbarType] = useState<"main" | "alt">(() => {
    return localStorage.getItem("authToken") ? "alt" : "main";
  });
  const [loading, setLoading] = useState(true); // Added loading state for initial auth check

  // Use useEffect to handle potential initial state mismatch or token changes
  // and to ensure localStorage is read after the component mounts.
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    setNavbarType(token ? "alt" : "main");
    setLoading(false); // Set loading to false once initial check is done
  }, []); // Empty dependency array means this runs once on mount

  if (loading) {
    // Optionally show a loading spinner while determining auth state
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{
          minHeight: "100vh",
          backgroundColor: "#212529",
          color: "white",
        }}
      >
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <NotificationProvider>
      <Router>
        <NotificationContainer />
        {navbarType === "main" ? (
          // --- Layout for Signed Out users (Custom_navbar1 and public routes) ---
          <>
            <div className="custom-navbar-wrapper">
              <Custom_navbar1 />
            </div>
            <Routes>
              {/* Home Route: If authenticated, redirect to Dashboard. Otherwise, show Home. */}
              <Route
                path="/"
                element={
                  <RedirectIfAuthenticated redirectTo="/dashboard">
                    <Home />
                  </RedirectIfAuthenticated>
                }
              />
              <Route path="/products" element={<Products />} />
              <Route path="/signUp" element={<Sign_up setNavbarType={setNavbarType} />} />
              <Route path="/services" element={<Services />} />
              <Route path="/about" element={<About />} />
              <Route path="/package" element={<Package />} />{" "}
              {/* Public access to package selection */}
              <Route path="/customTailoring" element={<CustomTailoring />} />{" "}
              {/* Public access to custom tailoring */}
              {/* SignIn Route: Set navbarType on successful sign-in */}
              <Route
                path="/signIn"
                element={<SignIn setNavbarType={setNavbarType} />}
              />
              <Route path="/productViewer/:id" element={<ProductViewer />} />
            </Routes>
          </>
        ) : (
          // --- Layout for Signed In users (Responsive Sidebar + Main Content) ---
          // This outer div manages the responsive layout:
          // - d-lg-flex: Becomes a flex container on large screens and up (sidebar next to content)
          // - On smaller screens (below lg), it behaves as a normal block, allowing the mobile navbar (from Sidebar) to stack above the content.
          <div className="d-lg-flex" style={{ minHeight: "100vh" }}>
            {/* Sidebar component: Renders either the desktop fixed sidebar OR the mobile top bar with offcanvas */}
            <Sidebar setNavbarType={setNavbarType} />
            {/* Main content area: Fills remaining space next to sidebar on desktop, or flows below mobile navbar on small screens */}
            <div className="flex-grow-1 px-2 px-lg-4 pt-4">
              <Routes>
                {/* All Protected Routes: These routes require an authenticated user */}
                {/* The ProtectedRoute component will handle redirection if no token is found */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/rentals/:id"
                  element={
                    <ProtectedRoute>
                      <RentalViewer />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/singleRent"
                  element={
                    <ProtectedRoute>
                      <SingleRent />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/packageRent"
                  element={
                    <ProtectedRoute>
                      <PackageRent />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/customRent"
                  element={
                    <ProtectedRoute>
                      <CustomRent />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/inventoryItems"
                  element={
                    <ProtectedRoute>
                      <InventoryItems />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/packageItems"
                  element={
                    <ProtectedRoute>
                      <PackageItems />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/manageRentals"
                  element={
                    <ProtectedRoute>
                      <ManageRentals />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/toReturnOrder"
                  element={
                    <ProtectedRoute>
                      <ToReturnOrder />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/completedOrder"
                  element={
                    <ProtectedRoute>
                      <CompletedOrder />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/packageViewer"
                  element={
                    <ProtectedRoute>
                      <PackageViewer />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/checkout"
                  element={
                    <ProtectedRoute>
                      <Checkout />
                    </ProtectedRoute>
                  }
                />
                {/* Assuming these can also be protected, even if public in main layout */}
                <Route
                  path="/products"
                  element={
                    <ProtectedRoute>
                      <Products />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/services"
                  element={
                    <ProtectedRoute>
                      <Services />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/about"
                  element={
                    <ProtectedRoute>
                      <About />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/package"
                  element={
                    <ProtectedRoute>
                      <Package />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/customTailoring"
                  element={
                    <ProtectedRoute>
                      <CustomTailoring />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/productViewer/:id"
                  element={
                    <ProtectedRoute>
                      <ProductViewer />
                    </ProtectedRoute>
                  }
                />
                {/* Add any other authenticated routes here, e.g., Customers, Reports, Integrations, Settings */}
                <Route
                  path="/customers"
                  element={
                    <ProtectedRoute>
                      <div>Customers Page Content</div>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <ProtectedRoute>
                      <div>Reports Page Content</div>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/integrations"
                  element={
                    <ProtectedRoute>
                      <div>Integrations Page Content</div>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <div>Settings Page Content</div>
                    </ProtectedRoute>
                  }
                />
                {/* Fallback route for authenticated users landing on unrecognized paths */}
                <Route
                  path="*"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </div>
          </div>
        )}
      </Router>
    </NotificationProvider>
  );
}

export default App;
