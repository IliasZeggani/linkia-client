import http from './http';

export const getMe = () => http.get('/me');
export const updateMe = (payload) => http.patch('/me', payload);
// payload e.g.: { fullName, birthday }

export const changePassword = (currentPassword, newPassword) =>
  http.patch('/me/password', { currentPassword, newPassword });
