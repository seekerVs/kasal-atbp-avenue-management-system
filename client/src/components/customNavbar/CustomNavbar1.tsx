// In CustomNavbar1.tsx

import { Container, Nav, Navbar } from "react-bootstrap";
import { NavLink } from "react-router-dom";
import "./customNavbar.css";
import { Logo } from "../../assets/images";


function Custom_navbar1() {
  return (
    <Container fluid className="bg-white shadow-sm px-0 w-100">
      <Navbar expand="lg" className="py-1 custom-container">
        <Container fluid>
          {/* --- Improvement #3: Use NavLink for the brand for better semantics --- */}
          <Navbar.Brand
            as={NavLink}
            to="/"
            className="d-flex justify-content-center align-items-start"
          >
            <img
              src={Logo}
              alt="KASAL atbp AVENUE"
              height="60"
              className="d-inline-block align-middle"
            />
            <span className="ms-2 brand-text d-none d-lg-inline">
              KASAL atbp AVENUE
            </span>
          </Navbar.Brand>

          <Navbar.Toggle aria-controls="navbarResponsive" />

          <Navbar.Collapse id="navbarResponsive">
            {/* The `mx-auto` class on the Nav component is the key.
                It tells the navigation block to take up the necessary space for its
                links and then add equal margin to its left and right, effectively
                centering it within the available flex container space. */}
            <Nav className="mx-auto gap-lg-4 text-center">
              <Nav.Link as={NavLink} to="/" end>
                Home
              </Nav.Link>
              <Nav.Link as={NavLink} to="/book-now">
                Book Now
              </Nav.Link>
              <Nav.Link as={NavLink} to="/products">
                Outfits
              </Nav.Link>
              <Nav.Link as={NavLink} to="/about">
                About
              </Nav.Link>
            </Nav>
          </Navbar.Collapse>
          <div className="navbar-spacer d-none d-lg-block"></div>
        </Container>
      </Navbar>
    </Container>
  );
}

export default Custom_navbar1;