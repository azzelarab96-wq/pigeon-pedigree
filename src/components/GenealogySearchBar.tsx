import React, { useState, useEffect, useRef } from 'react';
import { Search, Sparkles, GitBranch, ArrowRight, X, Database, FolderCheck, Award, CheckCircle2, ChevronRight, CornerDownRight } from 'lucide-react';
import { PigeonData, PedigreeProject } from '../types';
import {
  searchGenealogyPigeons,
  cascadeGenealogyTree,
  getBoxRoleName,
  GenealogySearchResult,
} from '../genealogyHelper';

interface GenealogySearchBarProps {
  currentPigeons: PigeonData[];
  selectedId: number;
  savedProjects: PedigreeProject[];
  onApplyPigeons: (updated: PigeonData[], message: string) => void;
  onOpenNewEmptyProject: () => void;
  onOpenImportModal: () => void;
  onSelectBox: (boxId: number) => void;
}

export const GenealogySearchBar: React.FC<GenealogySearchBarProps> = ({
  currentPigeons,
  selectedId,
  savedProjects,
  onApplyPigeons,
  onOpenNewEmptyProject,
  onOpenImportModal,
  onSelectBox,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GenealogySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<GenealogySearchResult | null>(null);
  const [targetBox, setTargetBox] = useState<number>(selectedId);
  const [includeParentsInBranch, setIncludeParentsInBranch] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);

  // Sync targetBox with selectedId when selectedId changes
  useEffect(() => {
    setTargetBox(selectedId);
  }, [selectedId]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query || query.trim().length < 1) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const found = await searchGenealogyPigeons(query, savedProjects, currentPigeons);
        setResults(found);
        setIsOpen(true);
      } catch (err) {
        console.error('Erreur recherche généalogique:', err);
      } finally {
        setIsSearching(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [query, savedProjects, currentPigeons]);

  const handleSelectPigeon = (item: GenealogySearchResult) => {
    setSelectedMatch(item);
  };

  const handleApplyFullTree = () => {
    if (!selectedMatch) return;
    const { updatedPigeons, filledCount } = cascadeGenealogyTree(currentPigeons, 0, selectedMatch);
    onApplyPigeons(
      updatedPigeons,
      `🌳 Arbre généalogique complet reconstitué pour le pigeon ${selectedMatch.ring} (${filledCount} cases remplies) !`
    );
    setSelectedMatch(null);
    setIsOpen(false);
    setQuery('');
  };

  const handleApplyToBox = () => {
    if (!selectedMatch) return;
    const { updatedPigeons, filledCount } = cascadeGenealogyTree(currentPigeons, targetBox, selectedMatch);
    onApplyPigeons(
      updatedPigeons,
      `🎯 Pigeon ${selectedMatch.ring} placé en ${getBoxRoleName(targetBox)} (${filledCount} case(s) mise(s) à jour).`
    );
    setSelectedMatch(null);
    setIsOpen(false);
    setQuery('');
  };

  const isModelEmpty =
    (!currentPigeons[0]?.ring || currentPigeons[0].ring.trim() === '') &&
    (!currentPigeons[1]?.ring || currentPigeons[1].ring.trim() === '') &&
    (!currentPigeons[2]?.ring || currentPigeons[2].ring.trim() === '');

  return (
    <div ref={containerRef} className="no-print relative w-full bg-slate-900 border-b border-slate-800 text-white px-3 py-2 z-30 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        
        {/* RECHERCHE DE BAGUE / AUTO-COMPLÉTION */}
        <div className="relative flex-1">
          <div className="relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-amber-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => {
                if (results.length > 0) setIsOpen(true);
              }}
              placeholder="🔍 Rechercher un N° de bague (ex: 593, BE 6075..., MA...) ou nom pour auto-remplir l'arbre..."
              className="w-full pl-9 pr-10 py-1.5 text-xs sm:text-sm bg-slate-800/95 hover:bg-slate-800 focus:bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 transition-all font-medium"
            />
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setResults([]);
                  setIsOpen(false);
                }}
                className="absolute right-3 p-0.5 text-slate-400 hover:text-white"
              >
                <X size={14} />
              </button>
            ) : (
              <span className="absolute right-3 text-[10px] text-slate-400 font-mono hidden sm:inline-block">
                Admin &amp; Projets
              </span>
            )}
          </div>

          {/* DROPDOWN DE RÉSULTATS DE RECHERCHE */}
          {isOpen && results.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-[360px] overflow-y-auto">
              <div className="p-2 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Database size={12} />
                  <span>{results.length} pigeon(s) trouvé(s)</span>
                </span>
                <span className="text-[10px]">Cliquez sur un pigeon pour auto-compléter l'arbre</span>
              </div>

              <div className="divide-y divide-slate-800">
                {results.map((r, i) => (
                  <button
                    key={`${r.ring}_${i}`}
                    type="button"
                    onClick={() => handleSelectPigeon(r)}
                    className="w-full p-2.5 text-left hover:bg-slate-800/90 transition-colors flex items-center justify-between gap-3 group cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs sm:text-sm text-red-400 tracking-wide font-mono group-hover:text-amber-300">
                          {r.ring}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          r.sex === 'M' ? 'bg-blue-900/60 text-blue-300 border border-blue-700/60' : 'bg-rose-900/60 text-rose-300 border border-rose-700/60'
                        }`}>
                          {r.sex === 'M' ? '♂ Mâle' : '♀ Femelle'}
                        </span>
                        {r.name && (
                          <span className="text-xs font-semibold text-slate-200 truncate">
                            « {r.name} »
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-400">
                        {r.strain && <span>Origine: <strong className="text-slate-300">{r.strain}</strong></span>}
                        {r.color && <span>Robe: <strong className="text-slate-300">{r.color}</strong></span>}
                        {r.owner && <span>Éleveur: <strong className="text-slate-300">{r.owner}</strong></span>}
                        {r.year && <span>Année: <strong className="text-slate-300">{r.year}</strong></span>}
                      </div>

                      {/* BADGE D'ARBRE GÉNÉTIQUE / ANCESTRES */}
                      <div className="flex items-center gap-2 mt-1.5">
                        {r.hasAncestors ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-700/60">
                            <GitBranch size={11} className="text-emerald-400" />
                            <span>Arbre génétique disponible ({r.ancestorCount} ancêtres répertoriés)</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                            Fiche individuelle
                          </span>
                        )}

                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          {r.source === 'database' ? (
                            <><Database size={10} className="text-blue-400" /> Base Admin</>
                          ) : r.source === 'saved_project' ? (
                            <><FolderCheck size={10} className="text-amber-400" /> {r.sourceLabel}</>
                          ) : (
                            <><Award size={10} className="text-yellow-400" /> Registre Officiel</>
                          )}
                        </span>
                      </div>
                    </div>

                    <ChevronRight size={16} className="text-slate-500 group-hover:text-amber-400 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ÉTAT AUCUN RÉSULTAT */}
          {isOpen && query.length >= 2 && !isSearching && results.length === 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700 rounded-xl p-4 text-center z-50 shadow-2xl">
              <p className="text-xs text-slate-300 font-semibold">
                Aucun pigeon trouvé pour « {query} ».
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Vous pouvez saisir ce numéro directement dans la case souhaitée, ou importer un pédigree (PDF/Photo).
              </p>
            </div>
          )}
        </div>

        {/* ACTIONS RAPIDES : NOUVEAU PROJET VIERGE & IMPORTER */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onOpenNewEmptyProject}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer ${
              isModelEmpty
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 ring-2 ring-emerald-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:text-white'
            }`}
            title="Ouvrir un nouveau projet avec le modèle A4 vierge prêt à être rempli"
          >
            <Sparkles size={13} className="text-emerald-400" />
            <span>Nouveau Projet Vierge</span>
          </button>

          <button
            type="button"
            onClick={onOpenImportModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white transition-all shadow-sm border border-red-400/50 cursor-pointer"
            title="Importer directement un document PDF ou une Photo sur le modèle"
          >
            <span>📄 Importer PDF / Photo</span>
          </button>
        </div>
      </div>

      {/* MODAL DE CHOIX D'APPLICATION DE L'ARBRE GÉNÉALOGIQUE */}
      {selectedMatch && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitBranch className="text-amber-400 w-5 h-5" />
                <h3 className="text-sm font-bold text-white">
                  Auto-remplissage généalogique du pigeon
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMatch(null)}
                className="p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Carte résumé du pigeon sélectionné */}
              <div className="bg-slate-800/90 p-3 rounded-xl border border-slate-700 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-red-400 font-mono">
                      {selectedMatch.ring}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      selectedMatch.sex === 'M' ? 'bg-blue-900 text-blue-300' : 'bg-rose-900 text-rose-300'
                    }`}>
                      {selectedMatch.sex === 'M' ? '♂ Mâle' : '♀ Femelle'}
                    </span>
                    {selectedMatch.name && (
                      <span className="text-sm font-bold text-slate-100">
                        « {selectedMatch.name} »
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {selectedMatch.sourceLabel}
                  </span>
                </div>

                <div className="text-xs text-slate-300 flex flex-wrap gap-x-3 gap-y-1">
                  {selectedMatch.strain && <span>Origine: <strong>{selectedMatch.strain}</strong></span>}
                  {selectedMatch.color && <span>Robe: <strong>{selectedMatch.color}</strong></span>}
                  {selectedMatch.owner && <span>Éleveur: <strong>{selectedMatch.owner}</strong></span>}
                  {selectedMatch.year && <span>Année: <strong>{selectedMatch.year}</strong></span>}
                </div>

                {selectedMatch.hasAncestors && (
                  <div className="mt-2 text-xs text-emerald-300 bg-emerald-950/60 p-2 rounded-lg border border-emerald-800/60 flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                    <span>
                      Ce pigeon possède <strong>{selectedMatch.ancestorCount} ancêtres</strong> (Père, Mère, Grands-parents...) enregistrés dans la base !
                    </span>
                  </div>
                )}
              </div>

              {/* OPTION 1 : RECONSTITUER TOUT L'ARBRE */}
              {selectedMatch.hasAncestors && (
                <div className="p-3.5 bg-gradient-to-r from-emerald-950/80 to-slate-900 rounded-xl border-2 border-emerald-600/80 shadow-md space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase text-emerald-300 flex items-center gap-1.5">
                        <Sparkles size={14} className="text-emerald-400" />
                        <span>Option Recommandée : Arbre Génétique Complet</span>
                      </h4>
                      <p className="text-[11px] text-slate-300 mt-1">
                        Place {selectedMatch.ring} en <strong>Sujet Principal (G0)</strong> et remplit automatiquement toute sa lignée (Père #1, Mère #2, 4 Grands-parents, 8 Arrière-grands-parents...).
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyFullTree}
                    className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    <GitBranch size={15} />
                    <span>Reconstituer Tout l'Arbre Génétique ({selectedMatch.ancestorCount + 1} cases)</span>
                  </button>
                </div>
              )}

              {/* OPTION 2 : INSÉRER DANS UNE CASE PRÉCISE */}
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 space-y-2.5">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <CornerDownRight size={13} className="text-amber-400" />
                  <span>Ou insérer dans une case spécifique de l'arbre :</span>
                </h4>

                <div className="flex items-center gap-2">
                  <label htmlFor="target-box-select" className="text-xs text-slate-400 shrink-0">
                    Position cible :
                  </label>
                  <select
                    id="target-box-select"
                    value={targetBox}
                    onChange={(e) => setTargetBox(Number(e.target.value))}
                    className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                  >
                    {Array.from({ length: 31 }, (_, i) => (
                      <option key={i} value={i}>
                        Case #{i} : {getBoxRoleName(i)}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleApplyToBox}
                  className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <ArrowRight size={14} />
                  <span>Insérer dans la {getBoxRoleName(targetBox)}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
