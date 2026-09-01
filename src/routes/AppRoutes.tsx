import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import RequireAuth from '../auth/RequireAuth';
import AdminLayout from '../components/layout/AdminLayout';

import AdminDashboard from '../pages/admin/AdminDashboard';
import TenantList from '../pages/admin/TenantList';
import UserList from '../pages/admin/UserList';
import MuleTransform from '../pages/admin/MuleTransform';
import Transactions from '../pages/admin/Transactions';
import AISettings from '../pages/admin/AISettings';
import Profile from '../pages/admin/Profile';
import JobsList from '../pages/admin/JobsList';

import ShopkeeperDashboard from '../pages/shopkeeper/ShopkeeperDashboard';

import CustomerDashboard from '../pages/customer/CustomerDashboard';
import Cart from '../pages/customer/Cart';
import Orders from '../pages/customer/Orders';

import LoginPage from '../pages/LoginPage';

const AppRoutes: React.FC = () => (
  <Routes>
    {/* Default redirect */}
    <Route path="/" element={<Navigate to="/login" replace />} />

    {/* Public */}
    <Route path="/login" element={<LoginPage />} />

    {/* Admin Routes with Layout */}
    <Route
      path="/admin"
      element={
        <RequireAuth roles={['ADMIN']}>
          <AdminLayout>
            <AdminDashboard />
          </AdminLayout>
        </RequireAuth>
      }
    />
    <Route
      path="/admin/tenants"
      element={
        <RequireAuth roles={['ADMIN']}>
          <AdminLayout>
            <TenantList />
          </AdminLayout>
        </RequireAuth>
      }
    />
    <Route
      path="/admin/users"
      element={
        <RequireAuth roles={['ADMIN']}>
          <AdminLayout>
            <UserList />
          </AdminLayout>
        </RequireAuth>
      }
    />
    <Route
      path="/admin/mule-transform"
      element={
        <RequireAuth roles={['ADMIN']}>
          <AdminLayout>
            <MuleTransform />
          </AdminLayout>
        </RequireAuth>
      }
    />
    <Route
      path="/admin/transactions"
      element={
        <RequireAuth roles={['ADMIN']}>
          <AdminLayout>
            <Transactions />
          </AdminLayout>
        </RequireAuth>
      }
    />
    <Route
      path="/admin/ai-settings"
      element={
        <RequireAuth roles={['ADMIN']}>
          <AdminLayout>
            <AISettings />
          </AdminLayout>
        </RequireAuth>
      }
    />
    <Route
      path="/admin/profile"
      element={
        <RequireAuth roles={['ADMIN']}>
          <AdminLayout>
            <Profile />
          </AdminLayout>
        </RequireAuth>
      }
    />
    <Route
      path="/admin/jobs"
      element={
        <RequireAuth roles={['ADMIN']}>
          <AdminLayout>
            <JobsList />
          </AdminLayout>
        </RequireAuth>
      }
    />

    {/* Shopkeeper */}
    <Route
      path="/shopkeeper"
      element={
        <RequireAuth roles={['SHOPKEEPER']}>
          <ShopkeeperDashboard />
        </RequireAuth>
      }
    />

    {/* Customer */}
    <Route
      path="/customer"
      element={
        <RequireAuth roles={['CUSTOMER']}>
          <CustomerDashboard />
        </RequireAuth>
      }
    />
    <Route
      path="/customer/cart"
      element={
        <RequireAuth roles={['CUSTOMER']}>
          <Cart />
        </RequireAuth>
      }
    />
    <Route
      path="/customer/orders"
      element={
        <RequireAuth roles={['CUSTOMER']}>
          <Orders />
        </RequireAuth>
      }
    />

    {/* Fallback */}
    <Route path="*" element={<h3>Page Not Found</h3>} />
  </Routes>
);

export default AppRoutes;
