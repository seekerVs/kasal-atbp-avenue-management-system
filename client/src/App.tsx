// App.tsx
import "./App.css";
// Check this path: 'bootstrap/dist/css/bootstrap.min.css' is the more common way.
// If your custom '../bootstrap.css' imports it, then it's fine.
import "../styles.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState } from "react";

// Import your components
import About from "./layouts/about/About";
import Home from "./layouts/home/Home";
import Custom_navbar1 from "./components/customNavbar/CustomNavbar1";
import Custom_navbar2 from "./components/customNavbar/CustomNavbar2";
import SignIn from "./layouts/signIn/SignIn";
import Products from "./layouts/products/Products";
import Services from "./layouts/services/Services";
import ProductViewer from "./layouts/productViewer/ProductViewer";
import Package from "./layouts/package/Package";
import CustomTailoring from "./layouts/customTailoring/CustomTailoring";
import Dashboard from "./layouts/dashboard/Dashboard";
import Orders from "./layouts/orders/Orders";

// Import the new helper components
import ProtectedRoute from "./components/ProtectedRoute"; // Adjust path if your components folder is different
import RedirectIfAuthenticated from "./components/RedirectIfAuthenticated"; // Adjust path if your components folder is different
import PackageViewer from "./layouts/packageViewer/PackageViewer";
import Checkout from "./layouts/checkout/Checkout";


function App() {
  // Initialize navbarType based on whether an authToken exists in localStorage.
  // This runs once when the component mounts.
  const [navbarType, setNavbarType] = useState<"main" | "alt">(() => {
    return localStorage.getItem("authToken") ? "alt" : "main";
  });

  return (
    <Router>
      <div className="custom-navbar-wrapper">
        {/* Render the appropriate Navbar based on the current `navbarType` state */}
        {navbarType === "main" ? (
          <Custom_navbar1 />
        ) : (
          <Custom_navbar2 setNavbarType={setNavbarType} />
        )}
      </div>

      <Routes>
        {/* Public Routes */}

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
        <Route path="/services" element={<Services />} />
        <Route path="/about" element={<About />} />
        <Route path="/package" element={<Package />} />
        <Route path="/customTailoring" element={<CustomTailoring />} />
        {/* SignIn Route: Set navbarType on successful sign-in */}
        <Route
          path="/signIn"
          element={<SignIn setNavbarType={setNavbarType} />}
        />
        <Route path="/productViewer/:id" element={<ProductViewer />} />

        {/* Protected Routes: These routes require an authenticated user */}

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

        <Route
          path="/packageViewer"
          element={
            <ProtectedRoute>
              <PackageViewer />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <Orders />
            </ProtectedRoute>
          }
        />
        {/* Add any other routes that should be protected here */}
      </Routes>
    </Router>
  );
}

export default App;
