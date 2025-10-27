import React from 'react';

export default function Button({ children, loading, ...rest }) {
  return (
    <button
      disabled={loading || rest.disabled}
      {...rest}
      style={{
        padding: '10px 14px',
        borderRadius: 10,
        background: loading ? '#999' : '#111',
        color: '#fff',
        border: 'none',
        cursor: loading ? 'not-allowed' : 'pointer',
        width: '100%',
        ...rest.style
      }}
    >
      {loading ? 'Please wait…' : children}
    </button>
  );
}
