import './App.css';
import '../bootstrap.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import About from './layouts/about/About';
import Home from './layouts/home/Home';
import Custom_navbar1 from './components/custom_navbar/Custom_navbar1';

function App() {
  return (
    <Router>
      <div className="custom-navbar-wrapper">
        <Custom_navbar1 />
      </div>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </Router>
  );
}

export default App;
