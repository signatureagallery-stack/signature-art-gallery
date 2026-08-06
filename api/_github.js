// api/_github.js — Publie un fichier sur GitHub via l'API Contents (pas d'OAuth, un seul jeton serveur).
async function githubPutFile(path, contentBase64, message) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO; // ex: "signatureagallery-stack/signature-art-gallery"
  const branch = process.env.GITHUB_BRANCH || 'main';

  const url = `https://api.github.com/repos/${repo}/contents/${path}`;

  // Vérifie si le fichier existe déjà (nécessaire pour le modifier/supprimer proprement)
  let sha;
  const existing = await fetch(url + `?ref=${branch}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  });
  if (existing.status === 200) {
    const data = await existing.json();
    sha = data.sha;
  }

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      content: contentBase64,
      branch,
      ...(sha ? { sha } : {}),
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`GitHub API (${response.status}) : ${err}`);
  }
  return response.json();
}

async function githubDeleteFile(path, message) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;

  const existing = await fetch(url + `?ref=${branch}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  });
  if (existing.status !== 200) return; // déjà absent
  const data = await existing.json();

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, sha: data.sha, branch }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`GitHub API (${response.status}) : ${err}`);
  }
}

async function githubListFiles(dirPath) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';
  const url = `https://api.github.com/repos/${repo}/contents/${dirPath}?ref=${branch}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  });
  if (!response.ok) return [];
  return response.json();
}

async function githubGetFile(path) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';
  const url = `https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  });
  if (!response.ok) return null;
  const data = await response.json();
  const content = Buffer.from(data.content, 'base64').toString('utf-8');
  return JSON.parse(content);
}

module.exports = { githubPutFile, githubDeleteFile, githubListFiles, githubGetFile };
