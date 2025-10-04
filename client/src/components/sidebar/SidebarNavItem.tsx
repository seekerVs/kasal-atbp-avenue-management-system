// src/components/sidebar/SidebarNavItem.tsx

import { NavLink } from "react-router-dom";
import { Collapse, Nav, NavDropdown } from "react-bootstrap";
import { ChevronDown } from "react-bootstrap-icons";
import { NavItem } from "./sidebarItems"; // We'll update sidebarItems next

interface SidebarNavItemProps {
  item: NavItem;
  openKey: string | null;
  activeParent: string | null;
  isMobile: boolean;
  onToggle: (key: string) => void;
  onCloseOffcanvas?: () => void; // Optional: only for mobile
}

export function SidebarNavItem({ item, openKey, activeParent, isMobile, onToggle, onCloseOffcanvas }: SidebarNavItemProps) {
  if (item.title === "divider") {
    return isMobile ? <NavDropdown.Divider /> : <div className="sidebar-divider" />;
  }

  const isCollapsible = item.subItems && item.subItems.length > 0;
  const isOpen = openKey === item.title;
  const isParentActive = activeParent === item.title;

  // --- RENDER LOGIC FOR MOBILE (Offcanvas) ---
  if (isMobile) {
    if (isCollapsible) {
      return (
        <NavDropdown
          className="offcanvas-nav-link"
          title={<><item.icon className="me-2" /> {item.title}</>}
          id={`offcanvas-dd-${item.title}`}
        >
          {item.subItems!.map((sub) => (
            <NavDropdown.Item as={NavLink} to={sub.path} key={sub.path} onClick={onCloseOffcanvas}>
              {sub.title}
            </NavDropdown.Item>
          ))}
        </NavDropdown>
      );
    }
    return (
      <Nav.Link as={NavLink} to={item.path} onClick={onCloseOffcanvas} className="offcanvas-nav-link">
        <item.icon className="me-2" />
        {item.title}
      </Nav.Link>
    );
  }

  // --- RENDER LOGIC FOR DESKTOP ---
  if (isCollapsible) {
    return (
      <div>
        <div
          className={`nav-link-custom collapsible-trigger ${isOpen ? "open" : ""} ${isParentActive ? "active-parent" : ""}`}
          onClick={() => onToggle(item.title)}
        >
          <item.icon className="nav-icon" />
          <span>{item.title}</span>
          <ChevronDown className={`chevron-icon ${isOpen ? "rotated" : ""}`} />
        </div>
        <Collapse in={isOpen}>
          <div className="sub-items-container">
            {item.subItems!.map((sub) => (
                <NavLink key={sub.path} to={sub.path} className="nav-link-custom sub-item">
                {/* The span is now inside a div that provides the indentation */}
                <div className="sub-item-content">
                    <span>{sub.title}</span>
                </div>
                </NavLink>
            ))}
            </div>
        </Collapse>
      </div>
    );
  }

  return (
    <NavLink to={item.path} className="nav-link-custom">
      <item.icon className="nav-icon" />
      <span>{item.title}</span>
    </NavLink>
  );
}