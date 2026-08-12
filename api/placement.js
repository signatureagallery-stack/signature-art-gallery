// api/placement.js — Charge le placement mural d'une exposition (GET).
// Auth requise. Retourne un placement vide si aucun n'existe encore
// (exposition pas encore aménagée).
const { isValidSession } = require('./_auth');
const { githubGetFile } = require('./_github');

module.exports = async (req, res) => {
  if (!isValidSession(req)) {
    res.status(401).json({ error: 'Non connecté.' });
    return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }

  const slug = req.query && req.query.slug;
  if (!slug) {
    res.status(400).json({ error: 'Paramètre slug manquant.' });
    return;
  }

  try {
    const data = await githubGetFile(`content/exhibitions/${slug}/placement.json`);
    res.status(200).json(data || { exhibition_slug: slug, placements: [] });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur : ' + err.message });
  }
};
