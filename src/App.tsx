import "./App.css";
import "../bootstrap.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import About from "./layouts/about/About";
import Home from "./layouts/home/Home";
import Custom_navbar1 from "./components/custom_navbar/Custom_navbar1";
import Sign_in from "./layouts/sign_in/Sign_in";
import Sign_up from "./layouts/sign_up/Sign_up";
import Products from "./layouts/products/Products";
import Services from "./layouts/services/Services";

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
        <Route path="/sign_in" element={<Sign_in />} />
      </Routes>
    </Router>
  );
}

export default App;
