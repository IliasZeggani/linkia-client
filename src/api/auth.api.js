import http from './http';

export const checkEmail = (email) =>
  http.get('/auth/check-email', { params: { email } }).then(r => r.data);

export const register = (payload) =>
  http.post('/auth/register', payload).then(r => r.data);

// NEW activation endpoints
export const activationCheck = (token) =>
  http.get('/auth/activation/check', { params: { token } }).then(r => r.data);

export const activationComplete = ({ token, password, rememberMe }) =>
  http.post('/auth/activation/complete', { token, password, rememberMe }).then(r => r.data);

// Forgot flow (we'll wire later, just exposing now)
export const forgotStart = (email) =>
  http.post('/auth/forgot/start', { email }).then(r => r.data);

export const forgotVerify = (email, code) =>
  http.post('/auth/forgot/verify', { email, code }).then(r => r.data);

export const forgotComplete = (resetToken, newPassword) =>
  http.post('/auth/forgot/complete', { reset_token: resetToken, newPassword }).then(r => r.data);