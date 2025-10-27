import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

import Header from '../components/Header';

/**
 * RequireOrg gates routes that need an active organization.
 * Use it *inside* ProtectedRoute.
 */
export default function RequireOrg() {
  const location = useLocation();
  const { booting, activeOrgId } = useAuth();

  // 1) While auth is booting, render nothing (no flicker / no premature redirects)
  if (booting) return null;

  // If there is no active organization, force org creation.
  if (!activeOrgId) {
    return <Navigate to="/org/create" replace state={{ from: location }} />;
  }

  // Otherwise, allow nested routes to render.
  return (
    <>
      <Header />
      <Outlet />
    </>
  );
}
