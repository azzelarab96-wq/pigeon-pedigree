/**
 * script.js - Logique d'importation et d'extraction de pedigrees de pigeons
 * 
 * Fonctionnalités :
 * 1. Compression côté client (max 1 Mo, max 1600px) pour éviter les erreurs de stream 502 sur Firefox et Mobile.
 * 2. Envoi direct vers Cloudflare Worker (ou API locale en secours).
 * 3. Réception du JSON complet (G0, parents, grands-parents, arrière-grands-parents, détails, palmarès).
 * 4. Remplissage automatique du formulaire de vérification et surlignage des champs requis.
 */

// URL par défaut du Cloudflare Worker (configurable via localStorage ou champ input)
const DEFAULT_WORKER_URL = localStorage.getItem('CF_WORKER_PEDIGREE_URL') || '/api/extract-pedigree';

// Configuration de compression selon le cahier des charges
const COMPRESSION_OPTIONS = {
  maxSizeMB: 1.0,           // Taille max 1 Mo
  maxWidthOrHeight: 1600,   // Dimensions max 1600px
  useWebWorker: true,
  fileType: 'image/jpeg',
  initialQuality: 0.85,
};

/**
 * Compresse une image avant tout upload
 */
async function compressImageFile(file) {
  // Si c'est un PDF, pas de compression image directe (envoi direct)
  if (file.type === 'application/pdf') {
    return file;
  }

  // Si la bibliothèque browser-image-compression est chargée
  if (typeof imageCompression !== 'undefined') {
    try {
      console.log(`[Compression] Fichier original : ${(file.size / 1024 / 1024).toFixed(2)} Mo`);
      const compressedFile = await imageCompression(file, COMPRESSION_OPTIONS);
      console.log(`[Compression] Fichier compressé : ${(compressedFile.size / 1024 / 1024).toFixed(2)} Mo`);
      return compressedFile;
    } catch (error) {
      console.warn('[Compression] Échec browser-image-compression, fallback Canvas manuel :', error);
    }
  }

  // Fallback universel HTML5 Canvas (compatible 100% Firefox, iOS Safari, Android)
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        const maxDim = 1600;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
                  type: 'image/jpeg',
                });
                resolve(newFile);
                return;
              }
              resolve(file);
            },
            'image/jpeg',
            0.85
          );
          return;
        }
        resolve(file);
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

/**
 * Convertit un fichier en Base64 sans saturation mémoire
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve({
        base64,
        mimeType: file.type || 'image/jpeg',
      });
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Envoie le fichier compressé au Cloudflare Worker ou à l'API locale
 */
async function sendToWorker(file, workerUrl = DEFAULT_WORKER_URL) {
  const { base64, mimeType } = await fileToBase64(file);

  const payload = {
    fileData: base64,
    mimeType: mimeType,
    filename: file.name,
  };

  const response = await fetch(workerUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.status === 502 || response.status === 500) {
      throw new Error('Service momentanément indisponible, réessayez ou saisissez manuellement.');
    }
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Erreur serveur (${response.status})`);
  }

  const result = await response.json();
  // Récupérer les données que ce soit renvoyé sous { data: ... } ou directement
  const data = result.data || result;
  if (!data || typeof data !== 'object') {
    throw new Error('Données JSON invalides reçues du serveur.');
  }

  return data;
}

/**
 * Remplissage exhaustif du formulaire avec surlignage des champs critiques
 */
function populateCorrectionForm(data) {
  const pigeon = data.pigeon || {};
  const parents = data.parents || {};
  const grandsParents = data.grands_parents || {};
  const arriereGP = data.arriere_grands_parents || {};
  const details = data.details_elevage || {};

  // Fonction utilitaire pour fixer une valeur dans un champ input
  const setField = (id, val, isCritical = false) => {
    const el = document.getElementById(id);
    if (!el) return;
    const clean = val ? String(val).trim() : '';
    el.value = clean;
    if (isCritical) {
      if (!clean) {
        el.classList.add('border-red-500', 'bg-red-50', 'ring-1', 'ring-red-400');
        el.classList.remove('border-gray-300');
      } else {
        el.classList.remove('border-red-500', 'bg-red-50', 'ring-1', 'ring-red-400');
        el.classList.add('border-emerald-500');
      }
    }
  };

  // 1. Pigeon principal (G0)
  setField('pigeon_nom', pigeon.nom, true);
  setField('pigeon_numero_bague', pigeon.numero_bague, true);
  setField('pigeon_sexe', pigeon.sexe || 'M');
  setField('pigeon_race', pigeon.race);
  setField('pigeon_date_naissance', pigeon.date_naissance);
  setField('pigeon_couleur', pigeon.couleur);
  setField('pigeon_eleveur', pigeon.eleveur);
  setField('pigeon_proprietaire', pigeon.proprietaire);

  // 2. Parents (G1)
  const pere = parents.pere || {};
  const mere = parents.mere || {};
  setField('pere_nom', pere.nom);
  setField('pere_bague', pere.numero_bague);
  setField('pere_race', pere.race);
  setField('pere_resultats', pere.resultats);

  setField('mere_nom', mere.nom);
  setField('mere_bague', mere.numero_bague);
  setField('mere_race', mere.race);
  setField('mere_resultats', mere.resultats);

  // 3. Grands-Parents (G2)
  const pp = grandsParents.paternel_pere || {};
  const pm = grandsParents.paternel_mere || {};
  const mp = grandsParents.maternel_pere || {};
  const mm = grandsParents.maternel_mere || {};

  setField('gp_pp_nom', pp.nom);
  setField('gp_pp_bague', pp.numero_bague);
  setField('gp_pp_resultats', pp.resultats);

  setField('gp_pm_nom', pm.nom);
  setField('gp_pm_bague', pm.numero_bague);
  setField('gp_pm_resultats', pm.resultats);

  setField('gp_mp_nom', mp.nom);
  setField('gp_mp_bague', mp.numero_bague);
  setField('gp_mp_resultats', mp.resultats);

  setField('gp_mm_nom', mm.nom);
  setField('gp_mm_bague', mm.numero_bague);
  setField('gp_mm_resultats', mm.resultats);

  // 4. Arrière-Grands-Parents (G3)
  const agp = [
    { id: 'agp_1', obj: arriereGP.pp_pp },
    { id: 'agp_2', obj: arriereGP.pp_pm },
    { id: 'agp_3', obj: arriereGP.pm_pp },
    { id: 'agp_4', obj: arriereGP.pm_pm },
    { id: 'agp_5', obj: arriereGP.mp_pp },
    { id: 'agp_6', obj: arriereGP.mp_pm },
    { id: 'agp_7', obj: arriereGP.mm_pp },
    { id: 'agp_8', obj: arriereGP.mm_pm },
  ];
  agp.forEach(({ id, obj }) => {
    if (obj) {
      setField(`${id}_bague`, obj.numero_bague);
      setField(`${id}_nom`, obj.nom);
      setField(`${id}_resultats`, obj.resultats);
    }
  });

  // 5. Détails d'élevage
  setField('details_nom_eleveur', details.nom_eleveur || pigeon.eleveur);
  setField('details_adresse_eleveur', details.adresse_eleveur);
  setField('details_club', details.club);
  setField('details_observations', details.observations);
}

// Initialisation globale si exécuté dans une page HTML classique
if (typeof window !== 'undefined') {
  window.PedigreeExtractor = {
    compressImageFile,
    sendToWorker,
    populateCorrectionForm,
  };
}
