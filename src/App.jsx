import React from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';

import AdminHome from './component/AdminHome';
import Introduction from './component/Introduction';
import Login from './component/Login';
import Signup from './component/Signup';
import UserHome from './component/UserHome';
import { getSession } from './lib/session';
import './App.css';

function isAdminRole(role) {
  return role === 'admin' || role === 'super_admin';
}

function RequireRole({ role, children }) {
  const user = getSession();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if ((role === 'admin' && !isAdminRole(user.role)) || (role !== 'admin' && user.role !== role)) {
    return <Navigate to={isAdminRole(user.role) ? '/admin' : '/home'} replace />;
  }

  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Introduction />} path="/" />
        <Route element={<Login />} path="/login" />
        <Route element={<Signup />} path="/signup" />
        <Route
          element={
            <RequireRole role="user">
              <UserHome />
            </RequireRole>
          }
          path="/home"
        />
        <Route
          element={
            <RequireRole role="admin">
              <AdminHome />
            </RequireRole>
          }
          path="/admin"
        />
        <Route element={<Navigate to="/" replace />} path="*" />
      </Routes>
    </Router>
  );
}

export default App;
