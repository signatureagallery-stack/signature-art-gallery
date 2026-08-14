/**
 * gallery-data-adapter.js
 * ============================================================================
 * Étape 5 — Connexion des données Back-office au moteur Three.js.
 *
 * Ce module ne fait AUCUN rendu. Il transforme :
 *   - la bibliothèque d'œuvres (Partie 2 — content/artworks/*.json)
 *   - le placement 2D (Partie 3 — content/exhibitions/[slug]/placement.json)
 * en structures directement consommables par le moteur Three.js existant
 * (GalleryTwoRoomsPrototype.jsx), sans dupliquer ni réinventer :
 *   - l'identifiant stable de l'œuvre (artwork.id, jamais le titre) ;
 *   - l'ordre de visite (même comparateur que admin/placement.html) ;
 *   - le format room/wall (south/west/east/north) déjà utilisé par le
 *     placement 2D ET par le prototype Three.js (les deux utilisent déjà
 *     exactement le même vocabulaire — vérifié avant d'écrire ce fichier).
 *
 * Le placement n'est jamais réécrit ici (lecture seule).
 * ============================================================================
 */

// Constantes reprises TELLES QUELLES de admin/placement.html (Partie 3) —
// la scène 3D doit utiliser exactement la même échelle que l'éditeur dans
// lequel l'administratrice a placé les œuvres, sinon les positions ne
// correspondraient plus à ce qu'elle a validé visuellement.
const ROOM_ORDER = ['room1', 'room2'];
const WALL_ORDER = ['south', 'west', 'east', 'north'];
const LONG_WALL_M = 14;  // murs Ouest / Est (identique à placement.html)
const SHORT_WALL_M = 9;  // murs Sud / Nord (identique à placement.html)
const WALL_LENGTH_M = { south: SHORT_WALL_M, north: SHORT_WALL_M, west: LONG_WALL_M, east: LONG_WALL_M };

/**
 * Retrouve une œuvre par son identifiant stable (Partie 2). Ne se base
 * JAMAIS sur le titre. Retourne null si l'œuvre référencée par le
 * placement n'existe plus dans la bibliothèque (cas à signaler, jamais
 * à masquer silencieusement).
 */
function resolveArtwork(artworks, artworkId) {
  return artworks.find((a) => a.id === artworkId) || null;
}

/**
 * Même comparateur que admin/placement.html::computeVisitOrder — copié
 * à l'identique pour qu'il n'existe jamais un "deuxième ordre" divergent.
 */
function compareByVisitOrder(a, b) {
  const ra = ROOM_ORDER.indexOf(a.room), rb = ROOM_ORDER.indexOf(b.room);
  if (ra !== rb) return ra - rb;
  const wa = WALL_ORDER.indexOf(a.wall), wb = WALL_ORDER.indexOf(b.wall);
  if (wa !== wb) return wa - wb;
  return a.position_m - b.position_m;
}

/**
 * Regroupe les placements par salle/mur, résout chaque œuvre par son id
 * stable, et signale (sans planter) les placements orphelins (œuvre
 * supprimée de la bibliothèque après avoir été placée).
 *
 * Retour : { room1: { south:[], west:[], east:[], north:[] }, room2: {...} },
 * chaque entrée = { placement, artwork }, triée par position_m croissante.
 */
function buildWallContents(placements, artworks) {
  const grouped = {
    room1: { south: [], west: [], east: [], north: [] },
    room2: { south: [], west: [], east: [], north: [] },
  };
  const missing = [];

  const sorted = [...placements].sort(compareByVisitOrder);

  for (const p of sorted) {
    if (!grouped[p.room] || !grouped[p.room][p.wall]) continue; // room/wall invalide, ignoré proprement
    const artwork = resolveArtwork(artworks, p.artwork_id);
    if (!artwork) {
      missing.push(p.artwork_id);
      continue; // on ne bloque pas tout le chargement pour une référence orpheline
    }
    grouped[p.room][p.wall].push({ placement: p, artwork });
  }

  return { grouped, missing };
}

/**
 * Ordre de visite complet (toutes salles/murs confondus), pour Suivant/
 * Précédent — même principe que le panneau "Ordre de visite" déjà affiché
 * dans admin/placement.html, jamais recalculé différemment.
 */
function computeFullVisitOrder(placements, artworks) {
  const sorted = [...placements].sort(compareByVisitOrder);
  const steps = [];
  const missing = [];
  for (const p of sorted) {
    const artwork = resolveArtwork(artworks, p.artwork_id);
    if (!artwork) { missing.push(p.artwork_id); continue; }
    steps.push({ placement: p, artwork });
  }
  return { steps, missing };
}

/**
 * Dimensions réelles → mètres, en respectant la forme de l'œuvre.
 * NE SERT PLUS DIRECTEMENT AU RENDU 3D (voir getVirtualDimensionsMeters
 * ci-dessous) — reste disponible tel quel, les dimensions réelles ne sont
 * jamais remplacées ni supprimées.
 */
function getRealDimensionsMeters(artwork) {
  if (artwork.shape === 'ronde') {
    const d = (artwork.diameter_cm || 0) / 100;
    return { shape: 'ronde', diameterM: d, widthM: d, heightM: d };
  }
  return {
    shape: 'rectangulaire',
    widthM: (artwork.width_cm || 0) / 100,
    heightM: (artwork.height_cm || 0) / 100,
  };
}

// Tailles virtuelles Petit/Moyen/Grand — reprises telles quelles du
// prototype Three.js existant (GalleryTwoRoomsPrototype.jsx), jamais
// inventées ici.
const SIZE_SPECS = {
  petit: { w: 0.9, h: 1.2 },
  moyen: { w: 1.3, h: 1.7 },
  grand: { w: 1.7, h: 2.2 },
};

/**
 * Dimension utilisée pour l'AFFICHAGE dans Three.js. La catégorie
 * (petit/moyen/grand) est lue directement depuis artwork.category —
 * déjà calculée par la Partie 2 avec le barème officiel, jamais
 * recalculée ici (un seul système de classification dans tout le projet).
 *
 * Le ratio réel de l'œuvre est toujours conservé exactement : on ancre
 * la plus grande dimension réelle sur la plus grande dimension virtuelle
 * de sa catégorie, puis on dérive l'autre dimension par simple
 * proportionnalité — jamais en forçant le ratio propre à la catégorie.
 */
function getVirtualDimensionsMeters(artwork) {
  const category = artwork.category || 'moyen';
  const spec = SIZE_SPECS[category] || SIZE_SPECS.moyen;

  if (artwork.shape === 'ronde') {
    const d = spec.h; // cercle parfait par construction, une seule dimension
    return { shape: 'ronde', diameterM: d, widthM: d, heightM: d, category };
  }

  const realW = artwork.width_cm || 0;
  const realH = artwork.height_cm || 0;
  if (realW === 0 || realH === 0) {
    // Donnée réelle incomplète : repli sur la taille de catégorie brute
    // (signalé, jamais une invention silencieuse de dimensions réelles).
    return { shape: 'rectangulaire', widthM: spec.w, heightM: spec.h, category, incomplete: true };
  }

  const virtualMax = Math.max(spec.w, spec.h);
  const realMax = Math.max(realW, realH);
  const scaleFactor = virtualMax / realMax;

  return {
    shape: 'rectangulaire',
    widthM: realW * scaleFactor,
    heightM: realH * scaleFactor,
    category,
  };
}

/**
 * Recul caméra automatique pour les grands formats — reçoit maintenant
 * les dimensions VIRTUELLES (pas réelles), conformément à la demande.
 * Réutilise la formule déjà présente dans le prototype d'origine
 * (item.h / SIZE_SPECS.moyen.h) plutôt que REFERENCE_MOYEN_HEIGHT_M,
 * car elle compare des tailles virtuelles entre elles — exactement ce
 * dont on a besoin ici. REFERENCE_MOYEN_HEIGHT_M reste définie et
 * exportée, non supprimée.
 */
function cameraDistanceForArtwork(virtualDims, category, isMobile) {
  const base = isMobile ? 2.3 : 4.0;
  if (category !== 'grand') return base;
  const refHeight = virtualDims.shape === 'ronde' ? virtualDims.diameterM : virtualDims.heightM;
  const scale = refHeight / SIZE_SPECS.moyen.h;
  return base * scale;
}

// Conservée telle quelle (non supprimée) — utilisée historiquement pour
// le recul caméra avant l'introduction des dimensions virtuelles.
const REFERENCE_MOYEN_HEIGHT_M = 0.60;

module.exports = {
  ROOM_ORDER,
  WALL_ORDER,
  WALL_LENGTH_M,
  resolveArtwork,
  compareByVisitOrder,
  buildWallContents,
  computeFullVisitOrder,
  getRealDimensionsMeters,
  getVirtualDimensionsMeters,
  SIZE_SPECS,
  cameraDistanceForArtwork,
  REFERENCE_MOYEN_HEIGHT_M,
};
