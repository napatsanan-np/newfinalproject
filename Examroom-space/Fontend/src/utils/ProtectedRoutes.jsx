import React from "react";
import { Navigate } from "react-router-dom";

// Check if the user is authenticated


// Higher-order component to protect routes
const ProtectedRoute = ({ element }) => {
  const isAuthenticated = () => !!localStorage.getItem('token');
  return isAuthenticated() ? element : <Navigate to="/" />;
};

export default ProtectedRoute;
