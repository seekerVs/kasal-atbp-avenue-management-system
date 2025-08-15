// In CustomNavbar1.tsx

import { Container, Nav, Navbar, NavDropdown } from "react-bootstrap";
import { NavLink } from "react-router-dom";
import "./customNavbar.css";
import { Logo } from "../../assets/images";

function Custom_navbar1() {
  return (
    <Container fluid className="bg-white shadow-sm px-0 w-100">
      <Navbar expand="lg" className="py-1 custom-container">
        <Container fluid>
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
            {/* --- THIS IS THE MODIFIED LINE --- */}
            <Nav className="ms-auto gap-lg-3 text-center">
              <Nav.Link as={NavLink} to="/" end>
                Home
              </Nav.Link>
              <Nav.Link as={NavLink} to="/products">
                Outfits
              </Nav.Link>
              <Nav.Link as={NavLink} to="/packages">
                Packages
              </Nav.Link>
              <Nav.Link as={NavLink} to="/custom-tailoring">
                Custom Tailoring
              </Nav.Link>
              <NavDropdown title="Book Now" id="book-now-dropdown" align="end">
                <NavDropdown.Item as={NavLink} to="/reservations/new">
                  Reserve Outfits/Packages
                </NavDropdown.Item>
                <NavDropdown.Item as={NavLink} to="/appointments/new">
                  Custom Tailoring Appointment
                </NavDropdown.Item>
                </NavDropdown>
              <Nav.Link as={NavLink} to="/track-request">
                Tracking
              </Nav.Link>
              <Nav.Link as={NavLink} to="/about">
                About
              </Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </Container>
  );
}

export default Custom_navbar1;