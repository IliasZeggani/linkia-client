import React from 'react';

export default function Loader({ text = 'Loading…' }) {
  return <div style={{ padding: 24, opacity: 0.8 }}>{text}</div>;
}
