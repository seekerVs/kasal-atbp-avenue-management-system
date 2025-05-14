import "./App.css";
import "../bootstrap.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import About from "./layouts/about/About";
import Home from "./layouts/home/Home";
import Custom_navbar1 from "./components/customNavbar/CustomNavbar1";
import SignIn from "./layouts/signIn/SignIn";
import Products from "./layouts/products/Products";
import Services from "./layouts/services/Services";
import ProductViewer from "./layouts/productViewer/ProductViewer";

function App() {
  return (
    <Router>
      <div className="custom-navbar-wrapper">
        <Custom_navbar1 />
      </div>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/services" element={<Services />} />
        <Route path="/about" element={<About />} />
        <Route path="/signIn" element={<SignIn />} />
        <Route path="/productViewer/:id" element={<ProductViewer />} />
      </Routes>
    </Router>
  );
}

export default App;
