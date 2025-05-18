// App.tsx
import "./App.css";
import "../bootstrap.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState } from "react";

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

function App() {
  const [navbarType, setNavbarType] = useState<"main" | "alt">("main");

  return (
    <Router>
      <div className="custom-navbar-wrapper">
        {navbarType === "main" ? (
          <Custom_navbar1 />
        ) : (
          <Custom_navbar2 setNavbarType={setNavbarType} />
        )}
      </div>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/services" element={<Services />} />
        <Route path="/about" element={<About />} />
        <Route
          path="/signIn"
          element={<SignIn setNavbarType={setNavbarType} />}
        />
        <Route path="/productViewer/:id" element={<ProductViewer />} />
        <Route path="/package" element={<Package />} />
        <Route path="/customTailoring" element={<CustomTailoring />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/orders" element={<Orders />} />
      </Routes>
    </Router>
  );
}

export default App;
