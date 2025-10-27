// src/pages/Dashboard.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const orgs = user?.organizations || [];

  const card = {
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: 16,
    background: '#fff',
    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
  };
  const header = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 };
  const title = { fontSize: 16, fontWeight: 600 };
  const desc = { color: '#666', fontSize: 13, marginBottom: 12 };
  const linkRow = { display: 'flex', gap: 8, flexWrap: 'wrap' };
  const pill = {
    padding: '6px 10px',
    border: '1px solid #e5e7eb',
    borderRadius: 999,
    fontSize: 13,
    textDecoration: 'none',
    color: '#111',
    background: '#f9fafb',
  };

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>Dashboard</h1>

      <div
        style={{
          display: 'grid',
          gap: 16,
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          marginTop: 16,
        }}
      >
        {/* Catalog */}
        <div style={card}>
          <div style={header}>
            <div style={title}>Catalog</div>
            <Link to="/catalog" style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none' }}>
              View all →
            </Link>
          </div>
          <div style={desc}>Create and manage products, subscriptions, services, and plain prices.</div>
          <div style={linkRow}>
            <Link to="/catalog/new/product" style={pill}>New Product</Link>
            <Link to="/catalog/new/subscription" style={pill}>New Subscription</Link>
            <Link to="/catalog/new/service" style={pill}>New Service</Link>
            <Link to="/catalog/new/plain" style={pill}>New Plain Price</Link>
          </div>
        </div>

        {/* Additions */}
        <div style={card}>
          <div style={header}>
            <div style={title}>Additions</div>
            <Link to="/additions" style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none' }}>
              View all →
            </Link>
          </div>
          <div style={desc}>Configure discounts, and taxes/fees used in payment links.</div>
          <div style={linkRow}>
            <Link to="/additions/new/discount" style={pill}>New Discount</Link>
            <Link to="/additions/new/taxfee" style={pill}>New Tax/Fee</Link>
            <Link to="/additions/new/promotion" style={pill}>New Promotion</Link>
          </div>
        </div>

        {/* Pages */}
        <div style={card}>
          <div style={header}>
            <div style={title}>Pages</div>
            <Link
              to="/pages"
              style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none' }}
            >
              View all →
            </Link>
          </div>

          <div style={desc}>
            Create public payment pages that include catalog items and additions.
          </div>

          <div style={linkRow}>
            <Link to="/pages/new" style={pill}>New Page</Link>
            <Link to="/pages" style={pill}>View Pages</Link>
          </div>
        </div>

        {/* Transactions */}
        <div style={card}>
          <div style={header}>
            <div style={title}>Transactions</div>
            <Link to="/transactions" style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none' }}>
              View all →
            </Link>
          </div>
          <div style={desc}>Search, filter, and review payments created from your pages.</div>
          <div style={linkRow}>
            <Link to="/transactions" style={pill}>View Transactions</Link>
          </div>
        </div>

        {/* Emails */}
        <div style={card}>
          <div style={header}>
            <div style={title}>Emails</div>
            <Link to="/emails/outbox" style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none' }}>
              View all →
            </Link>
          </div>
          <div style={desc}>Manage reusable templates and review sent/failed emails.</div>
          <div style={linkRow}>
            <Link to="/emails/templates" style={pill}>Templates</Link>
            <Link to="/emails/templates/new" style={pill}>New Template</Link>
            <Link to="/emails/outbox" style={pill}>Outbox</Link>
          </div>
        </div>

        {/* Design */}
        <div style={card}>
          <div style={header}>
            <div style={title}>Design</div>
            <Link to="/" style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none' }}>
              View all →
            </Link>
          </div>
          <div style={desc}>List and create design templates for your pages and emails.</div>
          <div style={linkRow}>
            <Link to="/" style={pill}>View Templates</Link>
            <Link to="/" style={pill}>New Template</Link>
          </div>
        </div>

        {/* Widgets */}
        <div style={card}>
          <div style={header}>
            <div style={title}>Widgets</div>
            <Link to="/" style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none' }}>
              View all →
            </Link>
          </div>
          <div style={desc}>Manage and embed reusable widgets across your applications.</div>
          <div style={linkRow}>
            <Link to="/" style={pill}>List Widgets</Link>
          </div>
        </div>

        {/* AI Widget */}
        <div style={card}>
          <div style={header}>
            <div style={title}>AI Assistant</div>
          </div>
          <div style={desc}>
            Chat with the AI to manage your pages and catalog.
          </div>
          <div
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: 12,
              background: '#f9fafb',
              height: 160,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                fontSize: 13,
                color: '#444',
                marginBottom: 8,
              }}
            >
              👋 Hi! I’m your AI assistant. How can I help manage your pages or catalog today?
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="Ask the AI..."
                style={{
                  flex: 1,
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  padding: '6px 8px',
                  fontSize: 13,
                }}
              />
              <button
                style={{
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  padding: '6px 10px',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
