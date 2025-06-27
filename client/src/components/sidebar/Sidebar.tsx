// src/components/sidebar/Sidebar.tsx

import { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  Collapse,
  Navbar,
  Nav,
  NavDropdown,
  Offcanvas,
  Container,
  Image,
} from "react-bootstrap";
import { BoxArrowRight, ChevronDown, Bootstrap } from "react-bootstrap-icons";
import { sidebarItems, NavItem } from "./sidebarItems";
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

  const findActiveParent = (pathname: string): string | null => {
    for (const item of sidebarItems) {
      if (item.subItems?.some((subItem) => subItem.path === pathname)) {
        return item.title;
      }
    }
    return null;
  };

  const [openKey, setOpenKey] = useState<string | null>(() =>
    findActiveParent(location.pathname)
  );

  const handleToggle = (key: string) => {
    setOpenKey(openKey === key ? null : key);
  };

  const handleSignOut = () => {
    handleCloseOffcanvas();
    localStorage.removeItem("authToken");
    setNavbarType("main");
    navigate("/signIn");
  };

  // --- RENDER FUNCTION FOR DESKTOP SIDEBAR (No changes here) ---
  const renderDesktopNavItem = (item: NavItem, index: number) => {
    if (item.title === "divider") {
      return <div key={`d-divider-${index}`} className="sidebar-divider"></div>;
    }
    const isCollapsible = item.subItems && item.subItems.length > 0;
    const isOpen = openKey === item.title;
    if (isCollapsible) {
      return (
        <div key={item.title}>
          <div
            className={`nav-link-custom collapsible-trigger ${
              isOpen ? "open" : ""
            }`}
            onClick={() => handleToggle(item.title)}
          >
            <item.icon className="nav-icon" />
            <span>{item.title}</span>
            <ChevronDown
              className={`chevron-icon ${isOpen ? "rotated" : ""}`}
            />
          </div>
          <Collapse in={isOpen}>
            <div className="sub-items-container">
              {item.subItems!.map((sub) => (
                <NavLink
                  key={sub.path}
                  to={sub.path}
                  className="nav-link-custom"
                >
                  <span>{sub.title}</span>
                </NavLink>
              ))}
            </div>
          </Collapse>
        </div>
      );
    }
    return (
      <NavLink key={item.title} to={item.path} className="nav-link-custom">
        <item.icon className="nav-icon" />
        <span>{item.title}</span>
      </NavLink>
    );
  };

  // --- RENDER FUNCTION FOR MOBILE OFFCANVAS ---
  const renderOffcanvasItem = (item: NavItem, index: number) => {
    if (item.title === "divider") {
      return <NavDropdown.Divider key={`m-divider-${index}`} />;
    }
    if (item.subItems && item.subItems.length > 0) {
      return (
        // Add the custom CSS class here for dropdowns
        <NavDropdown
          key={item.title}
          className="offcanvas-nav-link"
          title={
            <>
              <item.icon className="me-2" />
              {item.title}
            </>
          }
          id={`offcanvas-dd-${item.title}`}
        >
          {item.subItems.map((subItem) => (
            <NavDropdown.Item
              as={NavLink}
              to={subItem.path}
              key={subItem.path}
              onClick={handleCloseOffcanvas}
            >
              {subItem.title}
            </NavDropdown.Item>
          ))}
        </NavDropdown>
      );
    }
    return (
      // Add the custom CSS class here for regular links
      <Nav.Link
        as={NavLink}
        to={item.path}
        key={item.path}
        onClick={handleCloseOffcanvas}
        className="offcanvas-nav-link"
      >
        <item.icon className="me-2" />
        {item.title}
      </Nav.Link>
    );
  };

  return (
    <>
      {/* ===== DESKTOP SIDEBAR - No changes needed here ===== */}
      <nav className="sidebar d-none d-lg-flex">
        <div>
          <div className="sidebar-header fs-4">
            <Image
              src={Logo2}
              alt="Store image"
              width={60}
              height={60}
            />
            <span>Kasal Atbp Avenue Mgmt System</span>
          </div>
          {/* <div className="sidebar-divider"></div> */}
          {sidebarItems.map(renderDesktopNavItem)}
        </div>
        <div className="sidebar-footer">
          <div className="sidebar-divider"></div>
          <div className="nav-link-custom" onClick={handleSignOut}>
            <BoxArrowRight className="nav-icon" />
            <span>Sign Out</span>
          </div>
        </div>
      </nav>

      {/* ===== MOBILE NAVBAR - Keep the dark top bar ===== */}
      <Navbar
        expand={false}
        className="bg-primary d-lg-none"
        sticky="top"
        data-bs-theme="dark"
      >
        <Container fluid>
          <Navbar.Brand as={NavLink} to="/dashboard">
            Kasal Avenue
          </Navbar.Brand>
          <Navbar.Toggle
            aria-controls="offcanvasNavbar-responsive"
            onClick={() => setShowOffcanvas(true)}
          />

          {/* === THE MODIFIED OFFCANVAS SECTION === */}
          <Navbar.Offcanvas
            id="offcanvasNavbar-responsive"
            placement="end"
            // REMOVED: className="bg-primary" and data-bs-theme="dark"
            // This defaults it to a light theme (white background, dark text/buttons)
            show={showOffcanvas}
            onHide={handleCloseOffcanvas}
          >
            <Offcanvas.Header closeButton>
              <Offcanvas.Title>Menu</Offcanvas.Title>
            </Offcanvas.Header>
            <Offcanvas.Body>
              <Nav className="justify-content-end flex-grow-1 pe-3">
                {sidebarItems.map(renderOffcanvasItem)}
              </Nav>
              <hr />
              <Nav>
                {/* Add the custom class to the sign out link */}
                <Nav.Link
                  onClick={handleSignOut}
                  className="offcanvas-nav-link"
                >
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
