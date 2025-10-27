export const isEmail = (v) => /^\S+@\S+\.\S+$/.test(String(v || '').trim());
export const notEmpty = (v) => String(v || '').trim().length > 0;
