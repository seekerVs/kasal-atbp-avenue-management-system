import { useState, useRef } from "react";
import { Container, Nav, Navbar, Overlay, Popover } from "react-bootstrap";
import { Bell, PersonCircle } from "react-bootstrap-icons";
import { NavLink, useNavigate } from "react-router-dom";
import "./customNavbar.css";
import { Logo } from "../../assets/images";

interface CustomNavbar2Props {
  setNavbarType: (type: "main" | "alt") => void;
  // If you had a global state for user data (e.g., user context),
  // you might also pass a logout function from there:
  // onLogout?: () => void;
}

function Custom_navbar2({ setNavbarType }: CustomNavbar2Props) { // Removed onLogout for this example
  const [showPopover, setShowPopover] = useState(false);
  const iconRef = useRef(null);
  const navigate = useNavigate();

  const handleLogout = () => {
    // 1. Clear the authentication token from local storage
    localStorage.removeItem("authToken"); // THIS IS THE CRUCIAL PART

    // 2. (Optional but good practice): If your backend has a logout endpoint
    //    that invalidates server-side sessions or blacklists tokens,
    //    you could make an Axios call here. For stateless JWTs, it's often not strictly necessary.
    /*
    import axios from 'axios'; // Add axios import if you uncomment this
    axios.post('http://localhost:3001/logout', {}) // Replace with your backend logout endpoint if it exists
      .then(() => {
        console.log('Backend session invalidated (if applicable)');
      })
      .catch(err => {
        console.error('Error invalidating backend session:', err);
        // You might still proceed with client-side logout even if backend fails
      });
    */

    // 3. Hide the popover
    setShowPopover(false);

    // 4. Update the navbar type to reflect the logged-out state
    //    This tells your App.tsx to switch back to the 'main' navbar (e.g., showing Sign In/Sign Up)
    setNavbarType("main");

    // 5. Navigate the user back to the sign-in or home page
    navigate("/"); // Navigate to the root, which should be your sign-in page based on App.tsx routes

    // 6. (Optional): If you passed an `onLogout` prop from a global context, call it here
    //    if (onLogout) {
    //      onLogout();
    //    }
  };

  return (
    <Container fluid className="bg-white shadow-sm px-0 w-100">
      <Navbar expand="lg" className="bg-white py-1 custom-container">
        <Container fluid>
          <Navbar.Brand
            href="/"
            className="d-flex justify-content-center align-items-start"
            style={{ cursor: "pointer" }}
            onClick={(e) => { // Use onClick handler to prevent full page reload if it's a link
                e.preventDefault(); // Prevent default link behavior
                navigate("/dashboard");
            }}
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

          {/* Mobile View Icons */}
          <div className="d-flex align-items-center ms-auto gap-2 d-lg-none">
            <Bell size={20} />

            <div
              ref={iconRef}
              onClick={() => setShowPopover(!showPopover)}
              style={{ cursor: "pointer" }}
            >
              <PersonCircle size={24} color="black" />
            </div>

            <Navbar.Toggle aria-controls="navbarResponsive" />
          </div>

          <Navbar.Collapse id="navbarResponsive">
            <Nav className="mx-auto gap-4 text-center">
              <Nav.Item>
                <Nav.Link as={NavLink} to="/dashboard">
                  Dashboard
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
                <Nav.Link as={NavLink} to="/orders">
                  Orders
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link as={NavLink} to="/about">
                  About
                </Nav.Link>
              </Nav.Item>
            </Nav>

            {/* Desktop View Icons */}
            <div className="d-none custom-margin-left2 d-lg-flex gap-3 align-items-center">
              <Bell size={20} />
              <div
                ref={iconRef}
                onClick={() => setShowPopover(!showPopover)}
                style={{ cursor: "pointer" }}
              >
                <PersonCircle size={24} color="black" />
              </div>
            </div>
          </Navbar.Collapse>

          {/* Logout Popover */}
          <Overlay
            target={iconRef.current}
            show={showPopover}
            placement="bottom-end"
            rootClose
            onHide={() => setShowPopover(false)}
          >
            <Popover id="popover-logout">
              <Popover.Body
                onClick={handleLogout}
                style={{ cursor: "pointer", padding: "10px 16px" }}
              >
                Logout
              </Popover.Body>
            </Popover>
          </Overlay>
        </Container>
      </Navbar>
    </Container>
  );
}

export default Custom_navbar2;