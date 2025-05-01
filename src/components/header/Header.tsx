import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import { Bell, PersonCircle } from 'react-bootstrap-icons'; // Icons via react-bootstrap-icons
import './header.css'; // Custom CSS for Header component

function Header() {
  return (
    // Outer Container Fluid for full width background and padding
    <Container fluid className="bg-white shadow px-3 px-lg-10 w-100">
      {/* Navbar component */}
      <Navbar expand="lg" className="bg-white py-3 custom-container">
        {/* Inner Container fluid for consistent padding/alignment and flex parent for main layout */}
        {/* We use d-flex, justify-content-between, align-items-center on the Container fluid */}
        {/* to control the layout of Brand, Collapse, and Mobile Icons+Toggle */}
        <Container fluid className="d-flex justify-content-between align-items-center"> {/* Added flex classes for main layout */}

          {/* Brand - Set mobile font size (fs-4) and override for desktop (fs-lg-2) */}
          {/* Added flex-shrink-1 to allow element shrinking and me-2 for spacing */}
          <Navbar.Brand
            className="fs-5 fs-lg-2 fw-bold text-danger impact-font flex-shrink-1 me-2" // Changed fs-2 to fs-4 fs-lg-2
            href="#"
          >
            KASAL atbp AVENUE
          </Navbar.Brand>

          {/* Collapsible Content: Nav Links + Desktop Icons */}
          {/* This content is hidden on mobile until toggled, shown on desktop */}
          {/* flex-grow-1 allows it to take up available space between Brand and the right-most group on desktop */}
          {/* On desktop, this becomes a flex container itself, allowing internal centering/alignment */}
          <Navbar.Collapse id="navbarResponsive" className="flex-grow-1"> {/* Added flex-grow-1 */}

             {/* Nav Links - Use mx-auto to center *within the collapse space* */}
             {/* mx-auto will center this Nav component between the left edge of its parent (Navbar.Collapse) */}
             {/* and the start of the right-aligned element (Desktop Icons div) */}
             {/* gap adds space between links, text-center for mobile collapse */}
             <Nav className="mx-auto gap-4 text-center"> {/* mx-auto centers within the flex-grow-1 collapse */}
               <Nav.Link href="#dashboard">Dashboard</Nav.Link>
               <Nav.Link href="#services">Services</Nav.Link>
               <Nav.Link href="#products">Products</Nav.Link>
               <Nav.Link href="#orders">Orders</Nav.Link>
               <Nav.Link href="#about">About</Nav.Link>
             </Nav>

             {/* Desktop Icons */}
             {/* d-none hides on small screens. d-lg-flex shows as flex on large screens. */}
             {/* ms-lg-auto pushes this div to the right edge *of the Navbar.Collapse container* */}
             {/* This div sits next to the Nav links inside the collapse on desktop */}
             <div className="d-none d-lg-flex gap-3 align-items-center ms-lg-auto"> {/* Added ms-lg-auto */}
               <Bell size={20} />
               <PersonCircle size={24} />
             </div>
          </Navbar.Collapse>

          {/* Mobile Icons and Toggle Group */}
          {/* This div is a flex container. On mobile, it's the third item in the main Container fluid's justify-content-between */}
          {/* d-lg-none hides this div on large screens and up. */}
          {/* It contains the icons and the toggle button for the mobile view */}
          <div className="d-flex align-items-center gap-3 d-lg-none"> {/* No ms-auto here because parent Container is justify-content-between */}
            {/* Icons visible on mobile */}
            <Bell size={20} />
            <PersonCircle size={24} />
            {/* Toggle Button visible on mobile (hidden by Navbar expand prop on desktop) */}
            <Navbar.Toggle aria-controls="navbarResponsive" />
          </div>

        </Container>
      </Navbar>
    </Container>
  );
}

export default Header;

