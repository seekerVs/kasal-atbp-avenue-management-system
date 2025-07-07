// src/components/sidebar/Sidebar.tsx

import { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  Navbar,
  Nav,
  Offcanvas,
  Container,
  Image,
  Dropdown,
} from "react-bootstrap";
import { BoxArrowRight, PersonCircle, GearFill, ChevronDown } from "react-bootstrap-icons";
import { sidebarItems } from "./sidebarItems";
import { SidebarNavItem } from "./SidebarNavItem"; // Import the new component
import "./Sidebar.css";
import { Logo2 } from "../../assets/images";

interface SidebarProps {
  setNavbarType: (type: "main" | "alt") => void;
}

function Sidebar({ setNavbarType }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const [showOffcanvas, setShowOffcanvas] = useState(false);
  const handleCloseOffcanvas = () => setShowOffcanvas(false);

  // --- REVISED: State management for active items ---
  const findActiveParent = (pathname: string): string | null => {
    for (const item of sidebarItems) {
      if (item.subItems?.some((sub) => sub.path === pathname)) {
        return item.title;
      }
    }
    return null;
  };

  const [openKey, setOpenKey] = useState<string | null>(() => findActiveParent(location.pathname));
  const [activeParent, setActiveParent] = useState<string | null>(() => findActiveParent(location.pathname));
  
  // NEW: Effect to keep the correct menu open when navigating
  useEffect(() => {
      const parent = findActiveParent(location.pathname);
      setOpenKey(parent);
      setActiveParent(parent);
  }, [location.pathname]);

  const handleToggle = (key: string) => {
    setOpenKey(openKey === key ? null : key);
  };

  const handleSignOut = () => {
    handleCloseOffcanvas();
    localStorage.removeItem("authToken");
    setNavbarType("main");
    navigate("/signIn");
  };

  return (
    <>
      {/* ===== DESKTOP SIDEBAR (Now much cleaner) ===== */}
      <nav className="sidebar d-none d-lg-flex">
        {/* Header is now a direct child */}
        <div className="sidebar-header fs-4">
          <Image src={Logo2} alt="Store image" width={60} height={60} />
          <span>Kasal Atbp Avenue Mgmt System</span>
        </div>

        {/* Scrolling content area is now a direct child */}
        <div className="sidebar-scroll-area" style={{ flexGrow: 1, overflowY: 'auto' }}>
          {sidebarItems.map((item) => (
            <SidebarNavItem
              key={item.title}
              item={item}
              openKey={openKey}
              activeParent={activeParent}
              isMobile={false}
              onToggle={handleToggle}
            />
          ))}
        </div>

        {/* Footer is now a direct child */}
        <div className="sidebar-footer">
          <div className="sidebar-divider"></div>
          <Dropdown drop="up" className="profile-dropdown">
            <Dropdown.Toggle as="div" className="nav-link-custom">
              <PersonCircle className="nav-icon" />
              <span>My Profile</span>
              <ChevronDown className="chevron-icon" />
            </Dropdown.Toggle>
            <Dropdown.Menu variant="dark">
              <Dropdown.Item onClick={() => navigate('/settings')}>
                <GearFill className="me-2"/> Settings
              </Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item onClick={handleSignOut}>
                <BoxArrowRight className="me-2"/> Sign Out
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>
      </nav>
      {/* ===== MOBILE NAVBAR & OFFCANVAS (Now much cleaner) ===== */}
      <Navbar expand={false} className="bg-primary d-lg-none" sticky="top" data-bs-theme="dark">
        <Container fluid>
          <Navbar.Brand as={NavLink} to="/dashboard">Kasal Avenue</Navbar.Brand>
          <Navbar.Toggle aria-controls="offcanvasNavbar-responsive" onClick={() => setShowOffcanvas(true)} />
          <Navbar.Offcanvas id="offcanvasNavbar-responsive" placement="end" show={showOffcanvas} onHide={handleCloseOffcanvas}>
            <Offcanvas.Header closeButton>
              <Offcanvas.Title>Menu</Offcanvas.Title>
            </Offcanvas.Header>
            <Offcanvas.Body>
              <Nav className="justify-content-end flex-grow-1 pe-3">
                {sidebarItems.map((item) => (
                    <SidebarNavItem
                      key={`mobile-${item.title}`}
                      item={item}
                      openKey={openKey} // Not used on mobile but required by prop
                      activeParent={activeParent}
                      isMobile={true}
                      onToggle={handleToggle}
                      onCloseOffcanvas={handleCloseOffcanvas}
                    />
                ))}
              </Nav>
              <hr />
              <Nav>
                <Nav.Link onClick={handleSignOut} className="offcanvas-nav-link">
                  <BoxArrowRight className="me-2" />
                  Sign Out
                </Nav.Link>
              </Nav>
            </Offcanvas.Body>
          </Navbar.Offcanvas>
        </Container>
      </Navbar>
    </>
  );
}

export default Sidebar;