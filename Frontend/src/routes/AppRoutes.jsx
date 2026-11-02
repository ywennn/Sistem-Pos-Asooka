import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "../stores/useAuthStore";
import CustomerDisplay from "../features/display/DisplayCusttomer";

// Protected Route Component
function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/pos" replace />;
  }

  return children;
}

export default function AppRoutes() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <Routes>
      {/* <Route path="/login" element={<LoginPage />} /> */}
      <Route path="/display" element={<CustomerDisplay />} />
      {/* Route Tablet Kasir */}

      {/* Route Admin Dashboard */}

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/display" replace />} />
    </Routes>
  );
}
