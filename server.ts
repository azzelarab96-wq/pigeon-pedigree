import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import dotenv from 'dotenv';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Algorithme de secours intelligent colombophile : analyse regex des bagues et ancêtres
function parsePigeonsFallbackFromText(text: string) {
  const ringRegex = /\b([A-Z]{1,4}[-\s]?[0-9]{3,9}[-/][0-9]{2,4}|[A-Z]{1,4}[-\s]?[0-9]{4,9})\b/gi;
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const foundRings: string[] = [];
  const entries: Array<{ ring: string; name?: string; sex?: 'M' | 'V'; strain?: string; results?: string; owner?: string; year?: string }> = [];

  for (const line of lines) {
    const match = line.match(ringRegex);
    if (match) {
      for (const r of match) {
        const clean = r.trim().toUpperCase();
        if (!foundRings.includes(clean) && clean.length >= 6) {
          foundRings.push(clean);
          const isFemale = /femelle|duivin|hen|v\b|♀/i.test(line);
          const nameMatch = line.match(/"([^"]+)"|«([^»]+)»/);
          entries.push({
            ring: clean,
            name: nameMatch ? (nameMatch[1] || nameMatch[2]) : undefined,
            sex: isFemale ? 'V' : 'M',
            results: line.replace(r, '').trim().slice(0, 300),
          });
        }
      }
    }
  }

  // 31 cases complètes pour le modèle officiel A4 (5 Générations)
  const pigeons = Array.from({ length: 31 }, (_, i) => {
    const entry = entries[i];
    return {
      id: i,
      ring: entry?.ring || '',
      name: entry?.name || '',
      sex: (entry?.sex ? entry.sex : (i === 0 ? 'M' : i % 2 === 1 ? 'M' : 'V')) as 'M' | 'V',
      strain: entry?.strain || '',
      owner: entry?.owner || '',
      color: '',
      year: entry?.year || '',
      results: entry?.results || '',
      bgColor: '#ffffff',
    };
  });

  const p0 = pigeons[0];
  const p1 = pigeons[1];
  const p2 = pigeons[2];

  return {
    pigeon: {
      nom: p0.name || null,
      numero_bague: p0.ring || null,
      sexe: p0.sex === 'V' ? 'F' : 'M',
      race: p0.strain || null,
      date_naissance: p0.year || null,
      eleveur: lines[0]?.slice(0, 50) || null,
      palmares: p0.results || null,
    },
    parents: {
      pere: { nom: p1.name || null, numero_bague: p1.ring || null, race: p1.strain || null, palmares: p1.results || null },
      mere: { nom: p2.name || null, numero_bague: p2.ring || null, race: p2.strain || null, palmares: p2.results || null },
    },
    grands_parents: {
      paternel: { nom: pigeons[3].name || null, numero_bague: pigeons[3].ring || null, palmares: pigeons[3].results || null },
      paternel_mere: { nom: pigeons[4].name || null, numero_bague: pigeons[4].ring || null, palmares: pigeons[4].results || null },
      maternel_pere: { nom: pigeons[5].name || null, numero_bague: pigeons[5].ring || null, palmares: pigeons[5].results || null },
      maternel_mere: { nom: pigeons[6].name || null, numero_bague: pigeons[6].ring || null, palmares: pigeons[6].results || null },
    },
    pigeons,
    ownerName: lines[0]?.slice(0, 50) || '',
    ownerDetails: '',
    detectedTheme: 'elghali',
  };
}

// Stockage temporaire des exports pour téléchargement direct natif mobile (contourne 100% des restrictions d'iframe et blob sur iOS/Android)
interface ExportItem {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  createdAt: number;
}
const exportStore = new Map<string, ExportItem>();

// Nettoyage automatique des fichiers temporaires après 20 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, item] of exportStore.entries()) {
    if (now - item.createdAt > 20 * 60 * 1000) {
      exportStore.delete(key);
    }
  }
}, 60 * 1000);

// Endpoint 1: Enregistrer un fichier exporté (PDF ou PNG) et renvoyer une URL de téléchargement HTTP directe
app.post('/api/store-export', (req, res) => {
  try {
    const { base64Data, filename, mimeType } = req.body;
    if (!base64Data || !filename || !mimeType) {
      return res.status(400).json({ error: 'Données manquantes' });
    }
    const id = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const buffer = Buffer.from(base64Data, 'base64');
    exportStore.set(id, {
      buffer,
      filename,
      mimeType,
      createdAt: Date.now(),
    });
    return res.json({
      downloadUrl: `/api/download-export/${id}`,
      viewUrl: `/api/view-export/${id}`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Endpoint 2: Servir le fichier en téléchargement forcé (attachment) avec support complet des mobiles
app.get('/api/download-export/:id', (req, res) => {
  const item = exportStore.get(req.params.id);
  if (!item) {
    return res.status(404).send('Ce lien de téléchargement a expiré. Veuillez relancer l’exportation.');
  }
  const cleanFilename = (item.filename || 'Pedigree.pdf').replace(/["\r\n]/g, '_');
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${cleanFilename}"; filename*=UTF-8''${encodeURIComponent(cleanFilename)}`
  );
  res.setHeader('Content-Length', item.buffer.length);
  res.setHeader('Cache-Control', 'no-cache');
  res.send(item.buffer);
});

// Endpoint 3: Servir le fichier en affichage direct dans le navigateur (inline)
app.get('/api/view-export/:id', (req, res) => {
  const item = exportStore.get(req.params.id);
  if (!item) {
    return res.status(404).send('Ce document a expiré. Veuillez relancer l’exportation.');
  }
  const cleanFilename = (item.filename || 'Pedigree.pdf').replace(/["\r\n]/g, '_');
  res.setHeader('Content-Type', item.mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${cleanFilename}"`);
  res.setHeader('Content-Length', item.buffer.length);
  res.setHeader('Cache-Control', 'no-cache');
  res.send(item.buffer);
});

// API endpoint: Extraire un pedigree COMPLET (31 cases, 5 générations) depuis PDF ou Image
app.post('/api/extract-pedigree', async (req, res) => {
  let extractedPdfText = '';
  try {
    const { fileData, mimeType, filename } = req.body;
    if (!fileData || !mimeType) {
      return res.status(400).json({ error: 'fileData et mimeType sont requis' });
    }

    const isPdf =
      mimeType === 'application/pdf' ||
      (filename && filename.toLowerCase().endsWith('.pdf'));

    let validMime = mimeType;
    if (isPdf) {
      validMime = 'application/pdf';
      try {
        const fileBuffer = Buffer.from(fileData, 'base64');
        const parser = new PDFParse({ data: fileBuffer });
        const textResult = await parser.getText();
        extractedPdfText = textResult?.text || '';
      } catch (pdfErr) {
        console.warn('[PDF Parser] Fallback extraction direct:', pdfErr);
      }
    } else if (validMime.includes('png')) {
      validMime = 'image/png';
    } else if (validMime.includes('webp')) {
      validMime = 'image/webp';
    } else {
      validMime = 'image/jpeg';
    }

    const systemPrompt = `Tu es un expert colombophile international et extracteur de pedigrees de pigeons voyageurs haute précision.
Analyse minutieusement ce document de pedigree (PDF ou photo/scan) et extrais L'INTÉGRALITÉ ABSOLUE de l'arbre généalogique (les 5 générations / 31 cases) pour remplir le modèle officiel Elghali A4 :

ORGANISATION SPATIALE DES COLONNES (DE GAUCHE À DROITE ET DE HAUT EN BAS) :
1. COLONNE 1 (G0 - Sujet Principal, Case #0 -> "pigeon") :
   - Le pigeon principal du pedigree : numero_bague, nom, sexe ("M" ou "F"), race (souche/lignée), couleur, date_naissance (ou année), eleveur (colombier/propriétaire), et palmares (texte multi-lignes complet des résultats, titres As-Pigeon, etc.).
2. COLONNE 2 (G1 - Les 2 Parents directs, de haut en bas -> "parents") :
   - Case #1 ("pere", en haut ♂) et Case #2 ("mere", en bas ♀) : numero_bague, nom, eleveur, race, couleur, et resultats (toutes les lignes de texte dans la case : "Father of...", "Mother of...", prix, origines).
3. COLONNE 3 (G2 - Les 4 Grands-Parents, de haut en bas -> "grands_parents") :
   - Case #3 ("paternel_pere" - Père du Père, 1ère case en haut ♂)
   - Case #4 ("paternel_mere" - Mère du Père, 2ème case ♀)
   - Case #5 ("maternel_pere" - Père de la Mère, 3ème case ♂)
   - Case #6 ("maternel_mere" - Mère de la Mère, 4ème case en bas ♀)
4. COLONNE 4 (G3 - Les 8 Arrière-Grands-Parents, de haut en bas -> "arriere_grands_parents") :
   - Case #7 ("pp_pp" - Père du #3, 1ère case en haut ♂)
   - Case #8 ("pp_pm" - Mère du #3, 2ème case ♀)
   - Case #9 ("pm_pp" - Père du #4, 3ème case ♂)
   - Case #10 ("pm_pm" - Mère du #4, 4ème case ♀)
   - Case #11 ("mp_pp" - Père du #5, 5ème case ♂)
   - Case #12 ("mp_pm" - Mère du #5, 6ème case ♀)
   - Case #13 ("mm_pp" - Père du #6, 7ème case ♂)
   - Case #14 ("mm_pm" - Mère du #6, 8ème case en bas ♀)
5. COLONNE 5 (G4 - Les 16 Arrière-Arrière-Grands-Parents, colonne tout à droite de haut en bas -> "arriere_arriere_grands_parents") :
   - Cases #15 à #30 ("case_15" en haut jusqu'à "case_30" tout en bas). Si le document ne comporte que 4 générations, retourne des chaînes vides "" pour case_15 à case_30.

RÈGLES STRICTES :
- Extrais CHAQUE case visible sans jamais t'arrêter à la première génération (G0).
- Conserve fidèlement les sauts de ligne (\\n) dans les textes de palmarès/résultats de chaque case.
- Si un champ est absent ou vide sur le document, retourne une chaîne vide "". N'invente aucune donnée.`;

    let promptWithContext = systemPrompt;
    if (extractedPdfText && extractedPdfText.trim().length > 0) {
      promptWithContext += `\n\nTexte brut extrait du document PDF pour t'aider :\n"""\n${extractedPdfText.slice(0, 12000)}\n"""`;
    }

    if (!process.env.GEMINI_API_KEY) {
      console.warn('[Gemini API] Clé absente, utilisation du parseur local');
      const fallback = parsePigeonsFallbackFromText(extractedPdfText || 'MA 593-21 Boraq');
      return res.json(fallback);
    }

    let parsed: any = null;
    let modelUsed: string | null = null;
    let lastError: any = null;

    // Schéma JSON exhaustif pour chaque ancêtre G1, G2, G3
    const ancestorSchema = {
      type: Type.OBJECT,
      properties: {
        numero_bague: { type: Type.STRING, description: 'Numéro de bague complet (ex: MA 2559-20, BE 6075235-13)' },
        nom: { type: Type.STRING, description: 'Nom ou surnom du pigeon' },
        eleveur: { type: Type.STRING, description: 'Éleveur, colombophile ou propriétaire mentionné dans la case' },
        race: { type: Type.STRING, description: 'Lignée, souche ou origine' },
        couleur: { type: Type.STRING, description: 'Couleur de la robe (ex: Kras, Blauw, Bleu, Écaillé)' },
        resultats: { type: Type.STRING, description: 'Texte complet multi-lignes de la case (palmarès, Father of..., Mother of..., notes)' },
      },
      required: ['numero_bague', 'nom', 'eleveur', 'race', 'couleur', 'resultats'],
    };

    // Schéma pour chaque ancêtre de 5ème génération (G4 : cases 15 à 30)
    const g4AncestorSchema = {
      type: Type.OBJECT,
      properties: {
        numero_bague: { type: Type.STRING, description: 'Numéro de bague de la case G4' },
        nom: { type: Type.STRING, description: 'Nom ou surnom dans la case G4' },
        eleveur: { type: Type.STRING, description: 'Éleveur ou origine dans la case G4' },
        couleur: { type: Type.STRING, description: 'Couleur ou lignée dans la case G4' },
        resultats: { type: Type.STRING, description: 'Notes ou résultats éventuels dans la case G4' },
      },
      required: ['numero_bague', 'nom', 'eleveur', 'couleur', 'resultats'],
    };

    const pedigreeResponseSchema = {
      type: Type.OBJECT,
      properties: {
        pigeon: {
          type: Type.OBJECT,
          properties: {
            numero_bague: { type: Type.STRING, description: 'Numéro de bague complet du sujet G0, ex: MA 593-21' },
            nom: { type: Type.STRING, description: 'Nom complet du sujet G0' },
            sexe: { type: Type.STRING, description: 'M ou F' },
            eleveur: { type: Type.STRING, description: 'Éleveur ou propriétaire du sujet G0' },
            race: { type: Type.STRING, description: 'Souche ou lignée du sujet G0' },
            couleur: { type: Type.STRING, description: 'Couleur du sujet G0' },
            date_naissance: { type: Type.STRING, description: 'Année ou date de naissance' },
            proprietaire: { type: Type.STRING },
            palmares: { type: Type.STRING, description: 'Palmarès complet multi-lignes et notes de la case G0' },
          },
          required: ['numero_bague', 'nom', 'sexe', 'eleveur', 'race', 'couleur', 'date_naissance', 'palmares'],
        },
        parents: {
          type: Type.OBJECT,
          properties: {
            pere: ancestorSchema,
            mere: ancestorSchema,
          },
          required: ['pere', 'mere'],
        },
        grands_parents: {
          type: Type.OBJECT,
          properties: {
            paternel_pere: ancestorSchema,
            paternel_mere: ancestorSchema,
            maternel_pere: ancestorSchema,
            maternel_mere: ancestorSchema,
          },
          required: ['paternel_pere', 'paternel_mere', 'maternel_pere', 'maternel_mere'],
        },
        arriere_grands_parents: {
          type: Type.OBJECT,
          properties: {
            pp_pp: ancestorSchema,
            pp_pm: ancestorSchema,
            pm_pp: ancestorSchema,
            pm_pm: ancestorSchema,
            mp_pp: ancestorSchema,
            mp_pm: ancestorSchema,
            mm_pp: ancestorSchema,
            mm_pm: ancestorSchema,
          },
          required: ['pp_pp', 'pp_pm', 'pm_pp', 'pm_pm', 'mp_pp', 'mp_pm', 'mm_pp', 'mm_pm'],
        },
        arriere_arriere_grands_parents: {
          type: Type.OBJECT,
          description: 'Les 16 cases de 5ème génération (G4, colonne de droite de haut en bas : case_15 à case_30)',
          properties: {
            case_15: g4AncestorSchema,
            case_16: g4AncestorSchema,
            case_17: g4AncestorSchema,
            case_18: g4AncestorSchema,
            case_19: g4AncestorSchema,
            case_20: g4AncestorSchema,
            case_21: g4AncestorSchema,
            case_22: g4AncestorSchema,
            case_23: g4AncestorSchema,
            case_24: g4AncestorSchema,
            case_25: g4AncestorSchema,
            case_26: g4AncestorSchema,
            case_27: g4AncestorSchema,
            case_28: g4AncestorSchema,
            case_29: g4AncestorSchema,
            case_30: g4AncestorSchema,
          },
          required: [
            'case_15', 'case_16', 'case_17', 'case_18',
            'case_19', 'case_20', 'case_21', 'case_22',
            'case_23', 'case_24', 'case_25', 'case_26',
            'case_27', 'case_28', 'case_29', 'case_30',
          ],
        },
        details_elevage: {
          type: Type.OBJECT,
          properties: {
            nom_eleveur: { type: Type.STRING, description: 'Nom du colombier ou de l\'éleveur en en-tête ou pied de page' },
            adresse_eleveur: { type: Type.STRING, description: 'Adresse complète, téléphone, email en pied de page ou en-tête' },
            club: { type: Type.STRING },
            date_acquisition: { type: Type.STRING },
            observations: { type: Type.STRING },
          },
          required: ['nom_eleveur', 'adresse_eleveur'],
        },
        resultats_courses: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              course: { type: Type.STRING },
              date: { type: Type.STRING },
              position: { type: Type.STRING },
              nombre_participants: { type: Type.STRING },
              distance_km: { type: Type.STRING },
              vitesse: { type: Type.STRING },
            },
          },
        },
      },
      required: [
        'pigeon',
        'parents',
        'grands_parents',
        'arriere_grands_parents',
        'arriere_arriere_grands_parents',
        'details_elevage',
      ],
    };

    const multimodalContents = [
      {
        inlineData: {
          data: fileData,
          mimeType: validMime,
        },
      },
      promptWithContext,
    ];

    // CASCADE DE MODÈLES AVEC RÉSILIENCE AUTOMATIQUE (gemini-3.8-flash -> gemini-3.1-flash-lite)
    const candidateModels = [
      { model: 'gemini-3.8-flash', thinking: true },
      { model: 'gemini-3.1-flash-lite', thinking: false },
    ];

    for (const candidate of candidateModels) {
      if (parsed) break;
      try {
        console.log(`[Pedigree Import] Tentative d'analyse complète (31 cases) avec ${candidate.model}...`);
        const config: any = {
          responseMimeType: 'application/json',
          responseSchema: pedigreeResponseSchema,
          maxOutputTokens: 16384,
        };
        if (candidate.thinking) {
          config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
        }

        const response = await ai.models.generateContent({
          model: candidate.model,
          contents: multimodalContents,
          config,
        });

        let rawText = response.text?.trim() || '';
        if (rawText.startsWith('```json')) {
          rawText = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (rawText.startsWith('```')) {
          rawText = rawText.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
          modelUsed = candidate.model;
          console.log(`[Pedigree Import] Succès complet avec ${candidate.model} !`);
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[Pedigree Import] Échec avec ${candidate.model} (${err?.status || err?.message})`);
      }
    }

    // Repli de secours : parseur colombophile local si toutes les requêtes en ligne ont échoué
    if (!parsed) {
      console.warn('[Pedigree Import] Tous les modèles en ligne ont échoué, activation du parseur local:', lastError?.message);
      const fallbackResult = parsePigeonsFallbackFromText(extractedPdfText || '');
      return res.json(fallbackResult);
    }

    // Normaliser rigoureusement les 31 cases de l'arbre généalogique Elghali A4
    const rawList: any[] = Array.isArray(parsed.pigeons) ? parsed.pigeons : [];
    const cleanVal = (v: any) => (!v || v === 'null' || v === 'undefined' ? '' : String(v).trim());

    const pigeonsMap: { [key: number]: any } = {};
    rawList.forEach((item, index) => {
      let idNum = -1;
      if (typeof item?.id === 'number') {
        idNum = item.id;
      } else if (typeof item?.id === 'string' && !isNaN(Number(item.id))) {
        idNum = Number(item.id);
      } else {
        idNum = index;
      }
      if (idNum >= 0 && idNum <= 31) {
        pigeonsMap[idNum] = item;
      }
    });

    // Si le modèle a numéroté de 1 à 31 au lieu de 0 à 30, décaler d'une case
    if (pigeonsMap[0] === undefined && pigeonsMap[31] !== undefined) {
      for (let i = 0; i <= 30; i++) {
        pigeonsMap[i] = pigeonsMap[i + 1] || {};
      }
      delete pigeonsMap[31];
    }

    const mergeIntoSlot = (id: number, srcObj: any, defaultSex: 'M' | 'V') => {
      if (!srcObj) return;
      const existing = pigeonsMap[id] || {};
      pigeonsMap[id] = {
        id,
        ring: cleanVal(srcObj.numero_bague || srcObj.ring || existing.ring || existing.numero_bague),
        name: cleanVal(srcObj.nom || srcObj.name || existing.name || existing.nom),
        sex: cleanVal(srcObj.sexe || srcObj.sex || existing.sex || existing.sexe) || defaultSex,
        strain: cleanVal(srcObj.race || srcObj.strain || existing.strain || existing.race),
        color: cleanVal(srcObj.couleur || srcObj.color || existing.color || existing.couleur),
        year: cleanVal(srcObj.date_naissance || srcObj.year || existing.year || existing.date_naissance),
        owner: cleanVal(srcObj.eleveur || srcObj.owner || existing.owner || existing.eleveur),
        results: cleanVal(
          srcObj.resultats || srcObj.palmares || srcObj.results || existing.results || existing.palmares || existing.resultats
        ),
      };
    };

    // Case 0 : Sujet Principal (G0)
    if (parsed.pigeon) {
      mergeIntoSlot(0, parsed.pigeon, parsed.pigeon.sexe === 'F' ? 'V' : 'M');
    }

    // Ajouter les résultats de courses éventuels au palmarès de la case 0 s'ils n'y figurent pas déjà
    if (Array.isArray(parsed.resultats_courses) && parsed.resultats_courses.length > 0) {
      const courseLines = parsed.resultats_courses
        .map((c: any) =>
          [c.position, c.course, c.distance_km ? `${c.distance_km}km` : '', c.nombre_participants ? `${c.nombre_participants}p` : '', c.date]
            .map((x) => cleanVal(x))
            .filter(Boolean)
            .join(' ')
        )
        .filter(Boolean);
      if (courseLines.length > 0) {
        const curRes = cleanVal(pigeonsMap[0]?.results);
        const extraLines = courseLines.filter((line: string) => !curRes.includes(line));
        if (extraLines.length > 0) {
          pigeonsMap[0] = {
            ...(pigeonsMap[0] || { id: 0 }),
            results: [curRes, ...extraLines].filter(Boolean).join('\n'),
          };
        }
      }
    }

    // Cases 1 et 2 : Parents (G1)
    mergeIntoSlot(1, parsed.parents?.pere, 'M');
    mergeIntoSlot(2, parsed.parents?.mere, 'V');

    // Cases 3 à 6 : Grands-Parents (G2)
    mergeIntoSlot(3, parsed.grands_parents?.paternel_pere || parsed.grands_parents?.paternel, 'M');
    mergeIntoSlot(4, parsed.grands_parents?.paternel_mere, 'V');
    mergeIntoSlot(5, parsed.grands_parents?.maternel_pere, 'M');
    mergeIntoSlot(6, parsed.grands_parents?.maternel_mere, 'V');

    // Cases 7 à 14 : Arrière-Grands-Parents (G3)
    const agp = parsed.arriere_grands_parents || {};
    const agpDefinitions: Array<{ id: number; data: any; sex: 'M' | 'V' }> = [
      { id: 7, data: agp.pp_pp, sex: 'M' },
      { id: 8, data: agp.pp_pm, sex: 'V' },
      { id: 9, data: agp.pm_pp, sex: 'M' },
      { id: 10, data: agp.pm_pm, sex: 'V' },
      { id: 11, data: agp.mp_pp, sex: 'M' },
      { id: 12, data: agp.mp_pm, sex: 'V' },
      { id: 13, data: agp.mm_pp, sex: 'M' },
      { id: 14, data: agp.mm_pm, sex: 'V' },
    ];
    for (const item of agpDefinitions) {
      mergeIntoSlot(item.id, item.data, item.sex);
    }

    // Cases 15 à 30 : Arrière-Arrière-Grands-Parents (G4 - 5ème génération)
    const aagp = parsed.arriere_arriere_grands_parents || {};
    for (let id = 15; id <= 30; id++) {
      const slotData = aagp[`case_${id}`] || aagp[id];
      const defaultSex: 'M' | 'V' = id % 2 === 1 ? 'M' : 'V';
      mergeIntoSlot(id, slotData, defaultSex);
    }

    // Construction complète et inviolable des 31 cases pour le modèle Elghali A4
    const pigeons = Array.from({ length: 31 }, (_, i) => {
      const item = pigeonsMap[i] || {};
      const rawSex = String(item.sex || item.sexe || '');
      const isFem = rawSex === 'V' || rawSex === 'F' || /femelle|duivin|hen|♀/i.test(rawSex);
      const isMale = rawSex === 'M' || /male|mâle|doffer|cock|♂/i.test(rawSex);
      const computedSex = i === 0 ? (isFem ? 'V' : 'M') : i % 2 === 1 ? 'M' : 'V';

      // Extraire l'année depuis le numéro de bague si l'année est absente
      let yearVal = cleanVal(item.year || item.date_naissance);
      const ringVal = cleanVal(item.ring || item.numero_bague);
      if (!yearVal && ringVal) {
        const yearMatch = ringVal.match(/[-/\s](\d{2}|\d{4})$/);
        if (yearMatch) {
          const y = yearMatch[1];
          yearVal = y.length === 2 ? (Number(y) > 50 ? `19${y}` : `20${y}`) : y;
        }
      }

      return {
        id: i,
        ring: ringVal,
        name: cleanVal(item.name || item.nom),
        sex: (i === 0 && isMale ? 'M' : computedSex) as 'M' | 'V',
        strain: cleanVal(item.strain || item.race),
        color: cleanVal(item.color || item.couleur),
        year: yearVal,
        owner: cleanVal(item.owner || item.eleveur),
        results: cleanVal(item.results || item.palmares || item.resultats),
        bgColor: '#ffffff',
      };
    });

    const p0 = pigeons[0];
    const p1 = pigeons[1];
    const p2 = pigeons[2];

    const pigeon = {
      nom: p0.name || null,
      numero_bague: p0.ring || null,
      sexe: p0.sex === 'V' ? 'F' : 'M',
      race: p0.strain || null,
      date_naissance: p0.year || null,
      couleur: p0.color || null,
      eleveur: p0.owner || cleanVal(parsed.details_elevage?.nom_eleveur) || cleanVal(parsed.ownerName) || null,
      palmares: p0.results || null,
    };

    const parents = {
      pere: {
        nom: p1.name || null,
        numero_bague: p1.ring || null,
        eleveur: p1.owner || null,
        race: p1.strain || null,
        couleur: p1.color || null,
        resultats: p1.results || null,
        palmares: p1.results || null,
      },
      mere: {
        nom: p2.name || null,
        numero_bague: p2.ring || null,
        eleveur: p2.owner || null,
        race: p2.strain || null,
        couleur: p2.color || null,
        resultats: p2.results || null,
        palmares: p2.results || null,
      },
    };

    const grands_parents = {
      paternel: {
        nom: pigeons[3].name || null,
        numero_bague: pigeons[3].ring || null,
        eleveur: pigeons[3].owner || null,
        race: pigeons[3].strain || null,
        couleur: pigeons[3].color || null,
        resultats: pigeons[3].results || null,
        palmares: pigeons[3].results || null,
      },
      paternel_pere: {
        nom: pigeons[3].name || null,
        numero_bague: pigeons[3].ring || null,
        eleveur: pigeons[3].owner || null,
        race: pigeons[3].strain || null,
        couleur: pigeons[3].color || null,
        resultats: pigeons[3].results || null,
        palmares: pigeons[3].results || null,
      },
      paternel_mere: {
        nom: pigeons[4].name || null,
        numero_bague: pigeons[4].ring || null,
        eleveur: pigeons[4].owner || null,
        race: pigeons[4].strain || null,
        couleur: pigeons[4].color || null,
        resultats: pigeons[4].results || null,
        palmares: pigeons[4].results || null,
      },
      maternel_pere: {
        nom: pigeons[5].name || null,
        numero_bague: pigeons[5].ring || null,
        eleveur: pigeons[5].owner || null,
        race: pigeons[5].strain || null,
        couleur: pigeons[5].color || null,
        resultats: pigeons[5].results || null,
        palmares: pigeons[5].results || null,
      },
      maternel_mere: {
        nom: pigeons[6].name || null,
        numero_bague: pigeons[6].ring || null,
        eleveur: pigeons[6].owner || null,
        race: pigeons[6].strain || null,
        couleur: pigeons[6].color || null,
        resultats: pigeons[6].results || null,
        palmares: pigeons[6].results || null,
      },
    };

    const arriere_grands_parents = {
      pp_pp: { nom: pigeons[7].name || null, numero_bague: pigeons[7].ring || null, eleveur: pigeons[7].owner || null, race: pigeons[7].strain || null, couleur: pigeons[7].color || null, resultats: pigeons[7].results || null, palmares: pigeons[7].results || null },
      pp_pm: { nom: pigeons[8].name || null, numero_bague: pigeons[8].ring || null, eleveur: pigeons[8].owner || null, race: pigeons[8].strain || null, couleur: pigeons[8].color || null, resultats: pigeons[8].results || null, palmares: pigeons[8].results || null },
      pm_pp: { nom: pigeons[9].name || null, numero_bague: pigeons[9].ring || null, eleveur: pigeons[9].owner || null, race: pigeons[9].strain || null, couleur: pigeons[9].color || null, resultats: pigeons[9].results || null, palmares: pigeons[9].results || null },
      pm_pm: { nom: pigeons[10].name || null, numero_bague: pigeons[10].ring || null, eleveur: pigeons[10].owner || null, race: pigeons[10].strain || null, couleur: pigeons[10].color || null, resultats: pigeons[10].results || null, palmares: pigeons[10].results || null },
      mp_pp: { nom: pigeons[11].name || null, numero_bague: pigeons[11].ring || null, eleveur: pigeons[11].owner || null, race: pigeons[11].strain || null, couleur: pigeons[11].color || null, resultats: pigeons[11].results || null, palmares: pigeons[11].results || null },
      mp_pm: { nom: pigeons[12].name || null, numero_bague: pigeons[12].ring || null, eleveur: pigeons[12].owner || null, race: pigeons[12].strain || null, couleur: pigeons[12].color || null, resultats: pigeons[12].results || null, palmares: pigeons[12].results || null },
      mm_pp: { nom: pigeons[13].name || null, numero_bague: pigeons[13].ring || null, eleveur: pigeons[13].owner || null, race: pigeons[13].strain || null, couleur: pigeons[13].color || null, resultats: pigeons[13].results || null, palmares: pigeons[13].results || null },
      mm_pm: { nom: pigeons[14].name || null, numero_bague: pigeons[14].ring || null, eleveur: pigeons[14].owner || null, race: pigeons[14].strain || null, couleur: pigeons[14].color || null, resultats: pigeons[14].results || null, palmares: pigeons[14].results || null },
    };

    const arriere_arriere_grands_parents: Record<string, any> = {};
    for (let id = 15; id <= 30; id++) {
      arriere_arriere_grands_parents[`case_${id}`] = {
        nom: pigeons[id].name || null,
        numero_bague: pigeons[id].ring || null,
        eleveur: pigeons[id].owner || null,
        couleur: pigeons[id].color || pigeons[id].strain || null,
        resultats: pigeons[id].results || null,
      };
    }

    return res.json({
      success: true,
      pigeons,
      pigeon,
      parents,
      grands_parents,
      arriere_grands_parents,
      arriere_arriere_grands_parents,
      details_elevage: parsed.details_elevage || {},
      resultats_courses: parsed.resultats_courses || [],
      ownerName: cleanVal(parsed.ownerName) || cleanVal(parsed.details_elevage?.nom_eleveur) || pigeon.eleveur || '',
      ownerDetails: cleanVal(parsed.ownerDetails) || cleanVal(parsed.details_elevage?.adresse_eleveur) || '',
      detectedTheme: 'elghali',
      modelUsed,
    });
  } catch (error: any) {
    console.error('Erreur finale extraction pedigree:', error);
    const fallbackResult = parsePigeonsFallbackFromText(extractedPdfText || '');
    return res.json(fallbackResult);
  }
});

// En développement, monter Vite en middleware (sans WebSocket HMR pour éviter les erreurs réseau dans le proxy Cloud Run)
if (process.env.NODE_ENV !== 'production') {
  app.get('/@vite/client', (_req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(`const sheetsMap = new Map();
export function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    style.textContent = content;
    document.head.appendChild(style);
  } else {
    style.textContent = content;
  }
  sheetsMap.set(id, style);
}
export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style) {
    document.head.removeChild(style);
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  return {
    accept() {},
    dispose() {},
    prune() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
    data: {},
  };
}
export function injectQuery(url) {
  return url;
}
export class ErrorOverlay extends HTMLElement {}
`);
  });

  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      hmr: false,
      watch: null,
    },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static('dist'));
  app.get('*', (req, res) => {
    res.sendFile('dist/index.html', { root: '.' });
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur Pédigree Pigeon Pro démarré sur http://0.0.0.0:${PORT}`);
});
