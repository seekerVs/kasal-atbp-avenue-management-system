// src/components/sidebar/Sidebar.tsx

import { useState, useEffect, useMemo } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  Navbar,
  Nav,
  Offcanvas,
  Container,
  Image,
} from "react-bootstrap";
import { BoxArrowRight } from "react-bootstrap-icons";
import { sidebarItems, NavItem } from "./sidebarItems";
import { SidebarNavItem } from "./SidebarNavItem"; 
import "./Sidebar.css";
import { Logo2 } from "../../assets/images";
import { dispatchAuthChangeEvent } from "../../services/authEvent";
import api from "../../services/api";
import { User } from "../../types"; 

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [showOffcanvas, setShowOffcanvas] = useState(false);
  const handleCloseOffcanvas = () => setShowOffcanvas(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const { data } = await api.get('/users/me');
        setCurrentUser(data);
      } catch (error) {
        console.error("Could not fetch current user in Sidebar:", error);
        // Handle error, maybe log out user if token is invalid
      }
    };
    fetchCurrentUser();
  }, []);


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

  useEffect(() => {
      const parent = findActiveParent(location.pathname);
      setOpenKey(parent);
      setActiveParent(parent);
  }, [location.pathname]);

  const visibleSidebarItems = useMemo((): NavItem[] => {
    if (!currentUser) {
      // If user data hasn't loaded yet, show nothing or a loading spinner's worth of items
      return []; 
    }

    if (currentUser.role === 'Super Admin') {
      // Super Admins see all items
      return sidebarItems;
    } else {
      // Standard users see all items EXCEPT 'Accounts'
      return sidebarItems.filter(item => item.title !== 'Accounts');
    }
  }, [currentUser]);

  const handleToggle = (key: string) => {
    setOpenKey(openKey === key ? null : key);
  };

  const handleSignOut = () => {
    handleCloseOffcanvas();
    localStorage.removeItem("authToken");
    dispatchAuthChangeEvent(); 
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
          {visibleSidebarItems.map((item) => (
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
          <div onClick={handleSignOut} className="nav-link-custom">
            <BoxArrowRight className="nav-icon" />
            <span>Sign Out</span>
          </div>
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
                {visibleSidebarItems.map((item) => (
                    <SidebarNavItem
                      key={`mobile-${item.title}`}
                      item={item}
                      openKey={openKey}
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