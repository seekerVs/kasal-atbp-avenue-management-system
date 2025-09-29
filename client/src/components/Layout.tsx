// client/src/components/Layout.tsx

import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import CustomNavbar1 from './customNavbar/CustomNavbar1';
import Sidebar from './sidebar/Sidebar';
import { AdminBar } from './adminBar/AdminBar.tsx';
import { useAuth } from '../hooks/useAuth';
import AlertContainer from './alerts/AlertContainer.tsx';
import CustomFooter from './customFooter/CustomFooter';

const ADMIN_CORE_ROUTES = [
  '/dashboard',
  '/new-rental',
  '/rentals',
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
  '/reservations',
  '/manage-appointments',
  '/appointments',
  "/damaged-items",
];

export const Layout = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  const isCoreAdminPage = ADMIN_CORE_ROUTES.some(route => location.pathname.startsWith(route));

  const renderFooter = !isCoreAdminPage && (
    <footer className="bg-white text-dark py-3 border-top mt-3">
      <CustomFooter />
    </footer>
  );
  
  return (
    <>
      <AlertContainer />
      {(() => {
        if (!isAuthenticated) {
          // --- 1. USER IS LOGGED OUT ---
          return (
            <div className="d-flex flex-column" style={{ minHeight: '100vh' }}>
              <div className="custom-navbar-wrapper">
                <CustomNavbar1 />
              </div>
              <div className="unprotected-container">
                <Outlet />
              </div>
              {renderFooter}
            </div>
          );
        }

        // --- USER IS LOGGED IN ---
        if (isCoreAdminPage) {
          return (
            <div className="d-lg-flex " style={{ minHeight: '100vh' }}>
              <Sidebar />
              <main className="main-content">
                <Outlet />
              </main>
            </div>
          );
        } else {
          return (
            <div className="d-flex flex-column" style={{ minHeight: '100vh' }}>
              <AdminBar />
              <div className="custom-navbar-wrapper" style={{ top: '40px' }}>
                <CustomNavbar1 />
              </div>
              <div className="unprotected-container" style={{ marginTop: '110px' }}>
                <Outlet />
              </div>
              {renderFooter}
            </div>
          );
        }
      })()}
    </>
  );
};