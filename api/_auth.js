// api/_auth.js — Vérification du mot de passe et de la session (aucun service tiers).
const crypto = require('crypto');

function sign(value, secret) {
  return crypto.createHmac('sha256', secret).update(value).digest('hex');
}

function makeSessionCookie() {
  const secret = process.env.SESSION_SECRET;
  const expiry = Date.now() + 1000 * 60 * 60 * 12; // 12h
  const value = String(expiry);
  const signature = sign(value, secret);
  const token = Buffer.from(`${value}.${signature}`).toString('base64');
  return `sag_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=43200`;
}

function isValidSession(req) {
  const secret = process.env.SESSION_SECRET;
  const cookies = req.headers.cookie || '';
  const match = cookies.match(/sag_session=([^;]+)/);
  if (!match) return false;
  try {
    const decoded = Buffer.from(match[1], 'base64').toString('utf-8');
    const [value, signature] = decoded.split('.');
    if (sign(value, secret) !== signature) return false;
    if (Date.now() > Number(value)) return false;
    return true;
  } catch {
    return false;
  }
}

module.exports = { makeSessionCookie, isValidSession };
