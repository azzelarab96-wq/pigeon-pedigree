import React, { useRef } from 'react';
import { Download } from 'lucide-react';
import { PedigreeTextSize, PedigreeTheme, PigeonData } from '../types';

interface PedigreeCardProps {
  pigeons: PigeonData[];
  selectedId: number;
  onSelectPigeon: (id: number) => void;
  theme: PedigreeTheme;
  textSize?: PedigreeTextSize;
  logoUrl?: string;
  ownerName: string;
  ownerDetails: string;
  showOwnerFooter: boolean;
  scale?: number;
  g0Offset?: number;
  onExportPdf?: () => void;
}

const DefaultEmblemSvg: React.FC = () => (
  <svg
    viewBox="0 0 200 200"
    width="100%"
    height="100%"
    className="w-full h-full rounded-full"
    style={{ display: 'block' }}
  >
    <defs>
      <path id="emblemTextCircle" d="M 20, 100 a 80,80 0 1,1 160,0 a 80,80 0 1,1 -160,0" />
      <linearGradient id="emblemBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#1e40af" />
        <stop offset="100%" stopColor="#0284c7" />
      </linearGradient>
      <linearGradient id="emblemRedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#dc2626" />
        <stop offset="100%" stopColor="#b91c1c" />
      </linearGradient>
    </defs>
    <circle cx="100" cy="100" r="96" fill="#ffffff" stroke="#0284c7" strokeWidth="4" />
    <circle cx="100" cy="100" r="88" fill="none" stroke="#0284c7" strokeWidth="1.5" strokeDasharray="3,3" />
    <text
      fontFamily="Arial, sans-serif"
      fontSize="11"
      fontWeight="bold"
      fill="#0369a1"
      letterSpacing="2"
    >
      <textPath href="#emblemTextCircle" startOffset="50%" textAnchor="middle">
        ABDESSSAMAD EL BAHDAOUI
      </textPath>
    </text>
    <circle cx="100" cy="100" r="66" fill="#f8fafc" stroke="#dc2626" strokeWidth="2" />
    <g transform="translate(100, 108)">
      <text
        x="-24"
        y="10"
        fontFamily="'Impact', 'Arial Black', sans-serif"
        fontSize="52"
        fontWeight="900"
        fill="url(#emblemBlueGrad)"
        letterSpacing="-3"
      >
        A
      </text>
      <text
        x="6"
        y="10"
        fontFamily="'Impact', 'Arial Black', sans-serif"
        fontSize="52"
        fontWeight="900"
        fill="url(#emblemRedGrad)"
        letterSpacing="-3"
      >
        B
      </text>
    </g>
  </svg>
);

export const PedigreeCard = React.forwardRef<HTMLDivElement, PedigreeCardProps>(
  (
    {
      pigeons,
      selectedId,
      onSelectPigeon,
      theme,
      textSize = 'grand',
      logoUrl,
      ownerName,
      ownerDetails,
      showOwnerFooter,
      scale = 1,
      g0Offset = 75,
      onExportPdf,
    },
    ref
  ) => {
    const boxRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

    const mainPigeon = pigeons[0] || {
      ring: '',
      sex: 'M',
      name: '',
      strain: '',
      owner: '',
      color: '',
      year: '',
      results: '',
      bgColor: '#ffffff',
    };

    const formatQuotes = (name: string) => {
      if (!name) return '';
      const trimmed = name.trim();
      if (trimmed.startsWith('"') && trimmed.endsWith('"')) return trimmed;
      return `"${trimmed}"`;
    };

    const renderBox = (id: number, gen: number) => {
      const p = pigeons[id] || {
        id,
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

      const isSelected = selectedId === id;
      const isMain = id === 0;
      const isParent = gen === 1;

      // Dynamic font sizing based on box generation and user text size setting
      const getBoxFontSizes = (
        boxGen: number,
        boxIsMain: boolean,
        boxIsParent: boolean,
        currentTextSize: PedigreeTextSize = 'grand'
      ) => {
        if (currentTextSize === 'tres_grand') {
          if (boxIsMain) {
            return {
              ring: 'text-[15.5pt]',
              sex: 'text-[14.5pt]',
              name: 'text-[14pt]',
              owner: 'text-[12pt]',
              strain: 'text-[11.2pt]',
              placeholder: 'text-[10pt]',
            };
          }
          if (boxIsParent) {
            return {
              ring: 'text-[14.5pt]',
              sex: 'text-[13.5pt]',
              name: 'text-[13pt]',
              owner: 'text-[11.2pt]',
              strain: 'text-[10.8pt]',
              placeholder: 'text-[9.5pt]',
            };
          }
          if (boxGen === 2) {
            return {
              ring: 'text-[13.2pt]',
              sex: 'text-[12pt]',
              name: 'text-[11.8pt]',
              owner: 'text-[10.5pt]',
              strain: 'text-[9.8pt]',
              placeholder: 'text-[9pt]',
            };
          }
          if (boxGen === 3) {
            return {
              ring: 'text-[12pt]',
              sex: 'text-[11.2pt]',
              name: 'text-[10.8pt]',
              owner: 'text-[9.8pt]',
              strain: 'text-[9.2pt]',
              placeholder: 'text-[8.5pt]',
            };
          }
          // boxGen === 4
          return {
            ring: 'text-[10.2pt]',
            sex: 'text-[9.5pt]',
            name: 'text-[9.2pt]',
            owner: 'text-[8.4pt]',
            strain: 'text-[7.8pt]',
            placeholder: 'text-[8pt]',
          };
        }

        if (currentTextSize === 'normal') {
          if (boxIsMain) {
            return {
              ring: 'text-[13pt]',
              sex: 'text-[12pt]',
              name: 'text-[11.5pt]',
              owner: 'text-[10pt]',
              strain: 'text-[9.5pt]',
              placeholder: 'text-[8.8pt]',
            };
          }
          if (boxIsParent) {
            return {
              ring: 'text-[12.2pt]',
              sex: 'text-[11.2pt]',
              name: 'text-[11pt]',
              owner: 'text-[9.5pt]',
              strain: 'text-[9pt]',
              placeholder: 'text-[8.5pt]',
            };
          }
          if (boxGen === 2) {
            return {
              ring: 'text-[11pt]',
              sex: 'text-[10.2pt]',
              name: 'text-[10pt]',
              owner: 'text-[8.8pt]',
              strain: 'text-[8pt]',
              placeholder: 'text-[8.2pt]',
            };
          }
          if (boxGen === 3) {
            return {
              ring: 'text-[10pt]',
              sex: 'text-[9.2pt]',
              name: 'text-[9pt]',
              owner: 'text-[8.2pt]',
              strain: 'text-[7.8pt]',
              placeholder: 'text-[7.8pt]',
            };
          }
          // boxGen === 4
          return {
            ring: 'text-[8.5pt]',
            sex: 'text-[8pt]',
            name: 'text-[7.6pt]',
            owner: 'text-[7pt]',
            strain: 'text-[6.5pt]',
            placeholder: 'text-[7pt]',
          };
        }

        // DEFAULT: 'grand' (Recommandé - Très lisible, taille confortable)
        if (boxIsMain) {
          return {
            ring: 'text-[14.5pt]',
            sex: 'text-[13.5pt]',
            name: 'text-[13pt]',
            owner: 'text-[11.2pt]',
            strain: 'text-[10.5pt]',
            placeholder: 'text-[9.5pt]',
          };
        }
        if (boxIsParent) {
          return {
            ring: 'text-[13.5pt]',
            sex: 'text-[12.5pt]',
            name: 'text-[12pt]',
            owner: 'text-[10.5pt]',
            strain: 'text-[10pt]',
            placeholder: 'text-[9pt]',
          };
        }
        if (boxGen === 2) {
          return {
            ring: 'text-[12.2pt]',
            sex: 'text-[11.2pt]',
            name: 'text-[11pt]',
            owner: 'text-[9.8pt]',
            strain: 'text-[9pt]',
            placeholder: 'text-[8.8pt]',
          };
        }
        if (boxGen === 3) {
          return {
            ring: 'text-[11.2pt]',
            sex: 'text-[10.5pt]',
            name: 'text-[10pt]',
            owner: 'text-[9.2pt]',
            strain: 'text-[8.8pt]',
            placeholder: 'text-[8.2pt]',
          };
        }
        // boxGen === 4
        return {
          ring: 'text-[9.5pt]',
          sex: 'text-[9pt]',
          name: 'text-[8.5pt]',
          owner: 'text-[7.8pt]',
          strain: 'text-[7.2pt]',
          placeholder: 'text-[7.8pt]',
        };
      };

      // Sizing for results: keeps words intact and legible without overlapping lines or crossing borders
      const getResultsStyle = (
        results: string,
        boxGen: number,
        boxIsMain: boolean,
        boxIsParent: boolean
      ) => {
        const charCount = results.length;
        const lineCount = results.split('\n').length;

        if (textSize === 'tres_grand') {
          if (boxIsMain) {
            if (charCount > 350 || lineCount >= 12) return 'text-[8.6pt] leading-[1.28] mt-1.5 pt-0.5';
            if (charCount > 200 || lineCount >= 8) return 'text-[9.4pt] leading-[1.3] mt-1.5 pt-0.5';
            return 'text-[10.2pt] leading-[1.3] mt-1.5 pt-0.5';
          }
          if (boxIsParent) {
            if (charCount > 350 || lineCount >= 12) return 'text-[8.4pt] leading-[1.26] mt-1';
            if (charCount > 200 || lineCount >= 8) return 'text-[9.2pt] leading-[1.28] mt-1';
            return 'text-[10pt] leading-[1.3] mt-1';
          }
          if (boxGen === 2) {
            if (charCount > 250 || lineCount >= 10) return 'text-[8pt] leading-[1.24] mt-0.5';
            if (charCount > 140 || lineCount >= 6) return 'text-[8.8pt] leading-[1.26] mt-0.5';
            return 'text-[9.6pt] leading-[1.28] mt-0.5';
          }
          if (boxGen === 3) {
            if (charCount > 160 || lineCount >= 7) return 'text-[7.6pt] leading-[1.22] mt-0.5';
            if (charCount > 90 || lineCount >= 4) return 'text-[8.4pt] leading-[1.25] mt-0.5';
            return 'text-[9.2pt] leading-[1.28] mt-0.5';
          }
          // Gen 4
          if (charCount > 90 || lineCount >= 4) return 'text-[7pt] leading-[1.2] mt-0.5';
          if (charCount > 40 || lineCount >= 3) return 'text-[7.8pt] leading-[1.22] mt-0.5';
          return 'text-[8.4pt] leading-[1.25] mt-0.5';
        }

        if (textSize === 'normal') {
          if (boxIsMain) {
            if (charCount > 350 || lineCount >= 12) return 'text-[7.5pt] leading-[1.3] mt-1.5 pt-0.5';
            if (charCount > 200 || lineCount >= 8) return 'text-[8.2pt] leading-[1.3] mt-1.5 pt-0.5';
            return 'text-[8.8pt] leading-[1.3] mt-1.5 pt-0.5';
          }
          if (boxIsParent) {
            if (charCount > 350 || lineCount >= 12) return 'text-[7.5pt] leading-[1.26] mt-1';
            if (charCount > 200 || lineCount >= 8) return 'text-[8.2pt] leading-[1.28] mt-1';
            return 'text-[8.8pt] leading-[1.3] mt-1';
          }
          if (boxGen === 2) {
            if (charCount > 250 || lineCount >= 10) return 'text-[7pt] leading-[1.24] mt-0.5';
            if (charCount > 140 || lineCount >= 6) return 'text-[7.6pt] leading-[1.26] mt-0.5';
            return 'text-[8.2pt] leading-[1.28] mt-0.5';
          }
          if (boxGen === 3) {
            if (charCount > 160 || lineCount >= 7) return 'text-[6.6pt] leading-[1.22] mt-0.5';
            if (charCount > 90 || lineCount >= 4) return 'text-[7.2pt] leading-[1.25] mt-0.5';
            return 'text-[7.8pt] leading-[1.28] mt-0.5';
          }
          // Gen 4
          if (charCount > 90 || lineCount >= 4) return 'text-[6pt] leading-[1.2] mt-0.5';
          if (charCount > 40 || lineCount >= 3) return 'text-[6.6pt] leading-[1.22] mt-0.5';
          return 'text-[7.2pt] leading-[1.25] mt-0.5';
        }

        // DEFAULT: 'grand' (Recommandé)
        if (boxIsMain) {
          if (charCount > 350 || lineCount >= 12) return 'text-[8pt] leading-[1.3] mt-1.5 pt-0.5';
          if (charCount > 200 || lineCount >= 8) return 'text-[8.8pt] leading-[1.3] mt-1.5 pt-0.5';
          return 'text-[9.5pt] leading-[1.3] mt-1.5 pt-0.5';
        }
        if (boxIsParent) {
          if (charCount > 350 || lineCount >= 12) return 'text-[8pt] leading-[1.26] mt-1';
          if (charCount > 200 || lineCount >= 8) return 'text-[8.8pt] leading-[1.28] mt-1';
          return 'text-[9.5pt] leading-[1.3] mt-1';
        }
        if (boxGen === 2) {
          if (charCount > 250 || lineCount >= 10) return 'text-[7.5pt] leading-[1.24] mt-0.5';
          if (charCount > 140 || lineCount >= 6) return 'text-[8.2pt] leading-[1.26] mt-0.5';
          return 'text-[8.8pt] leading-[1.28] mt-0.5';
        }
        if (boxGen === 3) {
          if (charCount > 160 || lineCount >= 7) return 'text-[7pt] leading-[1.22] mt-0.5';
          if (charCount > 90 || lineCount >= 4) return 'text-[7.8pt] leading-[1.25] mt-0.5';
          return 'text-[8.5pt] leading-[1.28] mt-0.5';
        }
        // Gen 4
        if (charCount > 90 || lineCount >= 4) return 'text-[6.5pt] leading-[1.2] mt-0.5';
        if (charCount > 40 || lineCount >= 3) return 'text-[7.2pt] leading-[1.22] mt-0.5';
        return 'text-[7.8pt] leading-[1.25] mt-0.5';
      };

      const sizes = getBoxFontSizes(gen, isMain, isParent, textSize);

      // 1. ELGHALI MODÈLE (Style Officiel A4 - Bagues rouges, symboles ♂/♀ & décalage G0)
      if (theme === 'elghali') {
        const isGreen = p.bgColor && p.bgColor !== '#ffffff' && p.bgColor !== '#fff';
        const ringColor = isGreen ? 'text-slate-900 font-black' : 'text-[#c53030] font-black';
        const borderColor = isSelected
          ? 'border-2 border-red-600 shadow-lg ring-2 ring-red-400'
          : isMain
          ? 'border-[2px] border-[#2d3748] shadow-sm'
          : isParent
          ? 'border-[1.8px] border-[#334155] shadow-xs'
          : 'border-[1.5px] border-[#4a5568]';

        return (
          <div
            key={id}
            ref={(el) => {
              boxRefs.current[id] = el;
            }}
            onClick={() => onSelectPigeon(id)}
            style={{ backgroundColor: p.bgColor || '#ffffff' }}
            className={`w-full h-full rounded-[4px] ${
              isMain
                ? 'p-2'
                : isParent
                ? 'px-2 py-1.5'
                : gen === 4
                ? 'px-1.5 py-0.5'
                : 'px-1.5 py-1'
            } flex flex-col justify-start overflow-hidden cursor-pointer transition-all relative ${borderColor}`}
          >
            {/* Top row: Ring + Sex icon badge */}
            <div className="flex items-center justify-between mb-0 leading-none">
              <span className={`tracking-tight ${sizes.ring} ${ringColor}`}>
                {p.ring ? (
                  p.ring
                ) : (
                  <span
                    className={`italic print:hidden ${
                      isSelected
                        ? 'text-red-600 font-bold not-italic'
                        : 'text-slate-300 font-normal'
                    } ${sizes.placeholder}`}
                  >
                    {id === 0
                      ? 'Sujet #0 (G0)'
                      : id === 1
                      ? 'Père #1 (G1)'
                      : id === 2
                      ? 'Mère #2 (G1)'
                      : `#${id}`}
                  </span>
                )}
              </span>
              <span
                className={`inline-flex items-center justify-center font-black ${sizes.sex} leading-none text-black`}
              >
                {p.sex === 'M' ? '♂' : '♀'}
              </span>
            </div>

            {/* Pigeon Name in quotes - Whole words, never broken or truncated */}
            {p.name && (
              <div
                className={`font-bold text-[#111827] leading-tight break-normal ${sizes.name} ${
                  isMain ? 'mb-0.5' : ''
                }`}
              >
                {formatQuotes(p.name)}
              </div>
            )}

            {/* Breeder / Owner & Strain/Color - Whole words, never split */}
            {gen === 4 ? (
              <>
                {p.owner && (
                  <div className={`font-semibold text-[#1f2937] leading-tight ${sizes.owner} break-normal`}>
                    {p.owner}
                  </div>
                )}
                {(p.strain || p.color) && (
                  <div className={`text-[#374151] font-medium leading-tight ${sizes.strain} break-normal`}>
                    {p.strain && p.color && p.strain.toLowerCase() !== p.color.toLowerCase()
                      ? `${p.strain} • ${p.color}`
                      : p.strain || p.color}
                  </div>
                )}
              </>
            ) : (
              <>
                {p.owner && (
                  <div
                    className={`font-semibold text-[#1f2937] leading-tight break-normal ${sizes.owner}`}
                  >
                    {p.owner}
                  </div>
                )}

                {(p.strain || p.color) && (
                  <div
                    className={`text-[#374151] font-medium leading-tight break-normal whitespace-pre-line ${sizes.strain}`}
                  >
                    {p.strain && p.color && p.strain.toLowerCase() !== p.color.toLowerCase()
                      ? `${p.strain} • ${p.color}`
                      : p.strain || p.color}
                  </div>
                )}
              </>
            )}

            {/* Results / Breeding details - Words stay intact (break-normal), never split */}
            {p.results && (
              <div
                className={`text-[#111827] font-normal whitespace-pre-line break-normal ${getResultsStyle(
                  p.results,
                  gen,
                  isMain,
                  isParent
                )}`}
              >
                {p.results}
              </div>
            )}
          </div>
        );
      }

      // 2. COMPUCLUB 5 or 4 GENERATIONS
      if (theme === 'compuclub' || theme === 'compuclub4') {
        const isCompu4 = theme === 'compuclub4';
        const borderColor = isSelected
          ? 'border-2 border-red-600 shadow-md ring-2 ring-red-300'
          : 'border-2 border-black';

        return (
          <div
            key={id}
            ref={(el) => {
              boxRefs.current[id] = el;
            }}
            onClick={() => onSelectPigeon(id)}
            style={{
              backgroundColor: '#ffffff',
              fontFamily: '"Courier New", Courier, monospace',
            }}
            className={`w-full h-full rounded-none ${
              gen === 4 ? 'px-1 py-0.5' : 'p-1'
            } flex flex-col justify-start overflow-hidden cursor-pointer ${borderColor}`}
          >
            <div className={`text-[#cc0000] font-bold ${sizes.ring} leading-tight mb-0.5`}>
              {p.ring} {p.sex ? p.sex : ''}
            </div>
            {p.name && (
              <div className={`text-black ${sizes.name} leading-tight font-normal break-normal`}>
                {p.name}
              </div>
            )}
            {p.strain && (
              <div className={`text-black ${sizes.strain} leading-tight font-normal break-normal`}>
                {p.strain}
              </div>
            )}
            {p.owner && (
              <div className={`text-black ${sizes.owner} leading-tight font-normal break-normal`}>
                {p.owner}
              </div>
            )}
            {p.results && (
              <div
                className={`text-black whitespace-pre-line break-normal ${
                  isCompu4
                    ? 'text-[8.5pt] leading-tight mt-1'
                    : gen === 4
                    ? p.results.length > 60 || p.results.split('\n').length >= 3
                      ? 'text-[6.8pt] leading-[1.15] mt-0.5'
                      : 'text-[7.4pt] leading-[1.18] mt-0.5'
                    : 'text-[7.8pt] leading-[1.2] mt-0.5'
                }`}
              >
                {p.results}
              </div>
            )}
          </div>
        );
      }

      // 3. CLASSIC THEME
      return (
        <div
          key={id}
          ref={(el) => {
            boxRefs.current[id] = el;
          }}
          onClick={() => onSelectPigeon(id)}
          style={{ backgroundColor: p.bgColor || '#ffffff' }}
          className={`w-full h-full border-2 border-black ${
            gen === 4 ? 'px-1 py-0.5' : 'p-1'
          } flex flex-col justify-start overflow-hidden cursor-pointer relative ${
            isSelected ? 'outline outline-3 outline-red-600' : ''
          }`}
        >
          <span className={`absolute top-1 right-1 font-bold ${sizes.sex}`}>
            {p.sex === 'M' ? '♂' : '♀'}
          </span>
          <div className={`font-bold ${sizes.ring} text-[#c53030]`}>
            {p.ring}
          </div>
          {p.name && (
            <div className={`font-bold ${sizes.name} text-[#2f855a] italic break-normal`}>
              {p.name}
            </div>
          )}
          {p.strain && (
            <div className={`font-bold ${sizes.strain} text-[#742a2a] uppercase break-normal`}>
              {p.strain}
            </div>
          )}
          {p.owner && (
            <div className={`font-bold ${sizes.owner} text-[#2b6cb0] break-normal`}>
              {p.owner}
            </div>
          )}
          {p.color && (
            <div className="text-[6.5pt] text-slate-500 break-normal">{p.color}</div>
          )}
          {p.results && (
            <div
              className={`text-black border-t border-dashed border-slate-300 pt-0.5 whitespace-pre-line break-normal ${
                gen === 4
                  ? p.results.length > 50 || p.results.split('\n').length >= 3
                    ? 'text-[6.5pt] leading-[1.12] mt-0.5'
                    : 'text-[7.2pt] leading-[1.16] mt-0.5'
                  : 'text-[7.6pt] leading-[1.2] mt-0.5'
              }`}
            >
              {p.results}
            </div>
          )}
        </div>
      );
    };

    return (
      <div
        ref={ref}
        id="pedigreeCardSheet"
        style={{
          width: '794px',
          height: '1123px',
          minWidth: '794px',
          minHeight: '1123px',
          maxWidth: '794px',
          maxHeight: '1123px',
          transform: scale !== 1 ? `scale(${scale})` : undefined,
          transformOrigin: 'top center',
        }}
        className="pedigree-sheet bg-white px-4 pt-2.5 pb-2.5 flex flex-col relative select-none shadow-2xl border-2 border-slate-800 box-border overflow-hidden"
      >
        {/* GRAND BOUTON VERT SUR LA CARTE (Masqué à l'exportation et à l'impression) */}
        {onExportPdf && (
          <button
            type="button"
            data-html2canvas-ignore="true"
            onClick={(e) => {
              e.stopPropagation();
              onExportPdf();
            }}
            className="no-print absolute top-3 right-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-xs sm:text-sm px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2 cursor-pointer z-50 border-2 border-white ring-4 ring-emerald-400/50 transition-all hover:scale-105 active:scale-95"
            title="Télécharger ce pédigree en PDF A4"
          >
            <Download size={17} className="animate-bounce" />
            <span>TÉLÉCHARGER PDF (A4)</span>
          </button>
        )}

        {/* HEADER */}
        {theme === 'elghali' ? (
          <div className="text-center pb-1 mb-1 relative shrink-0">
            <h1 className="text-[20pt] font-black tracking-tight text-[#dc2626] flex items-center justify-center gap-2">
              <span>Pigeon Pedigree</span>
              {mainPigeon.ring && (
                <>
                  <span className="text-[#dc2626]">- {mainPigeon.ring}</span>
                  <span className="text-[19pt] font-black text-black">
                    {mainPigeon.sex === 'M' ? '♂' : '♀'}
                  </span>
                </>
              )}
            </h1>
          </div>
        ) : theme === 'compuclub' || theme === 'compuclub4' ? (
          <div className="text-center mb-1.5 shrink-0">
            <h1
              style={{ fontFamily: '"Courier New", Courier, monospace' }}
              className="text-[17pt] font-bold text-black"
            >
              {mainPigeon.ring
                ? `Pigeon Pedigree: ${mainPigeon.ring} ${mainPigeon.sex}`
                : 'Pigeon Pedigree'}
            </h1>
          </div>
        ) : (
          <div className="text-center border-b-2 border-black pb-1 mb-1.5 shrink-0">
            <h1 className="text-[16pt] font-bold text-black">
              {mainPigeon.ring ? `Pigeon Pedigree : ${mainPigeon.ring}` : 'Pigeon Pedigree'}
            </h1>
          </div>
        )}

        {/* 
          ======================================================================
          TREE CONTAINER:
          - Stays 100% INSIDE the grand cadre (overflow-hidden & flex-1 min-h-0)!
          - Every child box is STRICTLY parallel & face-to-face with its 2 parents!
          - G0 (Sujet) is THE MAIN BOX: TALL, prominent, bold, all results visible!
          - G0 is offset to the left under the Logo ("ti décalage"), between Father #1 and Mother #2!
          ======================================================================
        */}
        <div className="flex-1 min-h-0 flex gap-2 relative w-full overflow-hidden">
          {theme === 'elghali' ? (
            <div className="w-full h-full flex flex-row gap-2">
              {/* 
                COLUMN 1:
                - Circular Logo AB (flush left) at top
                - Father #1 (shifted right by effectiveOffset)
                - SUJET G0 #0: CASE PRINCIPALE EXACTEMENT AU CENTRE DE LA CONSTRUCTION
                  (avec un espace rigoureusement identique au-dessus et en-dessous de G0)
                - Mother #2 (shifted right by effectiveOffset, aligned with Father)
                - Bottom balancing spacer (symmetrical to the top logo)
              */}
              <div className="w-[29%] flex flex-col justify-between h-full py-0 shrink-0">
                {/* TOP HALF OF COLUMN 1: Aligned with TOP BRANCH */}
                <div className="flex-1 min-h-0 flex flex-col justify-between">
                  {/* Circular Logo AB (Flush left) */}
                  <div className="h-[74px] flex items-center justify-start pl-1 shrink-0">
                    {logoUrl ? (
                      <div className="w-[72px] h-[72px] rounded-full overflow-hidden border-2 border-slate-300 shadow-sm flex items-center justify-center bg-white">
                        {logoUrl.includes('data:image/svg') ||
                        logoUrl.includes('PHN2Zy') ||
                        logoUrl.includes('<svg') ||
                        logoUrl.includes('ABDESSSAMAD') ? (
                          <DefaultEmblemSvg />
                        ) : (
                          <img
                            src={logoUrl}
                            alt="Logo Colombier"
                            crossOrigin={logoUrl.startsWith('http') ? 'anonymous' : undefined}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                    ) : (
                      <div className="w-[72px] h-[72px] rounded-full border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400 text-[9px] text-center p-1">
                        <span>Logo</span>
                      </div>
                    )}
                  </div>

                  {/* Father #1 (G1) - Décalage minimum fixé à 35px */}
                  <div
                    style={{
                      marginLeft: `${Math.max(35, g0Offset)}px`,
                      width: `calc(100% - ${Math.max(35, g0Offset)}px)`,
                    }}
                    className="flex-1 min-h-0 max-h-[250px] mb-1.5"
                  >
                    {renderBox(1, 1)}
                  </div>
                </div>

                {/* EXACT CENTRE DE LA CONSTRUCTION : SUJET G0 #0
                    Positionné au centre géométrique du pédigree avec le même espace (1.5 = 6px)
                    vers le Père G1 et vers la Mère G2, légèrement rehaussé pour un équilibre parfait */}
                <div className="h-[258px] shrink-0 ml-0 mr-[6px] w-[calc(100%-6px)] my-1.5 z-20 shadow-md">
                  {renderBox(0, 0)}
                </div>

                {/* BOTTOM HALF OF COLUMN 1: Aligned with BOTTOM BRANCH */}
                <div className="flex-1 min-h-0 flex flex-col justify-between">
                  {/* Mother #2 (G2) - Décalage minimum fixé à 35px, même hauteur et forme que G1 */}
                  <div
                    style={{
                      marginLeft: `${Math.max(35, g0Offset)}px`,
                      width: `calc(100% - ${Math.max(35, g0Offset)}px)`,
                    }}
                    className="flex-1 min-h-0 max-h-[250px] mt-1.5"
                  >
                    {renderBox(2, 1)}
                  </div>

                  {/* Espace bas symétrique au logo supérieur (74px) pour centrer parfaitement G0 */}
                  <div className="h-[74px] shrink-0" />
                </div>
              </div>

              {/* 
                COLUMNS 2, 3, 4:
                Strictly parallel & face-to-face hierarchy!
                Top branch + Middle gap + Bottom branch (Pure flex-1 min-h-0)
              */}
              <div className="flex-1 min-h-0 flex flex-col justify-between h-full">
                {/* TOP BRANCH: PATERNAL ANCESTORS (Facing Father #1) */}
                <div className="flex-1 min-h-0 flex flex-col justify-between gap-1">
                  {/* QUAD 1: Facing Grand-père #3 */}
                  <div className="flex-1 min-h-0 flex gap-2">
                    {/* COL 2: Grand-père #3 */}
                    <div className="w-[32%] h-full">{renderBox(3, 2)}</div>

                    {/* COL 3 & 4: PAIR 1 & PAIR 2 (Strictly face-to-face!) */}
                    <div className="flex-1 min-h-0 flex flex-col justify-between gap-1 h-full">
                      {/* PAIR 1: #7 (Child) facing #15 & #16 (Parents) */}
                      <div className="flex-1 min-h-0 flex gap-2">
                        <div className="w-[49%] h-full">{renderBox(7, 3)}</div>
                        <div className="w-[49%] h-full flex flex-col justify-between gap-0.5">
                          <div className="flex-1 min-h-0">{renderBox(15, 4)}</div>
                          <div className="flex-1 min-h-0">{renderBox(16, 4)}</div>
                        </div>
                      </div>

                      {/* PAIR 2: #8 (Child - Green) facing #17 & #18 (Parents) */}
                      <div className="flex-1 min-h-0 flex gap-2">
                        <div className="w-[49%] h-full">{renderBox(8, 3)}</div>
                        <div className="w-[49%] h-full flex flex-col justify-between gap-0.5">
                          <div className="flex-1 min-h-0">{renderBox(17, 4)}</div>
                          <div className="flex-1 min-h-0">{renderBox(18, 4)}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* QUAD 2: Facing Grand-mère #4 */}
                  <div className="flex-1 min-h-0 flex gap-2">
                    {/* COL 2: Grand-mère #4 */}
                    <div className="w-[32%] h-full">{renderBox(4, 2)}</div>

                    {/* COL 3 & 4: PAIR 3 & PAIR 4 (Strictly face-to-face!) */}
                    <div className="flex-1 min-h-0 flex flex-col justify-between gap-1 h-full">
                      {/* PAIR 3: #9 (Child) facing #19 & #20 (Parents) */}
                      <div className="flex-1 min-h-0 flex gap-2">
                        <div className="w-[49%] h-full">{renderBox(9, 3)}</div>
                        <div className="w-[49%] h-full flex flex-col justify-between gap-0.5">
                          <div className="flex-1 min-h-0">{renderBox(19, 4)}</div>
                          <div className="flex-1 min-h-0">{renderBox(20, 4)}</div>
                        </div>
                      </div>

                      {/* PAIR 4: #10 (Child - Green) facing #21 & #22 (Parents) */}
                      <div className="flex-1 min-h-0 flex gap-2">
                        <div className="w-[49%] h-full">{renderBox(10, 3)}</div>
                        <div className="w-[49%] h-full flex flex-col justify-between gap-0.5">
                          <div className="flex-1 min-h-0">{renderBox(21, 4)}</div>
                          <div className="flex-1 min-h-0">{renderBox(22, 4)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* MIDDLE GAP: Clean horizontal separation facing center of G0 */}
                <div className="h-4 shrink-0 pointer-events-none" />

                {/* BOTTOM BRANCH: MATERNAL ANCESTORS (Facing Mother #2) */}
                <div className="flex-1 min-h-0 flex flex-col justify-between gap-1">
                  {/* QUAD 3: Facing Grand-père #5 */}
                  <div className="flex-1 min-h-0 flex gap-2">
                    {/* COL 2: Grand-père #5 */}
                    <div className="w-[32%] h-full">{renderBox(5, 2)}</div>

                    {/* COL 3 & 4: PAIR 5 & PAIR 6 (Strictly face-to-face!) */}
                    <div className="flex-1 min-h-0 flex flex-col justify-between gap-1 h-full">
                      {/* PAIR 5: #11 (Child) facing #23 & #24 (Parents) */}
                      <div className="flex-1 min-h-0 flex gap-2">
                        <div className="w-[49%] h-full">{renderBox(11, 3)}</div>
                        <div className="w-[49%] h-full flex flex-col justify-between gap-0.5">
                          <div className="flex-1 min-h-0">{renderBox(23, 4)}</div>
                          <div className="flex-1 min-h-0">{renderBox(24, 4)}</div>
                        </div>
                      </div>

                      {/* PAIR 6: #12 (Child) facing #25 & #26 (Parents) */}
                      <div className="flex-1 min-h-0 flex gap-2">
                        <div className="w-[49%] h-full">{renderBox(12, 3)}</div>
                        <div className="w-[49%] h-full flex flex-col justify-between gap-0.5">
                          <div className="flex-1 min-h-0">{renderBox(25, 4)}</div>
                          <div className="flex-1 min-h-0">{renderBox(26, 4)}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* QUAD 4: Facing Grand-mère #6 */}
                  <div className="flex-1 min-h-0 flex gap-2">
                    {/* COL 2: Grand-mère #6 */}
                    <div className="w-[32%] h-full">{renderBox(6, 2)}</div>

                    {/* COL 3 & 4: PAIR 7 & PAIR 8 (Strictly face-to-face!) */}
                    <div className="flex-1 min-h-0 flex flex-col justify-between gap-1 h-full">
                      {/* PAIR 7: #13 (Child) facing #27 & #28 (Parents) */}
                      <div className="flex-1 min-h-0 flex gap-2">
                        <div className="w-[49%] h-full">{renderBox(13, 3)}</div>
                        <div className="w-[49%] h-full flex flex-col justify-between gap-0.5">
                          <div className="flex-1 min-h-0">{renderBox(27, 4)}</div>
                          <div className="flex-1 min-h-0">{renderBox(28, 4)}</div>
                        </div>
                      </div>

                      {/* PAIR 8: #14 (Child) facing #29 & #30 (Parents) */}
                      <div className="flex-1 min-h-0 flex gap-2">
                        <div className="w-[49%] h-full">{renderBox(14, 3)}</div>
                        <div className="w-[49%] h-full flex flex-col justify-between gap-0.5">
                          <div className="flex-1 min-h-0">{renderBox(29, 4)}</div>
                          <div className="flex-1 min-h-0">{renderBox(30, 4)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Fallback identique pour compatibilité */
            <div className="w-full h-full flex flex-row gap-2">
              <div className="w-[29%] flex flex-col justify-between h-full py-0 shrink-0">
                <div className="h-[258px] shrink-0 ml-0 mr-[6px] w-[calc(100%-6px)] my-1.5 z-20 shadow-md">
                  {renderBox(0, 0)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER BAS DU PÉDIGREE : Pigeon Pedigree • Elghali en noir et très petit (Aucun autre texte) */}
        <div className="mt-1 pt-1 border-t border-slate-200 flex justify-between items-center text-[7pt] text-black shrink-0">
          <div>
            {showOwnerFooter && ownerName ? (
              <span className="font-semibold text-black">{ownerName}</span>
            ) : (
              <span />
            )}
          </div>
          <div className="text-[6.5pt] text-black font-medium tracking-wider">
            Pigeon Pedigree • Elghali
          </div>
        </div>
      </div>
    );
  }
);

PedigreeCard.displayName = 'PedigreeCard';
