import { PedigreeTextSize, PedigreeTheme, PigeonData } from '../types';

export interface NativePedigreeRenderOptions {
  pigeons: PigeonData[];
  ownerName: string;
  ownerDetails: string;
  showOwnerFooter: boolean;
  logoUrl?: string;
  theme?: PedigreeTheme;
  textSize?: PedigreeTextSize;
  g0Offset?: number;
  scale?: number;
}

const FONT_SANS = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';

/**
 * Dessine un rectangle aux coins arrondis sur un contexte Canvas 2D
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Dessine le logo circulaire officiel "AB - ABDESSSAMAD EL BAHDAOUI" en vectoriel natif Canvas 2D
 */
function drawDefaultEmblem(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number) {
  ctx.save();

  // Cercle extérieur blanc avec bordure bleue
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 1.5, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = '#0284c7';
  ctx.stroke();

  // Cercle pointillé intermédiaire
  ctx.beginPath();
  ctx.setLineDash([2, 2]);
  ctx.arc(cx, cy, radius - 4.5, 0, Math.PI * 2);
  ctx.lineWidth = 0.8;
  ctx.strokeStyle = '#0284c7';
  ctx.stroke();
  ctx.setLineDash([]);

  // Texte circulaire supérieur "ABDESSSAMAD EL BAHDAOUI"
  const text = 'ABDESSSAMAD EL BAHDAOUI';
  const textRadius = radius - 8.5;
  ctx.font = `bold 4.2px ${FONT_SANS}`;
  ctx.fillStyle = '#0369a1';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const totalAngle = Math.PI * 1.18;
  const startAngle = -Math.PI / 2 - totalAngle / 2;
  const stepAngle = totalAngle / (text.length - 1);

  for (let i = 0; i < text.length; i++) {
    const angle = startAngle + i * stepAngle;
    ctx.save();
    ctx.translate(cx + Math.cos(angle) * textRadius, cy + Math.sin(angle) * textRadius);
    ctx.rotate(angle + Math.PI / 2);
    ctx.fillText(text[i], 0, 0);
    ctx.restore();
  }

  // Cercle intérieur avec bordure rouge
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.65, 0, Math.PI * 2);
  ctx.fillStyle = '#f8fafc';
  ctx.fill();
  ctx.lineWidth = 1.1;
  ctx.strokeStyle = '#dc2626';
  ctx.stroke();

  // Lettres centrales "A" (bleu) et "B" (rouge)
  ctx.font = `900 ${Math.round(radius * 0.56)}px Impact, "Arial Black", ${FONT_SANS}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  ctx.fillStyle = '#1d4ed8';
  ctx.fillText('A', cx - radius * 0.17, cy + 1);

  ctx.fillStyle = '#dc2626';
  ctx.fillText('B', cx + radius * 0.17, cy + 1);

  ctx.restore();
}

/**
 * Charge une image de manière sécurisée avec timeout
 */
function loadImageSafe(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => resolve(null), 2500);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    if (url.startsWith('http')) {
      img.crossOrigin = 'anonymous';
    }
    img.src = url;
  });
}

/**
 * Découpe un paragraphe en lignes selon la largeur disponible (mots entiers préservés)
 */
function wrapParagraphLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const rawLines = text.split(/\r?\n/);
  const wrapped: string[] = [];

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    const words = trimmed.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth) {
        currentLine = candidate;
      } else {
        if (currentLine) {
          wrapped.push(currentLine);
          currentLine = word;
        } else {
          // Mot très long (ex: "====================") : tronquer proprement à la largeur de la case
          let clipped = word;
          while (clipped.length > 3 && ctx.measureText(clipped).width > maxWidth) {
            clipped = clipped.slice(0, -1);
          }
          wrapped.push(clipped);
          currentLine = '';
        }
      }
    }
    if (currentLine) {
      wrapped.push(currentLine);
    }
  }

  return wrapped;
}

/**
 * Rendu natif HTML5 Canvas 2D haute résolution (A4 794x1123px)
 * Reproduit au pixel près le modèle officiel Elghali A4 (ainsi que Compuclub) sur 100% des téléphones et PC
 * sans dépendre du chargement CSS dans un iframe html2canvas.
 */
export async function renderPedigreeToCanvasNative(
  options: NativePedigreeRenderOptions
): Promise<HTMLCanvasElement> {
  const {
    pigeons,
    ownerName,
    showOwnerFooter,
    logoUrl,
    textSize = 'grand',
    g0Offset = 35,
    scale = 2.5,
  } = options;

  const width = 794;
  const height = 1123;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return canvas;
  }

  ctx.scale(scale, scale);

  // 1. Fond blanc A4 et cadre extérieur officiel (border-2 border-slate-800)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);

  const mainPigeon = pigeons[0] || {
    id: 0,
    ring: '',
    name: '',
    strain: '',
    owner: '',
    color: '',
    year: '',
    sex: 'M',
    results: '',
    bgColor: '#ffffff',
  };

  // 2. EN-TÊTE OFFICIEL ELGHALI : "Pigeon Pedigree - MA 593-21 ♂"
  const headerY = 27;
  const titleBase = 'Pigeon Pedigree';
  const ringPart = mainPigeon.ring ? ` - ${mainPigeon.ring}` : '';
  const sexSymbol = mainPigeon.ring ? (mainPigeon.sex === 'M' ? ' ♂' : ' ♀') : '';

  ctx.font = `900 25px ${FONT_SANS}`;
  const mainText = `${titleBase}${ringPart}`;
  const mainTextW = ctx.measureText(mainText).width;

  ctx.font = `900 24px ${FONT_SANS}`;
  const sexW = sexSymbol ? ctx.measureText(sexSymbol).width : 0;

  const totalTitleW = mainTextW + sexW;
  const startTitleX = (width - totalTitleW) / 2;

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = `900 25px ${FONT_SANS}`;
  ctx.fillStyle = '#dc2626';
  ctx.fillText(mainText, startTitleX, headerY);

  if (sexSymbol) {
    ctx.font = `900 24px ${FONT_SANS}`;
    ctx.fillStyle = '#000000';
    ctx.fillText(sexSymbol, startTitleX + mainTextW, headerY);
  }

  // 3. Fonction de dessin d'une case du modèle Elghali A4 (reproduit fidèlement renderBox de PedigreeCard.tsx)
  const sizeOffset = textSize === 'tres_grand' ? 1.0 : textSize === 'normal' ? -1.2 : 0;

  const drawElghaliBox = (
    id: number,
    gen: number,
    x: number,
    y: number,
    w: number,
    h: number
  ) => {
    const p = pigeons[id] || {
      id,
      ring: '',
      name: '',
      strain: '',
      owner: '',
      color: '',
      year: '',
      sex: (id === 0 ? 'M' : id % 2 === 1 ? 'M' : 'V') as 'M' | 'V',
      results: '',
      bgColor: '#ffffff',
    };

    const isMain = id === 0;
    const isParent = gen === 1;
    const bg = p.bgColor && p.bgColor.trim() !== '' ? p.bgColor : '#ffffff';
    const isColoredBg = bg.toLowerCase() !== '#ffffff' && bg.toLowerCase() !== '#fff';

    ctx.save();

    // Ombre légère pour la case principale G0
    if (isMain) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;
    }

    // Fond arrondi
    drawRoundedRect(ctx, x, y, w, h, 4);
    ctx.fillStyle = bg;
    ctx.fill();

    // Réinitialiser l'ombre avant la bordure et le texte
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Bordure selon la génération
    ctx.lineWidth = isMain ? 2 : isParent ? 1.8 : 1.5;
    ctx.strokeStyle = isMain ? '#2d3748' : isParent ? '#334155' : '#4a5568';
    ctx.stroke();

    // Découpage strict (overflow: hidden) à l'intérieur de la case
    drawRoundedRect(ctx, x + 1, y + 1, w - 2, h - 2, 3);
    ctx.clip();

    // Tailles de police en px (conversion fidèle des pt de PedigreeCard.tsx)
    let ringPx = 18.5 + sizeOffset;
    let sexPx = 17 + sizeOffset;
    let namePx = 16.5 + sizeOffset;
    let ownerPx = 14.2 + sizeOffset;
    let strainPx = 13.2 + sizeOffset;
    let resPx = 12.2 + sizeOffset * 0.7;

    if (isParent) {
      ringPx = 17.2 + sizeOffset;
      sexPx = 16 + sizeOffset;
      namePx = 15.2 + sizeOffset;
      ownerPx = 13.5 + sizeOffset;
      strainPx = 12.6 + sizeOffset;
      resPx = 11.8 + sizeOffset * 0.7;
    } else if (gen === 2) {
      ringPx = 15.6 + sizeOffset;
      sexPx = 14.5 + sizeOffset;
      namePx = 14 + sizeOffset;
      ownerPx = 12.5 + sizeOffset;
      strainPx = 11.5 + sizeOffset;
      resPx = 11 + sizeOffset * 0.6;
    } else if (gen === 3) {
      ringPx = 14.2 + sizeOffset;
      sexPx = 13.2 + sizeOffset;
      namePx = 12.8 + sizeOffset;
      ownerPx = 11.8 + sizeOffset;
      strainPx = 11.2 + sizeOffset;
      resPx = 10.4 + sizeOffset * 0.6;
    } else if (gen === 4) {
      ringPx = 12.2 + sizeOffset * 0.8;
      sexPx = 11.5 + sizeOffset * 0.8;
      namePx = 11 + sizeOffset * 0.8;
      ownerPx = 10.2 + sizeOffset * 0.8;
      strainPx = 9.5 + sizeOffset * 0.8;
      resPx = 9.4 + sizeOffset * 0.5;
    }

    const padX = isMain ? 8 : isParent ? 7 : gen === 4 ? 5 : 6;
    const padY = isMain ? 7 : isParent ? 6 : gen === 4 ? 3 : 4.5;
    const innerW = w - padX * 2;
    let curY = y + padY;

    // Ligne 1 : Numéro de Bague (gauche) + Symbole Sexe ♂/♀ (droite)
    const sexChar = p.sex === 'M' ? '♂' : '♀';
    ctx.font = `900 ${sexPx}px ${FONT_SANS}`;
    const sexCharW = ctx.measureText(sexChar).width;

    ctx.textBaseline = 'top';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#000000';
    ctx.fillText(sexChar, x + w - padX, curY);

    if (p.ring && p.ring.trim() !== '') {
      ctx.textAlign = 'left';
      ctx.font = `900 ${ringPx}px ${FONT_SANS}`;
      ctx.fillStyle = isColoredBg ? '#0f172a' : '#c53030';
      ctx.fillText(p.ring.trim(), x + padX, curY, Math.max(20, innerW - sexCharW - 4));
    }
    curY += ringPx + (gen === 4 ? 1.5 : 2.5);

    // Ligne 2 : Nom du pigeon entre guillemets
    if (p.name && p.name.trim() !== '' && curY + namePx <= y + h - 2) {
      const cleanName = p.name.trim();
      const quotedName =
        cleanName.startsWith('"') && cleanName.endsWith('"') ? cleanName : `"${cleanName}"`;
      ctx.textAlign = 'left';
      ctx.font = `700 ${namePx}px ${FONT_SANS}`;
      ctx.fillStyle = '#111827';
      ctx.fillText(quotedName, x + padX, curY, innerW);
      curY += namePx + (isMain ? 3 : gen === 4 ? 1 : 2);
    }

    // Ligne 3 : Éleveur / Propriétaire
    if (p.owner && p.owner.trim() !== '' && curY + ownerPx <= y + h - 2) {
      ctx.textAlign = 'left';
      ctx.font = `600 ${ownerPx}px ${FONT_SANS}`;
      ctx.fillStyle = '#1f2937';
      ctx.fillText(p.owner.trim(), x + padX, curY, innerW);
      curY += ownerPx + (gen === 4 ? 1 : 2);
    }

    // Ligne 4 : Souche / Couleur
    const strainColorText =
      p.strain && p.color && p.strain.trim().toLowerCase() !== p.color.trim().toLowerCase()
        ? `${p.strain.trim()} • ${p.color.trim()}`
        : (p.strain || p.color || '').trim();

    if (strainColorText && curY + strainPx <= y + h - 2) {
      ctx.textAlign = 'left';
      ctx.font = `500 ${strainPx}px ${FONT_SANS}`;
      ctx.fillStyle = '#374151';
      ctx.fillText(strainColorText, x + padX, curY, innerW);
      curY += strainPx + (gen === 4 ? 1.5 : 3);
    }

    // Lignes suivantes : Palmarès / Résultats multi-lignes avec ajustement automatique pour que tout rentre dans la case
    if (p.results && p.results.trim() !== '' && curY < y + h - 6) {
      const availH = y + h - padY - curY + 2;
      let candidateFontPx = resPx;
      const charCount = p.results.length;
      const rawLineCount = p.results.split('\n').length;

      if (isMain || isParent) {
        if (charCount > 350 || rawLineCount >= 12) candidateFontPx -= 1.8;
        else if (charCount > 200 || rawLineCount >= 8) candidateFontPx -= 1.0;
      } else if (gen === 2) {
        if (charCount > 250 || rawLineCount >= 10) candidateFontPx -= 1.6;
        else if (charCount > 140 || rawLineCount >= 6) candidateFontPx -= 0.9;
      } else if (gen === 3) {
        if (charCount > 160 || rawLineCount >= 7) candidateFontPx -= 1.5;
        else if (charCount > 90 || rawLineCount >= 4) candidateFontPx -= 0.8;
      } else if (gen === 4) {
        if (charCount > 90 || rawLineCount >= 4) candidateFontPx -= 1.4;
        else if (charCount > 40 || rawLineCount >= 3) candidateFontPx -= 0.7;
      }

      candidateFontPx = Math.max(6.8, candidateFontPx);
      ctx.font = `400 ${candidateFontPx}px ${FONT_SANS}`;
      let wrappedLines = wrapParagraphLines(ctx, p.results, innerW);
      let lineH = candidateFontPx * 1.24;

      // Si les lignes dépassent la hauteur disponible de la case, réduire progressivement la police jusqu'à ce que tout rentre
      while (wrappedLines.length * lineH > availH && candidateFontPx > 6.5) {
        candidateFontPx -= 0.4;
        ctx.font = `400 ${candidateFontPx}px ${FONT_SANS}`;
        wrappedLines = wrapParagraphLines(ctx, p.results, innerW);
        lineH = candidateFontPx * 1.22;
      }

      ctx.fillStyle = '#111827';
      ctx.textAlign = 'left';
      for (const line of wrappedLines) {
        if (curY + candidateFontPx > y + h - 1.5) break;
        ctx.fillText(line, x + padX, curY, innerW);
        curY += lineH;
      }
    }

    ctx.restore();
  };

  // 4. COORDONNÉES GÉOMÉTRIQUES EXACTES DU MODÈLE ELGHALI A4 (4 COLONNES + G0 DÉCALÉ)
  const padX = 16;
  const treeTop = 46;
  const footerHeight = 24;
  const treeHeight = height - treeTop - footerHeight - 6; // 1047px
  const treeWidth = width - padX * 2; // 762px

  const col1W = Math.round(treeWidth * 0.29); // 221px
  const col1X = padX;
  const effOffset = Math.max(35, g0Offset);

  // Hauteur de G0 au centre géométrique exact de la Colonne 1
  const g0H = 258;
  const g0Y = treeTop + (treeHeight - g0H) / 2;
  const halfCol1H = (treeHeight - g0H - 12) / 2; // ~388.5px

  // Logo circulaire (72x72px) en haut à gauche de la Colonne 1
  const logoSize = 72;
  const logoCx = col1X + 4 + logoSize / 2;
  const logoCy = treeTop + 1 + logoSize / 2;

  const isDefaultSvgLogo =
    !logoUrl ||
    logoUrl.includes('data:image/svg') ||
    logoUrl.includes('PHN2Zy') ||
    logoUrl.includes('<svg') ||
    logoUrl.includes('ABDESSSAMAD');

  if (isDefaultSvgLogo) {
    drawDefaultEmblem(ctx, logoCx, logoCy, logoSize / 2);
  } else {
    const customImg = await loadImageSafe(logoUrl);
    if (customImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(logoCx, logoCy, logoSize / 2 - 1, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(
        customImg,
        logoCx - logoSize / 2,
        logoCy - logoSize / 2,
        logoSize,
        logoSize
      );
      ctx.restore();

      ctx.beginPath();
      ctx.arc(logoCx, logoCy, logoSize / 2 - 1, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#cbd5e1';
      ctx.stroke();
    } else {
      drawDefaultEmblem(ctx, logoCx, logoCy, logoSize / 2);
    }
  }

  // Père #1 (G1 - décalé de effOffset vers la droite, au-dessus de G0)
  const parentBoxW = col1W - effOffset;
  const parentBoxX = col1X + effOffset;
  const fatherBoxH = Math.min(250, halfCol1H - 76);
  const fatherBoxY = g0Y - 6 - fatherBoxH;
  drawElghaliBox(1, 1, parentBoxX, fatherBoxY, parentBoxW, fatherBoxH);

  // Sujet Principal #0 (G0 - au centre géométrique, décalé vers la gauche sous le logo)
  drawElghaliBox(0, 0, col1X, g0Y, col1W - 6, g0H);

  // Mère #2 (G1 - décalée de effOffset vers la droite, en-dessous de G0)
  const motherBoxH = Math.min(250, halfCol1H - 76);
  const motherBoxY = g0Y + g0H + 6;
  drawElghaliBox(2, 1, parentBoxX, motherBoxY, parentBoxW, motherBoxH);

  // Colonnes 2, 3, 4 (Ancêtres G2, G3, G4 strictement face-à-face)
  const rightAreaX = col1X + col1W + 8;
  const rightAreaW = treeWidth - col1W - 8; // 533px
  const midGap = 16;
  const branchH = (treeHeight - midGap) / 2; // 515.5px

  const col2W = Math.round(rightAreaW * 0.32); // 170px
  const col2X = rightAreaX;

  const col34X = col2X + col2W + 8;
  const col34W = rightAreaW - col2W - 8; // 355px
  const col3W = Math.floor((col34W - 8) / 2); // 173px
  const col4W = col34W - col3W - 8; // 174px
  const col3X = col34X;
  const col4X = col3X + col3W + 8;

  const drawQuad = (
    quadY: number,
    quadH: number,
    g2Id: number,
    g3TopId: number,
    g3BotId: number,
    g4Ids: [number, number, number, number]
  ) => {
    // Case G2 (Grand-parent : #3, #4, #5 ou #6)
    drawElghaliBox(g2Id, 2, col2X, quadY, col2W, quadH);

    const pairGap = 4;
    const pairH = (quadH - pairGap) / 2;
    const g4Gap = 2;
    const g4H = (pairH - g4Gap) / 2;

    // Paire supérieure : G3 haut face à ses 2 parents G4
    drawElghaliBox(g3TopId, 3, col3X, quadY, col3W, pairH);
    drawElghaliBox(g4Ids[0], 4, col4X, quadY, col4W, g4H);
    drawElghaliBox(g4Ids[1], 4, col4X, quadY + g4H + g4Gap, col4W, g4H);

    // Paire inférieure : G3 bas face à ses 2 parents G4
    const pair2Y = quadY + pairH + pairGap;
    drawElghaliBox(g3BotId, 3, col3X, pair2Y, col3W, pairH);
    drawElghaliBox(g4Ids[2], 4, col4X, pair2Y, col4W, g4H);
    drawElghaliBox(g4Ids[3], 4, col4X, pair2Y + g4H + g4Gap, col4W, g4H);
  };

  const quadGap = 4;
  const quadH = (branchH - quadGap) / 2;

  // BRANCHE HAUTE (Paternelle : face au Père #1)
  // Quad 1 : #3 -> #7 (#15, #16) & #8 (#17, #18)
  drawQuad(treeTop, quadH, 3, 7, 8, [15, 16, 17, 18]);
  // Quad 2 : #4 -> #9 (#19, #20) & #10 (#21, #22)
  drawQuad(treeTop + quadH + quadGap, quadH, 4, 9, 10, [19, 20, 21, 22]);

  // BRANCHE BASSE (Maternelle : face à la Mère #2)
  const bottomBranchY = treeTop + branchH + midGap;
  // Quad 3 : #5 -> #11 (#23, #24) & #12 (#25, #26)
  drawQuad(bottomBranchY, quadH, 5, 11, 12, [23, 24, 25, 26]);
  // Quad 4 : #6 -> #13 (#27, #28) & #14 (#29, #30)
  drawQuad(bottomBranchY + quadH + quadGap, quadH, 6, 13, 14, [27, 28, 29, 30]);

  // 5. PIED DE PAGE OFFICIEL : "Pigeon Pedigree • Elghali"
  const footerLineY = height - footerHeight;
  ctx.beginPath();
  ctx.moveTo(padX, footerLineY);
  ctx.lineTo(width - padX, footerLineY);
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#e2e8f0';
  ctx.stroke();

  ctx.textBaseline = 'middle';
  const footerTextY = footerLineY + footerHeight / 2;

  if (showOwnerFooter && ownerName) {
    ctx.textAlign = 'left';
    ctx.font = `600 9.5px ${FONT_SANS}`;
    ctx.fillStyle = '#000000';
    ctx.fillText(ownerName, padX, footerTextY);
  }

  ctx.textAlign = 'right';
  ctx.font = `500 9px ${FONT_SANS}`;
  ctx.fillStyle = '#000000';
  ctx.fillText('Pigeon Pedigree • Elghali', width - padX, footerTextY);

  return canvas;
}
