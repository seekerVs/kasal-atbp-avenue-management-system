import { useState } from "react";
import { Container, Nav, Navbar, Button } from "react-bootstrap";
import { NavLink, useNavigate } from "react-router-dom";
import "./customNavbar.css";

function Custom_navbar1() {
  const navigate = useNavigate();
  const [activeButton, setActiveButton] = useState<"signin" | null>(null);

  const getButtonVariant = (buttonName: string) =>
    activeButton === buttonName ? "outline-primary" : "primary";

  return (
    <Container fluid className="bg-white shadow-sm px-0 w-100">
      <Navbar expand="lg" className="bg-white py-1 custom-container">
        <Container fluid>
          <Navbar.Brand className="brand-text" href="#">
            KASAL atbp AVENUE
          </Navbar.Brand>

          <div className="d-flex align-items-center ms-auto gap-1 d-lg-none">
            <Navbar.Toggle aria-controls="navbarResponsive" />
          </div>

          <Navbar.Collapse id="navbarResponsive">
            <Nav className="mx-auto gap-4 text-center">
              <Nav.Item>
                <Nav.Link as={NavLink} to="/" end>
                  Home
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link as={NavLink} to="/services">
                  Services
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link as={NavLink} to="/products">
                  Products
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link as={NavLink} to="/about">
                  About
                </Nav.Link>
              </Nav.Item>

              {/* Mobile Sign In button */}
              <div className="d-flex align-items-center ms-auto gap-3 d-lg-none mx-auto">
                <Button
                  variant={getButtonVariant("signin")}
                  size="sm"
                  disabled={activeButton === "signin"}
                  onClick={() => {
                    setActiveButton("signin");
                    navigate("/signIn");
                  }}
                >
                  Sign In
                </Button>
              </div>
            </Nav>

            {/* Desktop Sign In button */}
            <div className="d-none custom-margin-left1 d-lg-flex align-items-center">
              <Button
                variant={getButtonVariant("signin")}
                size="lg"
                disabled={activeButton === "signin"}
                onClick={() => {
                  setActiveButton("signin");
                  navigate("/signIn");
                }}
              >
                Sign In
              </Button>
            </div>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </Container>
  );
}

export default Custom_navbar1;
