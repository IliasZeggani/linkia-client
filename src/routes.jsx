import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import RequireOrg from './auth/RequireOrg';
import PublicOnlyRoute from './auth/PublicOnlyRoute';
import ProtectedRoute from './auth/ProtectedRoute';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ConfirmEmail from './pages/auth/Confirm';

import ForgotPassword from './pages/auth/ForgotPassword';

import Profile from './pages/me/Profile';
import ChangePassword from './pages/me/ChangePassword';

import OrgCreate from './pages/org/OrgCreate';
import OrgList from './pages/org/OrgList';

import Dashboard from './pages/Dashboard';

import CatalogList from './pages/catalog/CatalogList';
import CatalogItemEdit from './pages/catalog/CatalogItemEdit';

import ProductForm from './pages/catalog/ProductForm';
import SubscriptionForm from './pages/catalog/SubscriptionForm';
import ServiceForm from './pages/catalog/ServiceForm';
import PlainPriceForm from './pages/catalog/PlainPriceForm';

import AdditionList from './pages/additions/AdditionList';
import AdditionItemEdit from './pages/additions/AdditionItemEdit';

import DiscountForm from './pages/additions/DiscountForm';
import TaxFeeForm from './pages/additions/TaxFeeForm';
import PromotionForm from './pages/additions/PromotionForm';

import PageList from './pages/pages/PageList';
import PageCreate from './pages/pages/PageCreate';
import PageEdit from './pages/pages/PageEdit';
import PublicPage from './pages/pages/PublicPage';

import TransactionsList from './pages/transactions/TransactionList';
import TransactionDetails from './pages/transactions/TransactionDetails';

import EmailTemplatesList from './pages/emails/EmailTemplatesList';
import EmailTemplateForm from './pages/emails/EmailTemplateForm';
import EmailOutboxList from './pages/emails/EmailOutboxList';
import EmailOutboxDetails from './pages/emails/EmailOutboxDetails';

export default function AppRoutes() {
  return (
    <Routes>

      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<Login />} />

        {/* Register */}
        <Route path="/register" element={<Register />} />
        <Route path="/confirm" element={<ConfirmEmail />} />

        {/* Forgot */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/me" element={<Profile />} />
        <Route path="/me/password" element={<ChangePassword />} />
        <Route path="/org/create" element={<OrgCreate />} />
        <Route path="/org" element={<OrgList />} />

        <Route element={<RequireOrg />}>

          <Route path="/" element={<Dashboard />} />

          <Route path="/catalog" element={<CatalogList />} />
          <Route path="/catalog/:id/edit" element={<CatalogItemEdit />} />
          <Route path="/catalog/new/product" element={<ProductForm />} />
          <Route path="/catalog/new/subscription" element={<SubscriptionForm />} />
          <Route path="/catalog/new/service" element={<ServiceForm />} />
          <Route path="/catalog/new/plain" element={<PlainPriceForm />} />


          <Route path="/additions" element={<AdditionList />} />
          <Route path="/additions/:id/edit" element={<AdditionItemEdit />} />
          <Route path="/additions/new/discount" element={<DiscountForm />} />
          <Route path="/additions/new/taxfee" element={<TaxFeeForm />} />
          <Route path="/additions/new/promotion" element={<PromotionForm />} />

          <Route path="/pages" element={<PageList />} />
          <Route path="/pages/new" element={<PageCreate />} />
          <Route path="/pages/:id/edit" element={<PageEdit />} />

          <Route path="/transactions" element={<TransactionsList />} />
          <Route path="/transactions/:id" element={<TransactionDetails />} />

          <Route path="/emails/templates" element={<EmailTemplatesList />} />
          <Route path="/emails/templates/new" element={<EmailTemplateForm />} />
          <Route path="/emails/templates/:id" element={<EmailTemplateForm />} />
          <Route path="/emails/outbox" element={<EmailOutboxList />} />
          <Route path="/emails/outbox/:id" element={<EmailOutboxDetails />} />

        </Route>

      </Route>

      <Route path="/:code" element={<PublicPage />} />

      <Route path="*" element={<div style={{ padding: 24 }}>Not found</div>} />
    </Routes>
  );
}
