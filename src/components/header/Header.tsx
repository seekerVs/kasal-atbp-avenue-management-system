import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import { Bell, PersonCircle } from 'react-bootstrap-icons'; // Icons via react-bootstrap-icons
import './header.css'; // Custom CSS for Header component

function Header() {
  return (
    // Container Fluid wraps the entire header, setting background and padding
    <Container fluid className="bg-white shadow px-0 w-100">
      {/* Navbar component */}
      <Navbar expand="lg" className="bg-white py-3 custom-container">
        {/* Container fluid inside Navbar for consistent padding/alignment */}
        <Container fluid>
          {/* Brand - Always visible */}
          <Navbar.Brand className="brand-text fw-bold impact-font w-auto" href="#">
             KASAL atbp AVENUE
           </Navbar.Brand>

          {/* Mobile Icons and Toggle Group */}
          {/* This div is a flex container. ms-auto pushes it to the right. */}
          {/* d-lg-none hides this div on large screens and up. */}
          <div className="d-flex align-items-center ms-auto gap-2 gap-lg-3 d-lg-none">
            {/* Icons visible on mobile */}
            <Bell size={20} />
            <PersonCircle size={24} />
            {/* Toggle Button visible on mobile */}
            <Navbar.Toggle aria-controls="navbarResponsive" />
          </div>


          {/* Collapsible Content: Nav Links + Desktop Icons */}
          {/* This content is hidden on mobile until toggled, shown on desktop */}
          <Navbar.Collapse id="navbarResponsive">
            {/* Center Nav Links - Use mx-auto to center on desktop within collapse flex */}
            {/* On mobile, flex-column is default inside collapse, gap adds vertical space */}
            <Nav className="custom-margin-left me-auto gap-4 text-center">
              <Nav.Link href="#dashboard">Dashboard</Nav.Link>
              <Nav.Link href="#services">Services</Nav.Link>
              <Nav.Link href="#products">Products</Nav.Link>
              <Nav.Link href="#orders">Orders</Nav.Link>
              <Nav.Link href="#about">About</Nav.Link>
            </Nav>

            {/* Desktop Icons */}
            {/* d-none hides this div on small screens. d-lg-flex shows it as flex on large screens. */}
            {/* Since this is inside Navbar.Collapse (which is display: flex on desktop), it will appear on the right after the mx-auto Nav */}
            <div className="d-none ms-5 d-lg-flex gap-3 align-items-center">
              <Bell size={20} />
              <PersonCircle size={24} />
            </div>
          </Navbar.Collapse>

          {/* Important: The Navbar.Toggle element *itself* is automatically hidden by Bootstrap
              on screens >= `lg` because of the `expand="lg"` prop on the Navbar.
              We've placed it inside the mobile-only div, so the entire div disappears
              on desktop, and the toggle inside it also disappears. This is the correct behaviour. */}

        </Container>
      </Navbar>
    </Container>

  );
}

export default Header;