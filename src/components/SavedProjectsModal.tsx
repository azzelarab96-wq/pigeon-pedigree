import React, { useState } from 'react';
import {
  FolderOpen,
  Save,
  Trash2,
  Download,
  Copy,
  Clock,
  Search,
  X,
  FileCheck,
  CheckCircle,
  Sparkles,
  ArrowRight,
  Upload,
} from 'lucide-react';
import { PedigreeProject, PedigreeTheme } from '../types';

interface SavedProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: PedigreeProject[];
  currentRing: string;
  currentName?: string;
  currentUser?: any;
  onLoadProject: (project: PedigreeProject) => void;
  onSaveCurrentProject: (customName?: string) => void;
  onDeleteProject: (id: string) => void;
  onExportProjectJson: (project: PedigreeProject) => void;
  onImportProjectsJson: (imported: PedigreeProject[]) => void;
  onOpenImportModal?: () => void;
  onSyncWithFirebase?: () => void;
}

export const SavedProjectsModal: React.FC<SavedProjectsModalProps> = ({
  isOpen,
  onClose,
  projects,
  currentRing,
  currentName,
  currentUser,
  onLoadProject,
  onSaveCurrentProject,
  onDeleteProject,
  onExportProjectJson,
  onImportProjectsJson,
  onOpenImportModal,
  onSyncWithFirebase,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [saveNameInput, setSaveNameInput] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredProjects = projects.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (p.ring || '').toLowerCase().includes(q) ||
      (p.name || '').toLowerCase().includes(q) ||
      (p.ownerName || '').toLowerCase().includes(q) ||
      (p.theme || '').toLowerCase().includes(q)
    );
  });

  const handleQuickSave = () => {
    onSaveCurrentProject(saveNameInput.trim() || undefined);
    setSaveNameInput('');
  };

  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          onImportProjectsJson(parsed);
        } else if (parsed && parsed.pigeons) {
          onImportProjectsJson([parsed]);
        }
      } catch (err: any) {
        console.error('Erreur lors de la lecture du fichier JSON :', err?.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const getThemeBadge = (t: PedigreeTheme) => {
    return (
      <span className="text-[10px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded-full border border-red-200">
        ★ Modèle Officiel Elghali A4 (5 Gen)
      </span>
    );
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Récemment';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* HEADER */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 backdrop-blur-md flex items-center justify-center text-blue-300">
              <FolderOpen size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Projets Enregistrés</h3>
                <span className="text-xs bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded-full border border-blue-400/30 font-semibold">
                  {projects.length} {projects.length > 1 ? 'pédigrees' : 'pédigree'}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Gérez, rechargez et exportez vos pédigrees enregistrés
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* QUICK SAVE CURRENT PEDIGREE BAR */}
        <div className="bg-blue-50/70 border-b border-blue-100 p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 text-xs text-blue-900">
            <Save size={16} className="text-blue-600 shrink-0" />
            <span className="font-bold">Pédigree actuel :</span>
            <span className="font-mono bg-white px-2 py-0.5 rounded border border-blue-200 font-black text-blue-950 truncate max-w-[180px]">
              {currentRing || 'Sans bague'}
              {currentName ? ` - ${currentName}` : ''}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={saveNameInput}
              onChange={(e) => setSaveNameInput(e.target.value)}
              placeholder="Note ou nom du projet (optionnel)..."
              className="bg-white border border-blue-300 rounded-lg px-2.5 py-1 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 flex-1 sm:w-56"
            />
            <button
              onClick={handleQuickSave}
              className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer whitespace-nowrap active:scale-95"
            >
              <Save size={13} />
              <span>Enregistrer maintenant</span>
            </button>
          </div>
        </div>

        {/* SEARCH AND TOOLS */}
        <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par bague, nom ou colombier..."
              className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenImportModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenImportModal();
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-all active:scale-95"
                title="Extraire automatiquement un pédigree depuis un PDF ou une Photo"
              >
                <Sparkles size={13} className="text-amber-200" />
                <span>📄 Importer PDF / Photo</span>
              </button>
            )}

          </div>
        </div>

        {/* PROJECTS LIST */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredProjects.length > 0 ? (
            filteredProjects.map((proj) => {
              const isConfirming = confirmDeleteId === proj.id;
              const mainPigeon = proj.pigeons?.[0] || {};

              return (
                <div
                  key={proj.id}
                  className="bg-white border border-slate-200 hover:border-blue-400 rounded-xl p-3.5 shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-black text-sm text-slate-900 tracking-tight">
                        {proj.ring || 'Sans bague'}
                      </span>
                      {proj.name && (
                        <span className="font-bold text-xs text-slate-700">
                          « {proj.name} »
                        </span>
                      )}
                      {getThemeBadge(proj.theme)}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                      {mainPigeon.strain && (
                        <span>
                          <strong className="text-slate-600">Origine :</strong> {mainPigeon.strain}
                        </span>
                      )}
                      {proj.ownerName && (
                        <span>
                          <strong className="text-slate-600">Colombier :</strong> {proj.ownerName}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-slate-400">
                        <Clock size={11} />
                        {formatDate(proj.updatedAt)}
                      </span>
                    </div>
                  </div>

                  {/* ACTIONS */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => {
                        onLoadProject(proj);
                        onClose();
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95"
                      title="Charger ce pédigree sur l'arbre de travail"
                    >
                      <FolderOpen size={13} />
                      <span>Charger</span>
                      <ArrowRight size={12} />
                    </button>

                    <button
                      onClick={() => onExportProjectJson(proj)}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                      title="Télécharger la sauvegarde JSON"
                    >
                      <Download size={14} />
                    </button>

                    {isConfirming ? (
                      <div className="flex items-center gap-1 bg-red-50 border border-red-200 p-1 rounded-lg">
                        <button
                          onClick={() => {
                            onDeleteProject(proj.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded"
                        >
                          Confirmer
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-1.5 py-0.5 text-slate-600 text-[10px]"
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(proj.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Supprimer ce projet"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
              <FolderOpen size={40} className="mx-auto text-slate-300 mb-2.5" />
              <p className="font-bold text-slate-700 text-sm">
                {searchQuery
                  ? 'Aucun projet ne correspond à votre recherche'
                  : 'Aucun pédigree enregistré pour le moment'}
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Cliquez sur le bouton « Enregistrer Pédigree » en haut pour sauvegarder le pédigree actuel et le retrouver ici à tout moment.
              </p>
              <button
                onClick={handleQuickSave}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
              >
                <Save size={14} />
                <span>Enregistrer le pédigree actuel</span>
              </button>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-[11px] text-slate-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>
              {currentUser
                ? `🔥 Synchronisation Cloud Firebase active (Projet : pedigree-pigeons)`
                : `Stockage local actif • Connectez Firebase pour synchroniser vos appareils`}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
