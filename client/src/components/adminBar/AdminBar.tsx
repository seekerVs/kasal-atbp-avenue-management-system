// client/src/components/adminBar/AdminBar.tsx

import React from 'react';
import { Container, Nav } from 'react-bootstrap';
import { NavLink, useNavigate } from 'react-router-dom';
import { Speedometer2, BoxArrowRight } from 'react-bootstrap-icons';
import './adminBar.css';
import { dispatchAuthChangeEvent } from '../../services/authEvent';

export const AdminBar = () => {
  const navigate = useNavigate();

  const handleSignOut = () => {
    localStorage.removeItem('authToken');
    dispatchAuthChangeEvent(); 
    navigate('/signIn');
  };

  return (
    <div className="admin-bar">
      <Container fluid className="d-flex justify-content-between align-items-center h-100">
        <div className="admin-bar-info">
          Viewing site as Admin
        </div>
        <Nav className="flex-row">
          <Nav.Link as={NavLink} to="/dashboard" className="admin-bar-link">
            <Speedometer2 className="me-2" />
            Back to Dashboard
          </Nav.Link>
          <Nav.Link onClick={handleSignOut} className="admin-bar-link">
            <BoxArrowRight className="me-2" />
            Sign Out
          </Nav.Link>
        </Nav>
      </Container>
    </div>
  );
};