// api/login.js — Vérifie le mot de passe et ouvre une session de 12h.
const { makeSessionCookie } = require('./_auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }

  let body = '';
  await new Promise((resolve) => {
    req.on('data', (chunk) => (body += chunk));
    req.on('end', resolve);
  });

  let password = '';
  try {
    password = JSON.parse(body).password || '';
  } catch {
    res.status(400).json({ error: 'Requête invalide' });
    return;
  }

  if (password !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: 'Mot de passe incorrect' });
    return;
  }

  res.setHeader('Set-Cookie', makeSessionCookie());
  res.status(200).json({ ok: true });
};
