import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function PublicOnlyRoute() {
  const { accessToken, booting } = useAuth();

  if (booting) return <div style={{ padding: 24 }}>Loading…</div>;
  if (accessToken) return <Navigate to="/" replace />; // already logged in

  return <Outlet />;
}
