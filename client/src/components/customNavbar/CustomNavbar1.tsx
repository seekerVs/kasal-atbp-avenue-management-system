// In CustomNavbar1.tsx

import { Container, Nav, Navbar, Button } from "react-bootstrap";
import { NavLink, useNavigate } from "react-router-dom";
import "./customNavbar.css";
import { Logo } from "../../assets/images";

// --- Improvement #2: Create a reusable component for the Sign In button ---
const SignInButton = ({ size }: { size?: "sm" | "lg" }) => {
  return (
    // Use `as={NavLink}` to let the button handle its own active state.
    // `end` prop ensures it's only active for the exact path "/signIn".
    <Button
      as={NavLink as any}
      to="/signIn"
      end
      variant="primary"
      size={size}
      className="nav-signin-button" // Add a class for styling active state
    >
      Sign In
    </Button>
  );
};


function Custom_navbar1() {
  const navigate = useNavigate();
  // --- Improvement #1: Remove `activeButton` state and `useEffect` ---
  // const location = useLocation();
  // const [activeButton, setActiveButton] = useState<"signin" | null>(null);
  // useEffect(...);

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
            {/* The main navigation links */}
            <Nav className="mx-auto gap-lg-4 text-center">
              <Nav.Link as={NavLink} to="/" end>
                Home
              </Nav.Link>
              <Nav.Link as={NavLink} to="/services">
                Services
              </Nav.Link>
              <Nav.Link as={NavLink} to="/products">
                Products
              </Nav.Link>
              <Nav.Link as={NavLink} to="/about">
                About
              </Nav.Link>
            </Nav>

            {/* --- Use the new reusable button component --- */}
            {/* Mobile Sign In button */}
            <div className="d-lg-none mt-3 mt-lg-0 text-center">
              <SignInButton size="sm" />
            </div>

            {/* Desktop Sign In button */}
            <div className="d-none d-lg-flex align-items-center ms-lg-auto">
              <SignInButton size="lg" />
            </div>

          </Navbar.Collapse>
        </Container>
      </Navbar>
    </Container>
  );
}

export default Custom_navbar1;