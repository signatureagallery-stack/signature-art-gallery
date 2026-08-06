// api/products.js — Liste les œuvres (GET) ou en supprime une (DELETE). Auth requise.
const { isValidSession } = require('./_auth');
const { githubListFiles, githubGetFile, githubDeleteFile } = require('./_github');

module.exports = async (req, res) => {
  if (!isValidSession(req)) {
    res.status(401).json({ error: 'Non connecté.' });
    return;
  }

  if (req.method === 'GET') {
    try {
      const files = await githubListFiles('content/products');
      const products = [];
      for (const f of files) {
        if (!f.name.endsWith('.json')) continue;
        const data = await githubGetFile(`content/products/${f.name}`);
        if (data) products.push(data);
      }
      products.sort((a, b) => (a.artist || '').localeCompare(b.artist || ''));
      res.status(200).json({ products });
    } catch (err) {
      res.status(500).json({ error: 'Erreur serveur : ' + err.message });
    }
    return;
  }

  if (req.method === 'DELETE') {
    let body = '';
    await new Promise((resolve) => {
      req.on('data', (chunk) => (body += chunk));
      req.on('end', resolve);
    });
    try {
      const { slug, image } = JSON.parse(body);
      if (!slug) {
        res.status(400).json({ error: 'slug manquant' });
        return;
      }
      await githubDeleteFile(`content/products/${slug}.json`, `Suppression œuvre : ${slug}`);
      if (image) {
        await githubDeleteFile(`assets/images/boutique/${image}`, `Suppression image : ${image}`);
      }
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: 'Erreur serveur : ' + err.message });
    }
    return;
  }

  res.status(405).json({ error: 'Méthode non autorisée' });
};
