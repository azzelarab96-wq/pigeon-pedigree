import { PigeonData, PedigreeProject } from './types';
import { searchPigeons } from './supabaseClient';
import { getPdfDemoPigeons } from './demoData';

export interface GenealogySearchResult {
  ring: string;
  name: string;
  strain: string;
  owner: string;
  color: string;
  year: string;
  sex: 'M' | 'V';
  results: string;
  bgColor: string;
  source: 'saved_project' | 'database' | 'official_registry' | 'current';
  sourceLabel: string;
  hasAncestors: boolean;
  ancestorCount: number;
  projectPigeons?: PigeonData[];
  sourceIndex?: number;
}

// Libellé officiel du rôle de chaque case (0 à 30)
export function getBoxRoleName(boxId: number): string {
  switch (boxId) {
    case 0:
      return 'Sujet Principal (G0)';
    case 1:
      return 'Père (G1)';
    case 2:
      return 'Mère (G1)';
    case 3:
      return 'Grand-père Paternel (Père du #1) (G2)';
    case 4:
      return 'Grand-mère Paternelle (Mère du #1) (G2)';
    case 5:
      return 'Grand-père Maternel (Père du #2) (G2)';
    case 6:
      return 'Grand-mère Maternelle (Mère du #2) (G2)';
    case 7:
      return 'Arrière-grand-père (Père du #3) (G3)';
    case 8:
      return 'Arrière-grand-mère (Mère du #3) (G3)';
    case 9:
      return 'Arrière-grand-père (Père du #4) (G3)';
    case 10:
      return 'Arrière-grand-mère (Mère du #4) (G3)';
    case 11:
      return 'Arrière-grand-père (Père du #5) (G3)';
    case 12:
      return 'Arrière-grand-mère (Mère du #5) (G3)';
    case 13:
      return 'Arrière-grand-père (Père du #6) (G3)';
    case 14:
      return 'Arrière-grand-mère (Mère du #6) (G3)';
    default:
      if (boxId >= 15 && boxId <= 30) {
        const isMale = boxId % 2 === 1;
        const parentId = Math.floor((boxId - 1) / 2);
        return `G4 Ancêtre #${boxId} (${isMale ? '♂ Mâle' : '♀ Femelle'} - Parent du #${parentId})`;
      }
      return `Case #${boxId}`;
  }
}

// Normalisation intelligente des numéros de bague (retire espaces, tirets pour recherche souple)
export function normalizeRing(ring: string): string {
  return (ring || '').toUpperCase().replace(/[\s\-_/.]/g, '');
}

// Recherche universelle hybride : Projets Enregistrés + Base de données Admin (Supabase) + Registre Officiel
export async function searchGenealogyPigeons(
  query: string,
  savedProjects: PedigreeProject[],
  currentPigeons?: PigeonData[]
): Promise<GenealogySearchResult[]> {
  if (!query || query.trim().length < 1) return [];
  const q = query.trim().toLowerCase();
  const qNorm = normalizeRing(q);

  const results: GenealogySearchResult[] = [];
  const seenRings = new Set<string>();

  // 1. Recherche dans les Projets Enregistrés de l'utilisateur
  for (const proj of savedProjects) {
    if (!proj.pigeons || !Array.isArray(proj.pigeons)) continue;

    for (let idx = 0; idx < proj.pigeons.length; idx++) {
      const p = proj.pigeons[idx];
      if (!p.ring || p.ring.trim() === '') continue;

      const ringLower = p.ring.toLowerCase();
      const ringNorm = normalizeRing(p.ring);
      const nameLower = (p.name || '').toLowerCase();
      const ownerLower = (p.owner || '').toLowerCase();

      if (
        ringLower.includes(q) ||
        ringNorm.includes(qNorm) ||
        nameLower.includes(q) ||
        ownerLower.includes(q)
      ) {
        const ringKey = p.ring.trim().toUpperCase();
        if (!seenRings.has(ringKey)) {
          seenRings.add(ringKey);

          // Calculer récursivement tous les ancêtres connus de cette case dans ce projet
          const countSubtree = (nodeIdx: number): number => {
            const fIdx = 2 * nodeIdx + 1;
            const mIdx = 2 * nodeIdx + 2;
            let count = 0;
            if (fIdx <= 30) {
              if (proj.pigeons[fIdx]?.ring?.trim() || proj.pigeons[fIdx]?.name?.trim()) count++;
              count += countSubtree(fIdx);
            }
            if (mIdx <= 30) {
              if (proj.pigeons[mIdx]?.ring?.trim() || proj.pigeons[mIdx]?.name?.trim()) count++;
              count += countSubtree(mIdx);
            }
            return count;
          };
          const ancestorCount = countSubtree(idx);

          results.push({
            ring: p.ring,
            name: p.name || '',
            strain: p.strain || '',
            owner: p.owner || '',
            color: p.color || '',
            year: p.year || '',
            sex: p.sex === 'M' || p.sex === 'V' ? p.sex : idx % 2 === 1 ? 'M' : 'V',
            results: p.results || '',
            bgColor: p.bgColor || '#ffffff',
            source: 'saved_project',
            sourceLabel: `Projet : ${proj.ring || proj.name || 'Pédigree enregistré'}`,
            hasAncestors: ancestorCount > 0,
            ancestorCount,
            projectPigeons: proj.pigeons,
            sourceIndex: idx,
          });
        }
      }
    }
  }

  // 2. Recherche dans le Registre Officiel de Démo (Champions & Pédigrees de Référence)
  const demoPigeons = getPdfDemoPigeons();
  for (let idx = 0; idx < demoPigeons.length; idx++) {
    const p = demoPigeons[idx];
    if (!p.ring) continue;

    const ringLower = p.ring.toLowerCase();
    const ringNorm = normalizeRing(p.ring);
    const nameLower = (p.name || '').toLowerCase();

    if (ringLower.includes(q) || ringNorm.includes(qNorm) || nameLower.includes(q)) {
      const ringKey = p.ring.trim().toUpperCase();
      if (!seenRings.has(ringKey)) {
        seenRings.add(ringKey);
        const ancestorCount = idx === 0 ? 30 : idx <= 2 ? 14 : 0;
        results.push({
          ring: p.ring,
          name: p.name || '',
          strain: p.strain || '',
          owner: p.owner || '',
          color: p.color || '',
          year: p.year || '',
          sex: p.sex === 'M' || p.sex === 'V' ? p.sex : 'M',
          results: p.results || '',
          bgColor: p.bgColor || '#ffffff',
          source: 'official_registry',
          sourceLabel: 'Registre Officiel (Champions)',
          hasAncestors: ancestorCount > 0,
          ancestorCount,
          projectPigeons: demoPigeons,
          sourceIndex: idx,
        });
      }
    }
  }

  // 3. Recherche dans la Base de données Admin (Supabase)
  try {
    const dbPigeons = await searchPigeons(query);
    if (dbPigeons && Array.isArray(dbPigeons)) {
      for (const row of dbPigeons) {
        if (!row.ring) continue;
        const ringKey = row.ring.trim().toUpperCase();
        if (!seenRings.has(ringKey)) {
          seenRings.add(ringKey);
          results.push({
            ring: row.ring,
            name: row.name || '',
            strain: row.strain || '',
            owner: row.owner || '',
            color: row.color || '',
            year: row.year || '',
            sex: row.sex === 'V' ? 'V' : 'M',
            results: row.results || '',
            bgColor: row.bgColor || '#ffffff',
            source: 'database',
            sourceLabel: 'Base de données Admin (Supabase)',
            hasAncestors: false,
            ancestorCount: 0,
          });
        }
      }
    }
  } catch (err) {
    console.warn('[Genealogy Search DB Warning]:', err);
  }

  // 4. Recherche dans le projet actuel si pigeons présents
  if (currentPigeons && Array.isArray(currentPigeons)) {
    for (let idx = 0; idx < currentPigeons.length; idx++) {
      const p = currentPigeons[idx];
      if (!p.ring) continue;
      const ringLower = p.ring.toLowerCase();
      const ringNorm = normalizeRing(p.ring);
      if (ringLower.includes(q) || ringNorm.includes(qNorm)) {
        const ringKey = p.ring.trim().toUpperCase();
        if (!seenRings.has(ringKey)) {
          seenRings.add(ringKey);
          results.push({
            ring: p.ring,
            name: p.name || '',
            strain: p.strain || '',
            owner: p.owner || '',
            color: p.color || '',
            year: p.year || '',
            sex: p.sex || 'M',
            results: p.results || '',
            bgColor: p.bgColor || '#ffffff',
            source: 'current',
            sourceLabel: `Pédigree actuel (Case #${idx})`,
            hasAncestors: false,
            ancestorCount: 0,
          });
        }
      }
    }
  }

  return results.slice(0, 15);
}

// Remplissage automatique en cascade de l'arbre génétique
// Fills targetIndex with selected pigeon, and recursively fills parents / ancestors in their appropriate tree slots
export function cascadeGenealogyTree(
  currentPigeons: PigeonData[],
  targetIndex: number,
  selectedMatch: GenealogySearchResult
): { updatedPigeons: PigeonData[]; filledCount: number } {
  const updated = [...currentPigeons];
  let filledCount = 1;

  // 1. Remplir la case ciblée
  updated[targetIndex] = {
    ...updated[targetIndex],
    ring: selectedMatch.ring,
    name: selectedMatch.name,
    strain: selectedMatch.strain,
    owner: selectedMatch.owner,
    color: selectedMatch.color,
    year: selectedMatch.year,
    sex: selectedMatch.sex,
    results: selectedMatch.results,
    bgColor: selectedMatch.bgColor || '#ffffff',
  };

  // Si pas d'arbre source disponible, s'arrêter là
  if (!selectedMatch.projectPigeons || !selectedMatch.hasAncestors) {
    return { updatedPigeons: updated, filledCount: 1 };
  }

  const src = selectedMatch.projectPigeons;
  const srcIdx = selectedMatch.sourceIndex ?? 0;

  // 2. Cascade récursive universelle depuis n'importe quelle case source (srcIdx) vers n'importe quelle case cible (targetIndex)
  const copySubtree = (fromIdx: number, toIdx: number) => {
    const fSrc = 2 * fromIdx + 1;
    const mSrc = 2 * fromIdx + 2;
    const fDst = 2 * toIdx + 1;
    const mDst = 2 * toIdx + 2;

    if (fSrc <= 30 && fDst <= 30) {
      const fNode = src[fSrc];
      if (fNode && (fNode.ring?.trim() || fNode.name?.trim() || fNode.results?.trim())) {
        updated[fDst] = { ...fNode, id: fDst, sex: 'M' };
        filledCount++;
      }
      copySubtree(fSrc, fDst);
    }

    if (mSrc <= 30 && mDst <= 30) {
      const mNode = src[mSrc];
      if (mNode && (mNode.ring?.trim() || mNode.name?.trim() || mNode.results?.trim())) {
        updated[mDst] = { ...mNode, id: mDst, sex: 'V' };
        filledCount++;
      }
      copySubtree(mSrc, mDst);
    }
  };

  copySubtree(srcIdx, targetIndex);

  return { updatedPigeons: updated, filledCount };
}

// Parseur colombophile intelligent pour texte brut copier-coller
export function parsePedigreeRawText(rawText: string): {
  pigeons: PigeonData[];
  ownerName?: string;
  foundCount: number;
} {
  const pigeons = Array.from({ length: 31 }, (_, i) => ({
    id: i,
    ring: '',
    name: '',
    strain: '',
    owner: '',
    color: '',
    year: '',
    sex: (i === 0 ? 'M' : i % 2 === 1 ? 'M' : 'V') as 'M' | 'V',
    results: '',
    bgColor: '#ffffff',
  }));

  const ringRegex = /\b([A-Z]{1,4}[-\s]?[0-9]{3,9}[-/][0-9]{2,4}|[A-Z]{1,4}[-\s]?[0-9]{4,9})\b/gi;
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);

  const entries: Array<{ ring: string; name?: string; sex?: 'M' | 'V'; results?: string; strain?: string }> = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const matches = line.match(ringRegex);
    if (matches) {
      for (const m of matches) {
        const clean = m.trim().toUpperCase();
        if (!seen.has(clean) && clean.length >= 6) {
          seen.add(clean);
          const isFemale = /femelle|duivin|hen|\bv\b|♀/i.test(line);
          const nameMatch = line.match(/"([^"]+)"|«([^»]+)»/);
          entries.push({
            ring: clean,
            name: nameMatch ? nameMatch[1] || nameMatch[2] : '',
            sex: isFemale ? 'V' : 'M',
            results: line.replace(m, '').trim().slice(0, 160),
            strain: '',
          });
        }
      }
    }
  }

  let foundCount = 0;
  for (let i = 0; i < Math.min(31, entries.length); i++) {
    const e = entries[i];
    pigeons[i] = {
      ...pigeons[i],
      ring: e.ring,
      name: e.name || '',
      sex: e.sex || pigeons[i].sex,
      results: e.results || '',
    };
    foundCount++;
  }

  let ownerName = '';
  if (lines.length > 0 && !lines[0].match(ringRegex)) {
    ownerName = lines[0].slice(0, 50);
  }

  return { pigeons, ownerName, foundCount };
}
