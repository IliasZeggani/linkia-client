import React from 'react';

export default function FormInput({
  label, type = 'text', value, onChange, placeholder,
  error, name, autoComplete, ...rest
}) {
  return (
    <div style={{ marginTop: 12 }}>
      {label && <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>{label}</label>}
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: 8,
          border: `1px solid ${error ? 'crimson' : '#dcdcdc'}`,
          outline: 'none'
        }}
        {...rest}
      />
      {error && <div style={{ color: 'crimson', fontSize: 12, marginTop: 6 }}>{error}</div>}
    </div>
  );
}
