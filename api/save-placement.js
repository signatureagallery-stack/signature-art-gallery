// api/save-placement.js — Enregistre le placement mural d'une exposition (POST, JSON).
// Auth requise. Réutilise githubPutFile (même mécanisme que le reste du
// projet). Placement libre : chaque entrée porte une position continue
// (position_m) sur un mur donné — aucun slot_id, aucune capacité maximale
// imposée par ce endpoint ni par aucun autre code du projet.
const { isValidSession } = require('./_auth');
const { githubPutFile } = require('./_github');

const VALID_ROOMS = ['room1', 'room2'];
const VALID_WALLS = ['south', 'west', 'east', 'north'];

module.exports = async (req, res) => {
  if (!isValidSession(req)) {
    res.status(401).json({ error: 'Non connecté.' });
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }

  let body = '';
  await new Promise((resolve) => {
    req.on('data', (chunk) => (body += chunk));
    req.on('end', resolve);
  });

  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    res.status(400).json({ error: 'Requête invalide (JSON attendu).' });
    return;
  }

  const { slug, placements } = payload;
  if (!slug) {
    res.status(400).json({ error: 'slug manquant.' });
    return;
  }
  if (!Array.isArray(placements)) {
    res.status(400).json({ error: 'placements doit être un tableau.' });
    return;
  }

  for (const p of placements) {
    if (!p.artwork_id || !VALID_ROOMS.includes(p.room) || !VALID_WALLS.includes(p.wall) || typeof p.position_m !== 'number') {
      res.status(400).json({ error: 'Entrée de placement invalide (artwork_id, room, wall, position_m requis).' });
      return;
    }
  }

  try {
    const data = { exhibition_slug: slug, placements };
    await githubPutFile(
      `content/exhibitions/${slug}/placement.json`,
      Buffer.from(JSON.stringify(data, null, 2)).toString('base64'),
      `Mise à jour placement : ${slug}`
    );
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur : ' + err.message });
  }
};
