import React from 'react';

export default function ErrorText({ children }) {
  if (!children) return null;
  return <div style={{ color: 'crimson', marginTop: 10, fontSize: 14 }}>{children}</div>;
}
