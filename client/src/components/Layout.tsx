// client/src/components/Layout.tsx

import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import CustomNavbar1 from './customNavbar/CustomNavbar1';
import Sidebar from './sidebar/Sidebar';
import { AdminBar } from './adminBar/AdminBar.tsx'; // We will create this next
import { useAuth } from '../hooks/useAuth'; // We will create this next
import AlertContainer from './alerts/AlertContainer.tsx';

// These are the routes that are part of the admin dashboard's core UI
const ADMIN_CORE_ROUTES = [
  '/dashboard',
  '/new-rental',
  '/rentals', // Base for /rentals/:id
  '/singleRent',
  '/packageRent',
  '/customRent',
  '/inventoryItems',
  '/packageItems',
  '/manageRentals',
  '/contentManagement',
  '/accounts',
  '/settings',
  '/manage-reservations',
  '/reservations', // Base for /reservations/:id
  '/manage-appointments',
  '/appointments', // Base for /appointments/:id
];

export const Layout = () => {
  const { isAuthenticated, setIsAuthenticated } = useAuth();
  const location = useLocation();

  // Determine if the current path is a core admin-only page
  const isCoreAdminPage = ADMIN_CORE_ROUTES.some(route => location.pathname.startsWith(route));

  // We place it at the top level so its `position: fixed` style works correctly over all content.
  return (
    <>
      <AlertContainer />
      {(() => {
        if (!isAuthenticated) {
          // --- 1. USER IS LOGGED OUT ---
          return (
            <>
              <div className="custom-navbar-wrapper">
                <CustomNavbar1 />
              </div>
              <div className="unprotected-container">
                <Outlet />
              </div>
            </>
          );
        }

        // --- USER IS LOGGED IN ---
        if (isCoreAdminPage) {
          // --- 2. ADMIN IS ON A DASHBOARD PAGE ---
          return (
            <div className="d-lg-flex" style={{ minHeight: '100vh' }}>
              <Sidebar />
              <main className="main-content">
                <Outlet />
              </main>
            </div>
          );
        } else {
          // --- 3. ADMIN IS VIEWING A PUBLIC PAGE ---
          return (
            <>
              <AdminBar />
              <div className="custom-navbar-wrapper" style={{ top: '40px' }}> {/* Push down for AdminBar */}
                <CustomNavbar1 />
              </div>
              <div className="unprotected-container" style={{ marginTop: '110px' }}>
                <Outlet />
              </div>
            </>
          );
        }
      })()}
    </>
  );
};