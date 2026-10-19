import { ensureIntlSegmenter } from './utils/intlSegmenterPolyfill';
import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { renderPedigreeToCanvasNative } from './utils/nativePedigreeCanvas';
import {
  Printer,
  Download,
  Image as ImageIcon,
  Save,
  RotateCcw,
  Search,
  Upload,
  CheckCircle,
  FileText,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Layers,
  Trash2,
  Share2,
  FileDown,
  FolderOpen,
  Award,
  PlusCircle,
  GitBranch,
  Type,
  ExternalLink,
} from 'lucide-react';
import { PedigreeCard } from './components/PedigreeCard';
import { ImportPedigreeModal } from './components/ImportPedigreeModal';
import { SavedProjectsModal } from './components/SavedProjectsModal';
import { GenealogySearchBar } from './components/GenealogySearchBar';
import { PedigreeTheme, PedigreeTextSize, PigeonData, PedigreeProject } from './types';
import {
  createEmptyPigeons,
  getPdfDemoPigeons,
  getCompuclubDemoPigeons,
  DEFAULT_PDF_LOGO_SVG,
} from './demoData';
import {
  searchPigeons,
  savePigeonsToSupabase,
} from './supabaseClient';
import {
  auth,
  signInWithGoogle,
  signOutUser,
  saveProjectToFirestore,
  loadUserProjectsFromFirestore,
  deleteProjectFromFirestore,
  syncUserProfile,
} from './firebase';
import { User, onAuthStateChanged } from 'firebase/auth';
import {
  searchGenealogyPigeons,
  cascadeGenealogyTree,
  getBoxRoleName,
  GenealogySearchResult,
} from './genealogyHelper';

export default function App() {
  const [theme, setTheme] = useState<PedigreeTheme>('elghali');
  const [textSize, setTextSize] = useState<PedigreeTextSize>('grand');
  const [pigeons, setPigeons] = useState<PigeonData[]>(getPdfDemoPigeons());
  const [selectedId, setSelectedId] = useState<number>(0);
  const [logoUrl, setLogoUrl] = useState<string>(DEFAULT_PDF_LOGO_SVG);
  const [ownerName, setOwnerName] = useState<string>('Baetens Willy & Ivan');
  const [ownerDetails, setOwnerDetails] = useState<string>(
    'Europark Oost 15D\n9100 Sint-Niklaas\nTel.: 0473/97.91.01\nivan.baetens@bricon.be'
  );
  const [showOwnerFooter, setShowOwnerFooter] = useState<boolean>(false);
  const [scale, setScale] = useState<number>(0.95);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [ringSuggestions, setRingSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [savedProjects, setSavedProjects] = useState<PedigreeProject[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSyncingFirebase, setIsSyncingFirebase] = useState<boolean>(false);
  const [g0Offset, setG0Offset] = useState<number>(35);
  const [mobileTab, setMobileTab] = useState<'preview' | 'editor'>('preview');
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isSavedProjectsModalOpen, setIsSavedProjectsModalOpen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [mobileExportReady, setMobileExportReady] = useState<{
    url: string;
    serverDownloadUrl?: string;
    serverViewUrl?: string;
    filename: string;
    type: 'pdf' | 'png';
    file?: File;
    previewUrl?: string;
  } | null>(null);

  const cardPrintRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const safeStorage = {
    getItem: (key: string): string | null => {
      try {
        return window.localStorage?.getItem(key) ?? null;
      } catch {
        return null;
      }
    },
    setItem: (key: string, value: string): void => {
      try {
        window.localStorage?.setItem(key, value);
      } catch {}
    },
    removeItem: (key: string): void => {
      try {
        window.localStorage?.removeItem(key);
      } catch {}
    },
    getAllProjectKeys: (): string[] => {
      try {
        if (!window.localStorage) return [];
        const keys: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && k.startsWith('pedigree_v2_')) {
            keys.push(k);
          }
        }
        return keys;
      } catch {
        return [];
      }
    },
  };

  // Load saved projects from localStorage on start
  useEffect(() => {
    loadSavedProjectsList();
  }, []);

  // Firebase Auth & Cloud Sync
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          await syncUserProfile(user);
          setIsSyncingFirebase(true);
          const cloudList = await loadUserProjectsFromFirestore(user.uid);
          if (cloudList && cloudList.length > 0) {
            setSavedProjects((prev) => {
              const map = new Map<string, PedigreeProject>();
              prev.forEach((p) => map.set(p.id, p));
              cloudList.forEach((cp) => {
                map.set(cp.id, cp);
                safeStorage.setItem(cp.id, JSON.stringify(cp));
              });
              return Array.from(map.values()).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
            });
            showToast(`🔥 Firebase connecté (${cloudList.length} projet(s) cloud synchronisé(s))`);
          } else {
            showToast(`🔥 Firebase connecté : ${user.displayName || user.email || 'Session active'}`);
          }
        } catch (e: any) {
          console.warn('Erreur chargement cloud Firebase:', e);
        } finally {
          setIsSyncingFirebase(false);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const loadSavedProjectsList = () => {
    const list: PedigreeProject[] = [];
    const keys = safeStorage.getAllProjectKeys();
    for (const key of keys) {
      try {
        const raw = safeStorage.getItem(key);
        if (raw) {
          const item = JSON.parse(raw);
          list.push(item);
        }
      } catch (e) {
        console.warn(e);
      }
    }
    setSavedProjects(list.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')));
  };

  const currentPigeon = pigeons[selectedId] || {
    id: selectedId,
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

  const handlePigeonChange = (field: keyof PigeonData, value: string) => {
    setPigeons((prev) => {
      const updated = [...prev];
      updated[selectedId] = {
        ...updated[selectedId],
        [field]: value,
      };
      return updated;
    });

    if (field === 'ring') {
      handleRingSearchSuggestions(value);
    }
  };

  const handleRingSearchSuggestions = async (val: string) => {
    if (!val || val.trim().length < 1) {
      setRingSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    try {
      const results = await searchGenealogyPigeons(val, savedProjects, pigeons);
      setRingSuggestions(results);
      setShowSuggestions(results.length > 0);
    } catch (e) {
      console.warn(e);
    }
  };

  const applyPigeonData = (item: any, targetId?: number) => {
    const idToApply = targetId !== undefined ? targetId : selectedId;
    setPigeons((prev) => {
      const updated = [...prev];
      updated[idToApply] = {
        ...updated[idToApply],
        ring: item.ring || '',
        name: item.name || '',
        strain: item.strain || '',
        owner: item.owner || '',
        color: item.color || '',
        year: item.year || '',
        sex: (item.sex === 'M' || item.sex === 'V' ? item.sex : 'M') as 'M' | 'V',
        results: item.results || '',
        bgColor: item.bgColor || '#ffffff',
      };
      return updated;
    });
    setShowSuggestions(false);
    showToast(`Pigeon ${item.ring} appliqué en case #${idToApply}`);
  };

  const handleAutoFillParentsFromPigeon = (pigeonMatch: GenealogySearchResult, targetId: number) => {
    const { updatedPigeons, filledCount } = cascadeGenealogyTree(pigeons, targetId, pigeonMatch);
    setPigeons(updatedPigeons);
    setShowSuggestions(false);
    showToast(`🌳 ${filledCount} cases de l'arbre génétique remplies automatiquement !`);
  };

  const handleSearchDatabase = async (q: string) => {
    setSearchQuery(q);
    if (!q || q.trim().length === 0) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const data = await searchPigeons(q);
    setSearchResults(data);
    setIsSearching(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        setLogoUrl(ev.target.result as string);
        showToast('Logo mis à jour avec succès');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleNewBlankProject = () => {
    setPigeons(createEmptyPigeons(31));
    setSelectedId(0);
    setTheme('elghali');
    setLogoUrl(DEFAULT_PDF_LOGO_SVG);
    setShowOwnerFooter(false);
    setG0Offset(35);
    setSearchQuery('');
    setRingSuggestions([]);
    setShowSuggestions(false);
    showToast('🌱 Nouveau projet officiel Elghali A4 vierge ouvert');
  };

  const resetToEmpty = () => {
    handleNewBlankProject();
  };

  const loadPdfDemo = () => {
    setPigeons(getPdfDemoPigeons());
    setTheme('elghali');
    setLogoUrl(DEFAULT_PDF_LOGO_SVG);
    setShowOwnerFooter(false);
    setG0Offset(35);
    setSelectedId(0);
    showToast('Elghali modèle chargé avec décalage fixé à 35px');
  };

  const loadCompuDemo = () => {
    setPigeons(getCompuclubDemoPigeons());
    setTheme('compuclub');
    setShowOwnerFooter(true);
    setSelectedId(0);
    showToast('Modèle Compuclub classique chargé');
  };

  const handleSaveProject = async (customName?: string) => {
    const mainRing = pigeons[0]?.ring?.trim() || `Pédigree_${new Date().toLocaleDateString('fr-FR')}`;
    const mainName = customName || pigeons[0]?.name?.trim() || '';
    const safeRing = mainRing.replace(/[\s/]/g, '_');
    const projectKey = `pedigree_v2_${safeRing}_${Date.now()}`;
    const project: PedigreeProject = {
      id: projectKey,
      ring: pigeons[0]?.ring || 'Sans bague',
      name: mainName,
      pigeons,
      ownerName,
      ownerDetails,
      logo: logoUrl,
      theme,
      textSize,
      showOwnerFooter,
      updatedAt: new Date().toISOString(),
    };
    safeStorage.setItem(projectKey, JSON.stringify(project));
    loadSavedProjectsList();

    if (currentUser) {
      try {
        setIsSyncingFirebase(true);
        await saveProjectToFirestore(project, currentUser.uid);
        showToast(`✓ Pédigree "${mainRing}${mainName ? ' (' + mainName + ')' : ''}" enregistré en local et synchronisé sur Firebase (pedigree-pigeons) !`);
      } catch (err: any) {
        console.warn('Erreur Firestore:', err);
        showToast(`✓ Pédigree "${mainRing}" enregistré en local`);
      } finally {
        setIsSyncingFirebase(false);
      }
    } else {
      showToast(`✓ Pédigree "${mainRing}${mainName ? ' (' + mainName + ')' : ''}" enregistré avec succès dans vos projets !`);
    }
  };

  const handleImportProjectsJson = (importedList: PedigreeProject[]) => {
    let count = 0;
    for (const proj of importedList) {
      if (proj && proj.pigeons && Array.isArray(proj.pigeons)) {
        const ring = proj.ring || 'Sans_bague';
        const key = proj.id || `pedigree_v2_${ring.replace(/[\s/]/g, '_')}_${Date.now()}_${count}`;
        safeStorage.setItem(key, JSON.stringify({ ...proj, id: key }));
        count++;
      }
    }
    loadSavedProjectsList();
    showToast(`✓ ${count} projet(s) importé(s) avec succès !`);
  };

  const handleExportProjectJson = (p: PedigreeProject) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(p, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `Pedigree_${(p.ring || 'Pigeon').replace(/[\s/]/g, '_')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast(`Fichier JSON de "${p.ring}" téléchargé`);
  };

  const handleImportSuccess = async (data: {
    pigeons: PigeonData[];
    ownerName?: string;
    ownerDetails?: string;
    theme?: PedigreeTheme;
  }) => {
    setPigeons(data.pigeons);
    if (data.ownerName) setOwnerName(data.ownerName);
    if (data.ownerDetails) setOwnerDetails(data.ownerDetails);
    setTheme('elghali');
    setG0Offset(35);
    setSelectedId(0);
    setMobileTab('preview');

    // Enregistrer automatiquement le pedigree complet dans Projets Enregistrés
    const ring = data.pigeons[0]?.ring || 'Sans_bague';
    const projName = data.pigeons[0]?.name ? `_${data.pigeons[0].name}` : '';
    const key = `pedigree_v2_${ring.replace(/[\s/]/g, '_')}${projName.replace(/[\s/]/g, '_')}_${Date.now()}`;
    const project: PedigreeProject = {
      id: key,
      ring: data.pigeons[0]?.ring || 'Sans nom',
      name: data.pigeons[0]?.name || '',
      pigeons: data.pigeons,
      ownerName: data.ownerName || ownerName,
      ownerDetails: data.ownerDetails || ownerDetails,
      logo: logoUrl,
      theme: 'elghali',
      textSize,
      showOwnerFooter,
      updatedAt: new Date().toISOString(),
    };
    safeStorage.setItem(key, JSON.stringify(project));
    loadSavedProjectsList();

    if (currentUser) {
      try {
        await saveProjectToFirestore(project, currentUser.uid);
      } catch (e) {
        console.warn('Sync Firebase err:', e);
      }
    }

    const filledCount = data.pigeons.filter((p) => p.ring?.trim() || p.name?.trim() || p.results?.trim()).length;
    showToast(`✓ Pédigree "${ring}" (${filledCount} cases) appliqué au modèle Elghali A4 et enregistré !`);
  };

  const handleLoadProject = (p: PedigreeProject) => {
    setPigeons(p.pigeons);
    setTheme(p.theme);
    if (p.textSize) setTextSize(p.textSize);
    setOwnerName(p.ownerName || '');
    setOwnerDetails(p.ownerDetails || '');
    setLogoUrl(p.logo || DEFAULT_PDF_LOGO_SVG);
    setShowOwnerFooter(p.showOwnerFooter ?? false);
    setSelectedId(0);
    showToast(`Projet "${p.ring}" chargé`);
  };

  const handleDeleteProject = async (id: string) => {
    safeStorage.removeItem(id);
    loadSavedProjectsList();
    if (currentUser) {
      try {
        await deleteProjectFromFirestore(id);
      } catch (e) {
        console.warn('Erreur suppression Firestore:', e);
      }
    }
    showToast('Projet supprimé');
  };

  const handleSyncFirebaseAll = async () => {
    if (!currentUser) {
      try {
        await signInWithGoogle();
      } catch (err: any) {
        showToast('Connexion Google annulée');
      }
      return;
    }
    try {
      setIsSyncingFirebase(true);
      let count = 0;
      for (const p of savedProjects) {
        await saveProjectToFirestore(p, currentUser.uid);
        count++;
      }
      showToast(`✓ ${count} projet(s) synchronisé(s) sur Firebase (pedigree-pigeons) !`);
    } catch (err: any) {
      showToast(`❌ Erreur synchronisation Firebase: ${err?.message || 'Erreur'}`);
    } finally {
      setIsSyncingFirebase(false);
    }
  };

  const handlePrint = () => {
    window.scrollTo(0, 0);
    window.print();
  };

  // Capture haute définition inviolable de la feuille de pédigree A4 (794x1123px)
  // Utilise directement le moteur vectoriel Canvas 2D natif Elghali A4 pour éviter tout bug de CSS manquant sur mobile (iOS/Android/Firefox)
  const capturePedigreeCanvas = async (): Promise<HTMLCanvasElement> => {
    ensureIntlSegmenter();

    const isMobile =
      typeof navigator !== 'undefined' &&
      (/iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        window.innerWidth < 1024);

    const renderScale = isMobile ? 2 : 2.5;

    return renderPedigreeToCanvasNative({
      pigeons,
      ownerName,
      ownerDetails,
      showOwnerFooter,
      logoUrl,
      theme,
      textSize,
      g0Offset,
      scale: renderScale,
    });
  };

  // Helper pour convertir un blob en Base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = reader.result as string;
        const commaIdx = res.indexOf(',');
        resolve(commaIdx >= 0 ? res.slice(commaIdx + 1) : res);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Enregistrer l'export sur le serveur pour téléchargement natif HTTP et visionnage direct
  const prepareServerDownload = async (
    blob: Blob,
    filename: string,
    mimeType: string
  ): Promise<{ downloadUrl: string; viewUrl: string }> => {
    try {
      const base64Data = await blobToBase64(blob);
      const res = await fetch('/api/store-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Data, filename, mimeType }),
      });
      if (res.ok) {
        const json = await res.json();
        return {
          downloadUrl: json.downloadUrl || '',
          viewUrl: json.viewUrl || json.downloadUrl || '',
        };
      }
    } catch (e) {
      console.warn('Erreur store-export serveur:', e);
    }
    return { downloadUrl: '', viewUrl: '' };
  };

  // Conversion sécurisée d'un canvas en objet Blob avec repli binaire universel
  const canvasToBlobPromise = (canvas: HTMLCanvasElement): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      try {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              // Repli si toBlob renvoie null sur certains WebViews
              try {
                const dataUrl = canvas.toDataURL('image/png');
                const binStr = atob(dataUrl.split(',')[1]);
                const len = binStr.length;
                const arr = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                  arr[i] = binStr.charCodeAt(i);
                }
                resolve(new Blob([arr], { type: 'image/png' }));
              } catch (fallbackErr) {
                reject(fallbackErr);
              }
            }
          },
          'image/png'
        );
      } catch (err) {
        try {
          const dataUrl = canvas.toDataURL('image/png');
          const binStr = atob(dataUrl.split(',')[1]);
          const len = binStr.length;
          const arr = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            arr[i] = binStr.charCodeAt(i);
          }
          resolve(new Blob([arr], { type: 'image/png' }));
        } catch (fallbackErr) {
          reject(fallbackErr);
        }
      }
    });
  };

  // 1. Fonction pour exporter en PNG (Compatible Mobile & PC)
  const handleExportPNG = async () => {
    setIsExporting(true);
    showToast('Exportation en image PNG HD...');

    const ringName = pigeons[0]?.ring?.trim()
      ? pigeons[0].ring.replace(/[\s/]/g, '_')
      : 'Pigeon';
    const fileName = `Pedigree_${ringName}.png`;

    const isMobile =
      typeof navigator !== 'undefined' &&
      (/iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        window.innerWidth < 1024);

    try {
      const canvas = await capturePedigreeCanvas();
      const blob = await canvasToBlobPromise(canvas);
      const file = new File([blob], fileName, { type: 'image/png' });

      // Enregistrer sur le serveur pour permettre un vrai téléchargement HTTP sur mobile
      const { downloadUrl, viewUrl } = await prepareServerDownload(blob, fileName, 'image/png');

      // Si on est sur mobile et que le partage natif de fichiers est supporté
      if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Pédigree Pigeon Pro',
            text: `Pédigree A4 - ${ringName}`,
          });
          showToast('✓ Image enregistrée / partagée avec succès !');
          return;
        } catch (shareError: any) {
          if (shareError.name === 'AbortError') return; // L'utilisateur a fermé le menu
        }
      }

      const blobUrl = URL.createObjectURL(blob);

      if (isMobile) {
        setMobileExportReady({
          url: blobUrl,
          serverDownloadUrl: downloadUrl,
          serverViewUrl: viewUrl || downloadUrl,
          filename: fileName,
          type: 'png',
          file: file,
          previewUrl: blobUrl,
        });
        showToast('✓ Votre image PNG est prête !');
      } else {
        // Solution classique PC
        const link = document.createElement('a');
        link.href = downloadUrl || blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        showToast('✓ Image PNG HD complète exportée !');
      }
    } catch (error) {
      console.error('Erreur lors de la génération du PNG :', error);
      showToast('❌ Erreur lors de la génération du PNG. Veuillez réessayer.');
    } finally {
      setIsExporting(false);
    }
  };

  // 2. Fonction pour exporter en PDF (Compatible Mobile & PC)
  const handleExportPDF = async () => {
    setIsExporting(true);
    showToast('Génération du document PDF officiel A4...');

    const ringName = pigeons[0]?.ring?.trim()
      ? pigeons[0].ring.replace(/[\s/]/g, '_')
      : 'Pigeon';
    const fileName = `Pedigree_${ringName}.pdf`;

    const isMobile =
      typeof navigator !== 'undefined' &&
      (/iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        window.innerWidth < 1024);

    try {
      const canvas = await capturePedigreeCanvas();
      const imgData = canvas.toDataURL('image/jpeg', 0.92); // JPEG 92% = PDF léger et net

      // Configuration A4 Portrait
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'l' : 'p',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

      // Génération en Blob binaire pour mobile et partage
      const pdfBlob = pdf.output('blob');
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

      // Enregistrer sur le serveur pour permettre un vrai téléchargement HTTP sur mobile
      const { downloadUrl, viewUrl } = await prepareServerDownload(pdfBlob, fileName, 'application/pdf');

      // Si on est sur mobile et que le partage natif de fichiers est supporté
      if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Pédigree PDF',
            text: `Pédigree A4 - ${ringName}`,
          });
          showToast('✓ Pédigree PDF partagé / enregistré avec succès !');
          return;
        } catch (shareError: any) {
          if (shareError.name === 'AbortError') return;
        }
      }

      const blobUrl = URL.createObjectURL(pdfBlob);

      if (isMobile) {
        setMobileExportReady({
          url: blobUrl,
          serverDownloadUrl: downloadUrl,
          serverViewUrl: viewUrl || downloadUrl,
          filename: fileName,
          type: 'pdf',
          file: file,
          previewUrl: imgData,
        });
        showToast('✓ Votre Pédigree PDF est prêt !');
      } else {
        // Téléchargement direct PC via jsPDF
        pdf.save(fileName);
        showToast('✓ PDF haute fidélité téléchargé avec succès !');
      }
    } catch (error) {
      console.error('Erreur lors de la génération du PDF :', error);
      showToast('❌ Erreur lors de la génération du PDF. Veuillez réessayer.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareApp = async () => {
    let cleanUrl = window.location.href;
    try {
      const urlObj = new URL(cleanUrl);
      urlObj.pathname = urlObj.pathname.replace(/micolpe/gi, '').replace(/\/\/+/g, '/') || '/';
      const sp = new URLSearchParams(urlObj.search);
      for (const [k, v] of Array.from(sp.entries())) {
        if (/micolpe/i.test(k) || /micolpe/i.test(v)) sp.delete(k);
      }
      urlObj.search = sp.toString() ? `?${sp.toString()}` : '';
      urlObj.hash = urlObj.hash.replace(/micolpe/gi, '');
      cleanUrl = urlObj.toString();
    } catch {
      cleanUrl = cleanUrl.replace(/micolpe/gi, '');
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Pédigree Pigeon Pro',
          text: 'Consultez et éditez ce pédigree de pigeon voyageur',
          url: cleanUrl,
        });
        showToast('Lien partagé avec succès !');
        return;
      } catch (e) {
        // Fallback to copy if cancelled or unsupported
      }
    }
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(cleanUrl);
        showToast('Lien copié dans le presse-papiers !');
      } else {
        window.prompt('Copiez ce lien pour partager l’application :', cleanUrl);
      }
    } catch {
      window.prompt('Copiez ce lien pour partager l’application :', cleanUrl);
    }
  };

  const getGen = (id: number) => {
    if (id === 0) return 0;
    if (id <= 2) return 1;
    if (id <= 6) return 2;
    if (id <= 14) return 3;
    return 4;
  };

  const getGenLabel = (gen: number) => {
    switch (gen) {
      case 0:
        return 'Pigeon Principal (Sujet)';
      case 1:
        return 'Parents (Gen 1)';
      case 2:
        return 'Grands-Parents (Gen 2)';
      case 3:
        return 'Arrière-Grands-Parents (Gen 3)';
      case 4:
        return 'Arrière-Arrière-Grands-Parents (Gen 4)';
      default:
        return '';
    }
  };

  const chipLimit = theme === 'compuclub4' ? 15 : 31;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-900 font-sans text-slate-800">
      {/* APP HEADER */}
      <header className="no-print bg-slate-950 text-white px-3 h-14 flex items-center justify-between border-b border-slate-800 shrink-0 z-50 overflow-x-auto min-w-0 gap-2">
        <div className="flex items-center gap-2 shrink-0 mr-1">
          <Award size={18} className="text-amber-400" />
          <h1 className="font-bold text-xs sm:text-sm tracking-wide text-slate-100 flex items-center gap-1.5">
            <span>Stamkaart A4</span>
            <span className="text-slate-400 font-normal">|</span>
            <span className="text-amber-400 font-medium">Pédigree</span>
          </h1>
          <span className="text-[10px] bg-red-950/80 text-amber-300 px-2.5 py-0.5 rounded-full border border-red-700 font-bold hidden md:inline-block shadow-xs">
            ★ Modèle Officiel Elghali A4 (5 Gen)
          </span>
        </div>

        {/* MOBILE TABS SWITCHER (VISIBLE ON SMALL SCREENS) */}
        <div className="flex lg:hidden bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs shrink-0">
          <button
            onClick={() => setMobileTab('preview')}
            className={`px-2.5 py-1 rounded font-bold transition-all ${
              mobileTab === 'preview'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            📄 Aperçu
          </button>
          <button
            onClick={() => setMobileTab('editor')}
            className={`px-2.5 py-1 rounded font-bold transition-all ${
              mobileTab === 'editor'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            ⚙️ Éditeur
          </button>
        </div>

        {/* HEADER ACTIONS - ALWAYS VISIBLE */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Zoom controls */}
          <div className="hidden sm:flex items-center bg-slate-800 rounded-lg px-2 py-1 border border-slate-700 text-xs text-slate-300">
            <button
              onClick={() => setScale((s) => Math.max(0.5, Number((s - 0.1).toFixed(2))))}
              className="p-1 hover:text-white cursor-pointer"
              title="Zoom arrière"
            >
              <ZoomOut size={14} />
            </button>
            <span className="px-1 text-[11px] font-mono">{Math.round(scale * 100)}%</span>
            <button
              onClick={() => setScale((s) => Math.min(1.4, Number((s + 0.1).toFixed(2))))}
              className="p-1 hover:text-white cursor-pointer"
              title="Zoom avant"
            >
              <ZoomIn size={14} />
            </button>
            <button
              onClick={() => setScale(0.85)}
              className="ml-1 text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
            >
              Ajuster
            </button>
          </div>

          {/* GRAND BOUTON VERT PDF */}
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-black rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white transition-all shadow-xl border-2 border-emerald-300 ring-4 ring-emerald-500/30 cursor-pointer"
            title="Télécharger le document PDF A4"
          >
            <Download size={16} className="animate-bounce" />
            <span className="hidden sm:inline">TÉLÉCHARGER PDF</span>
            <span className="sm:hidden">PDF</span>
          </button>

          {/* BOUTON ENREGISTRER SUR LE MENU */}
          <button
            onClick={() => handleSaveProject()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-black rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white transition-all shadow-md active:scale-95 border border-blue-400 cursor-pointer"
            title="Enregistrer ce pigeon pedigree pour qu'il apparaisse dans projets enregistrés"
          >
            <Save size={14} />
            <span className="hidden sm:inline">Enregistrer Pédigree</span>
            <span className="sm:hidden">Enregistrer</span>
          </button>

          {/* BOUTON NOUVEAU PROJET VIERGE */}
          <button
            onClick={handleNewBlankProject}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-100 transition-all border border-slate-700 shadow-sm cursor-pointer"
            title="Créer un nouveau projet vierge (modèle officiel A4 vide prêt à remplir)"
          >
            <PlusCircle size={14} className="text-emerald-400" />
            <span className="hidden sm:inline">Nouveau Projet</span>
            <span className="sm:hidden">+ Nouveau</span>
          </button>

          {/* BOUTON PROJETS ENREGISTRÉS SUR LE MENU */}
          <button
            onClick={() => setIsSavedProjectsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-100 transition-all border border-slate-700 shadow-sm cursor-pointer"
            title="Consulter et gérer les projets de pédigrees enregistrés"
          >
            <FolderOpen size={14} className="text-amber-400" />
            <span className="hidden md:inline">Projets Enregistrés</span>
            <span className="text-[10px] bg-blue-600 text-white font-mono font-bold px-1.5 py-0.2 rounded-full">
              {savedProjects.length}
            </span>
          </button>

          {/* BOUTON IMPORTER / SCANNER IA (DOCUMENT PDF OU IMAGE) */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 active:from-red-700 active:to-rose-700 text-white transition-all shadow-md active:scale-95 border border-red-400/60 cursor-pointer"
            title="Importer ou extraire automatiquement un pédigree depuis un Document PDF ou une Photo/Scan"
          >
            <FileText size={14} className="text-amber-200" />
            <span className="hidden sm:inline">📄 Importer PDF / Photo</span>
            <span className="sm:hidden">PDF/Photo</span>
          </button>

          {/* FIREBASE AUTH & CLOUD SYNC (PROJET: pedigree-pigeons) */}
          {currentUser ? (
            <div className="flex items-center gap-1.5 bg-slate-800/90 border border-amber-500/40 rounded-xl px-2.5 py-1 transition-all">
              <span className="flex items-center gap-1 text-[11px] font-bold text-amber-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="hidden xl:inline">Firebase: pedigree-pigeons</span>
                <span className="xl:hidden">Firebase</span>
              </span>
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt="avatar"
                  className="w-5 h-5 rounded-full border border-amber-400/50"
                />
              ) : (
                <span className="w-5 h-5 rounded-full bg-amber-600 text-white text-[10px] flex items-center justify-center font-bold">
                  {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                </span>
              )}
              <button
                onClick={handleSyncFirebaseAll}
                disabled={isSyncingFirebase}
                className="p-1 hover:text-amber-200 text-slate-300 cursor-pointer disabled:opacity-50"
                title="Synchroniser tous les projets avec Firebase"
              >
                <Sparkles size={13} className={isSyncingFirebase ? 'animate-spin text-amber-400' : ''} />
              </button>
              <button
                onClick={() => signOutUser().then(() => showToast('Déconnecté de Firebase'))}
                className="text-[10px] text-slate-400 hover:text-white hover:underline cursor-pointer pl-1 border-l border-slate-700"
                title="Se déconnecter de Firebase"
              >
                Sortir
              </button>
            </div>
          ) : (
            <button
              onClick={() => signInWithGoogle().catch((e) => console.warn(e))}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 active:scale-95 text-white transition-all shadow-md border border-amber-400/50 cursor-pointer"
              title="Connecter Firebase (Google) pour synchroniser vos pédigrees sur le projet pedigree-pigeons"
            >
              <Sparkles size={13} className="text-amber-200" />
              <span className="hidden sm:inline">🔥 Connexion Firebase</span>
              <span className="sm:hidden">🔥 Firebase</span>
            </button>
          )}

          <button
            onClick={handleExportPNG}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-500 text-white transition-colors shadow-sm"
            title="Exporter en image PNG"
          >
            <ImageIcon size={13} />
            <span>PNG</span>
          </button>

          <button
            onClick={handlePrint}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-200 hover:bg-slate-100 text-slate-900 transition-colors shadow"
          >
            <Printer size={13} />
            <span>Imprimer</span>
          </button>

          <button
            onClick={handleShareApp}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow"
            title="Partager le lien de cette application"
          >
            <Share2 size={13} />
            <span>Partager</span>
          </button>
        </div>
      </header>

      {/* BARRE DE RECHERCHE UNIVERSELLE DE BAGUE & AUTO-REMPLISSAGE GÉNÉALOGIQUE */}
      <GenealogySearchBar
        currentPigeons={pigeons}
        selectedId={selectedId}
        savedProjects={savedProjects}
        onApplyPigeons={(updated, msg) => {
          setPigeons(updated);
          showToast(msg);
        }}
        onOpenNewEmptyProject={handleNewBlankProject}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onSelectBox={(boxId) => {
          setSelectedId(boxId);
          setMobileTab('editor');
        }}
      />

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 bg-slate-900 text-emerald-300 border border-emerald-500/40 px-4 py-2 rounded-lg shadow-2xl text-xs flex items-center gap-2 animate-bounce">
          <CheckCircle size={15} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* MAIN LAYOUT */}
      <div className="flex flex-1 h-[calc(100vh-56px)] overflow-hidden">
        {/* SIDEBAR: Controls & Editor */}
        <aside className={`no-print ${mobileTab === 'editor' ? 'flex' : 'hidden'} lg:flex w-full lg:w-[380px] bg-white border-r border-slate-200 flex-col h-full shrink-0 shadow-md`}>
          <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={14} className="text-blue-600" />
              <span>Paramètres &amp; Édition</span>
            </h2>
            <div className="flex gap-1.5">
              <button
                onClick={loadPdfDemo}
                className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded border border-slate-300"
                title="Charger l'exemple identique au PDF"
              >
                Démo PDF
              </button>
              <button
                onClick={resetToEmpty}
                className="text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-0.5 rounded flex items-center gap-1"
                title="Vider tous les champs"
              >
                <RotateCcw size={10} />
                <span>Vierge</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
            {/* 0. TÉLÉCHARGEMENT DIRECT & EXPORT - GRAND BOUTON VERT */}
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-3 rounded-2xl border-2 border-emerald-500 shadow-md space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-emerald-950 uppercase tracking-wide flex items-center gap-1.5">
                  <Download size={15} className="text-emerald-700" />
                  <span>Téléchargement Pédigree</span>
                </span>
                <span className="text-[9px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold shadow-xs">
                  Format A4
                </span>
              </div>
              <button
                type="button"
                onClick={handleExportPDF}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black rounded-xl shadow-lg flex items-center justify-center gap-2.5 text-sm transition-all cursor-pointer transform active:scale-98 border-2 border-emerald-400 ring-4 ring-emerald-400/30"
                title="Télécharger le fichier PDF officiel A4"
              >
                <Download size={18} className="animate-bounce" />
                <span>TÉLÉCHARGER LE PDF</span>
              </button>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={handleExportPNG}
                  className="flex-1 py-1.5 px-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-md text-[10px] flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                >
                  <ImageIcon size={11} />
                  <span>Image PNG</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-md text-[10px] flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                >
                  <Printer size={11} />
                  <span>Imprimer</span>
                </button>
              </div>
            </div>

            {/* CARTE D'IMPORTATION PDF / PHOTO */}
            <div className="bg-gradient-to-r from-red-50 to-rose-50 p-3 rounded-xl border border-red-200 space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-red-950 uppercase tracking-wide flex items-center gap-1.5">
                  <Sparkles size={14} className="text-red-600" />
                  <span>Importer un Pédigree</span>
                </span>
                <span className="text-[9px] bg-red-600 text-white px-2 py-0.5 rounded-full font-bold">
                  PDF &amp; Photo
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="w-full py-2.5 px-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 text-xs transition-all cursor-pointer transform active:scale-98 border border-red-400/50"
              >
                <FileText size={15} className="text-amber-200" />
                <span>📄 Importer ou Scanner PDF / Photo</span>
              </button>
              <p className="text-[9.5px] text-red-800/80 text-center">
                Extraction automatique par IA et mise en page instantanée dans le Modèle Officiel Elghali
              </p>
            </div>

            {/* 1. MODÈLE UNIQUE : ★ Modèle Officiel Elghali A4 (5 Gen) */}
            <div className="bg-gradient-to-r from-red-50/80 to-amber-50/60 p-3 rounded-xl border-2 border-red-300 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-red-950 uppercase tracking-wide flex items-center gap-1.5">
                  <Award size={15} className="text-red-600" />
                  <span>Modèle de Pédigree</span>
                </span>
                <span className="text-[9px] bg-red-600 text-white px-2 py-0.5 rounded-full font-bold shadow-xs">
                  Officiel A4
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-red-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-xs text-red-950 flex items-center gap-1.5">
                    <span className="text-red-600 font-black">★</span>
                    <span>Modèle Officiel Elghali A4 (5 Gen)</span>
                  </h4>
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">
                    ✓
                  </span>
                </div>
                <p className="text-[10px] text-slate-600 mt-1 leading-snug">
                  Modèle standardisé 5 générations : bagues rouges, symboles ♂/♀, case principale G0 centrée et équilibrée.
                </p>
              </div>

              {/* Offset slider for Official template */}
              <div className="pt-2 border-t border-red-200/80">
                <div className="flex justify-between items-center mb-1 text-[10px] font-bold text-slate-800">
                  <span>Décalage G0 / Parents (G1 &amp; G2)</span>
                  <span className="text-red-700 font-mono bg-red-100/90 px-2 py-0.5 rounded border border-red-300 font-bold">
                    {g0Offset}px (Min 35px)
                  </span>
                </div>
                <input
                  type="range"
                  min="35"
                  max="115"
                  step="5"
                  value={g0Offset}
                  onChange={(e) => setG0Offset(Number(e.target.value))}
                  className="w-full accent-red-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                />
                <div className="flex justify-between text-[8.5px] text-slate-500 mt-0.5 font-medium">
                  <span>35px (Fixé)</span>
                  <span>Centrage optimal</span>
                  <span>115px</span>
                </div>
              </div>

              {/* Text Size / Lisibilité des écritures */}
              <div className="pt-2 border-t border-red-200/80">
                <div className="flex justify-between items-center mb-1.5 text-[10px] font-bold text-slate-800">
                  <span className="flex items-center gap-1">
                    <Type size={12} className="text-red-600" />
                    <span>Taille d'écriture &amp; Lisibilité</span>
                  </span>
                  <span className="text-red-700 font-mono bg-red-100/90 px-1.5 py-0.2 rounded border border-red-300 font-bold text-[9.5px]">
                    {textSize === 'tres_grand' ? 'Très Grand' : textSize === 'grand' ? 'Grand ★' : 'Normal'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setTextSize('normal')}
                    className={`py-1 px-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                      textSize === 'normal'
                        ? 'bg-red-600 text-white border-red-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => setTextSize('grand')}
                    className={`py-1 px-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                      textSize === 'grand'
                        ? 'bg-red-600 text-white border-red-700 shadow-xs ring-1 ring-red-400'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Grand ★
                  </button>
                  <button
                    type="button"
                    onClick={() => setTextSize('tres_grand')}
                    className={`py-1 px-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                      textSize === 'tres_grand'
                        ? 'bg-red-600 text-white border-red-700 shadow-xs ring-1 ring-red-400'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Très Grand
                  </button>
                </div>
                <p className="text-[9px] text-slate-500 mt-1">
                  Agrandit les numéros de bague, noms, souches et palmarès pour une lecture parfaite à l'impression et à l'écran.
                </p>
              </div>
            </div>

            {/* 2. PIGEON CASE SELECTOR CHIPS */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Sélectionner la case à modifier
                </span>
                <span className="text-[10px] font-medium text-blue-600">
                  Case #{selectedId} ({getGenLabel(getGen(selectedId))})
                </span>
              </div>
              <div className="flex flex-wrap gap-1 p-1.5 bg-slate-100 rounded-lg border border-slate-200 max-h-24 overflow-y-auto">
                {Array.from({ length: chipLimit }, (_, i) => {
                  const gen = getGen(i);
                  const isCur = i === selectedId;
                  const hasVal = Boolean(pigeons[i]?.ring);
                  const chipColorClass =
                    gen === 0
                      ? 'bg-red-100 text-red-900 border-red-300'
                      : gen === 1
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : gen === 2
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      : gen === 3
                      ? 'bg-sky-100 text-sky-900 border-sky-300'
                      : 'bg-purple-100 text-purple-900 border-purple-300';

                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedId(i)}
                      className={`px-1.5 py-0.5 text-[9.5px] font-bold rounded border transition-all ${chipColorClass} ${
                        isCur
                          ? 'ring-2 ring-blue-600 scale-105 shadow font-black'
                          : 'opacity-85 hover:opacity-100'
                      } ${!hasVal ? 'opacity-40' : ''}`}
                      title={pigeons[i]?.ring ? `#${i}: ${pigeons[i].ring}` : `Case #${i} (Vide)`}
                    >
                      #{i}
                      {hasVal && ' •'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. ACTIVE PIGEON FORM */}
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-2">
              <div className="flex gap-2">
                {/* Ring input with live auto-suggestions */}
                <div className="flex-[2] relative">
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                    N° Bague (Recherche auto)
                  </label>
                  <input
                    type="text"
                    value={currentPigeon.ring}
                    onChange={(e) => handlePigeonChange('ring', e.target.value)}
                    placeholder="ex: MA 593-21"
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {showSuggestions && ringSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-slate-300 rounded-b-xl shadow-2xl z-50 max-h-56 overflow-y-auto divide-y divide-slate-100">
                      <div className="p-1.5 bg-slate-100 text-[9px] font-bold text-slate-500 uppercase flex items-center justify-between">
                        <span>{ringSuggestions.length} pigeon(s) trouvé(s)</span>
                        <span className="text-slate-400">Admin &amp; Projets</span>
                      </div>
                      {ringSuggestions.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-2 hover:bg-blue-50 cursor-pointer flex flex-col gap-1 transition-colors"
                        >
                          <div
                            onClick={() => applyPigeonData(item)}
                            className="flex justify-between items-center"
                          >
                            <span className="font-bold text-xs text-red-600 font-mono">{item.ring}</span>
                            <span className="text-[10px] text-slate-600 font-medium truncate max-w-[140px]">
                              {item.name ? `« ${item.name} »` : item.strain || ''} ({item.sex === 'M' ? '♂' : '♀'})
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[9px] text-slate-500">
                            <span>{item.sourceLabel || 'Base de données'}</span>
                            {item.hasAncestors && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAutoFillParentsFromPigeon(item, selectedId);
                                }}
                                className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded flex items-center gap-1 shadow-xs cursor-pointer"
                                title="Remplir automatiquement les parents et ancêtres de ce pigeon dans l'arbre"
                              >
                                <GitBranch size={9} />
                                <span>Remplir arbre</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sexe */}
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                    Sexe
                  </label>
                  <select
                    value={currentPigeon.sex}
                    onChange={(e) => handlePigeonChange('sex', e.target.value as 'M' | 'V')}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="M">Mâle (♂)</option>
                    <option value="V">Femelle (♀)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                    Nom du Pigeon
                  </label>
                  <input
                    type="text"
                    value={currentPigeon.name}
                    onChange={(e) => handlePigeonChange('name', e.target.value)}
                    placeholder='ex: "Boraq"'
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                    Souche / Origine
                  </label>
                  <input
                    type="text"
                    value={currentPigeon.strain}
                    onChange={(e) => handlePigeonChange('strain', e.target.value)}
                    placeholder="ex: Kras / Dirk Van Dyck"
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                    Éleveur / Propriétaire
                  </label>
                  <input
                    type="text"
                    value={currentPigeon.owner}
                    onChange={(e) => handlePigeonChange('owner', e.target.value)}
                    placeholder="ex: Ahmed Chakour"
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="w-24">
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                    Couleur Pigeon
                  </label>
                  <input
                    type="text"
                    value={currentPigeon.color}
                    onChange={(e) => handlePigeonChange('color', e.target.value)}
                    placeholder="ex: Kras Pb"
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Background Color Picker for Box Highlight */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                <span className="text-[10px] font-bold text-slate-700">
                  Couleur de fond de la case
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => handlePigeonChange('bgColor', '#ffffff')}
                      className="w-5 h-5 rounded border border-slate-300 bg-white"
                      title="Blanc standard"
                    />
                    <button
                      type="button"
                      onClick={() => handlePigeonChange('bgColor', '#6ee7b7')}
                      className="w-5 h-5 rounded border border-emerald-400 bg-emerald-300"
                      title="Vert (comme dans le PDF)"
                    />
                    <button
                      type="button"
                      onClick={() => handlePigeonChange('bgColor', '#fed7aa')}
                      className="w-5 h-5 rounded border border-amber-400 bg-amber-200"
                      title="Orange"
                    />
                    <button
                      type="button"
                      onClick={() => handlePigeonChange('bgColor', '#bae6fd')}
                      className="w-5 h-5 rounded border border-sky-400 bg-sky-200"
                      title="Bleu clair"
                    />
                  </div>
                  <input
                    type="color"
                    value={currentPigeon.bgColor || '#ffffff'}
                    onChange={(e) => handlePigeonChange('bgColor', e.target.value)}
                    className="w-6 h-6 p-0 border border-slate-300 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Results / Pedigree text */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                  Résultats / Palmarès / Notes
                </label>
                <textarea
                  rows={4}
                  value={currentPigeon.results}
                  onChange={(e) => handlePigeonChange('results', e.target.value)}
                  placeholder="ex: 1°Ace Speed 4/4 Club '22'&#10;1. 274km 1490p Club&#10;Père de champions..."
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 text-[11px] font-mono leading-tight focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* 4. BASE DE DONNÉES COLOMBIER (SUPABASE SEARCH) */}
            <div className="bg-slate-100/70 p-2.5 rounded-lg border border-slate-200">
              <label className="block text-[10px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Base de Données Colombier</span>
                <span className="text-[9px] text-slate-500">Recherche rapide</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchDatabase(e.target.value)}
                  placeholder="Rechercher bague ou nom..."
                  className="w-full bg-white border border-slate-300 rounded pl-7 pr-2 py-1 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <Search size={12} className="absolute left-2 top-2 text-slate-400" />
              </div>
              <div className="mt-1.5 max-h-28 overflow-y-auto space-y-1">
                {isSearching ? (
                  <div className="text-[10px] text-slate-400 text-center py-2">Recherche...</div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((item, i) => (
                    <div
                      key={i}
                      className="bg-white p-1.5 rounded border border-slate-200 flex justify-between items-center text-[10px]"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{item.ring}</div>
                        <div className="text-slate-500 truncate max-w-[160px]">
                          {item.name || item.strain || ''} ({item.sex})
                        </div>
                      </div>
                      <button
                        onClick={() => applyPigeonData(item, selectedId)}
                        className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded text-[9px]"
                      >
                        Mettre en #{selectedId}
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-[10px] text-slate-400 text-center py-1">
                    {searchQuery ? 'Aucun pigeon trouvé' : 'Tapez une bague pour chercher...'}
                  </div>
                )}
              </div>
            </div>

            {/* 5. LOGO COLOMBIER */}
            <div className="bg-slate-100/70 p-2.5 rounded-lg border border-slate-200">
              <label className="block text-[10px] font-bold text-slate-700 mb-1">
                Logo du Colombier
              </label>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-300 bg-white shrink-0 shadow-sm flex items-center justify-center">
                  <img src={logoUrl} alt="Aperçu Logo" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 space-y-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLogoUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-1 px-2 bg-white border border-slate-300 hover:bg-slate-50 rounded text-slate-700 font-medium flex items-center justify-center gap-1.5 text-[10px]"
                  >
                    <Upload size={11} />
                    <span>Importer image</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogoUrl(DEFAULT_PDF_LOGO_SVG)}
                    className="w-full py-0.5 text-[9.5px] text-slate-500 hover:text-slate-800"
                  >
                    Restaurer logo AB (PDF)
                  </button>
                </div>
              </div>
            </div>

            {/* 6. COORDONNÉES COLOMBIER & FOOTER OPTION */}
            <div className="bg-slate-100/70 p-2.5 rounded-lg border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-700">
                  Propriétaire &amp; Coordonnées
                </label>
                <label className="flex items-center gap-1 text-[10px] text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOwnerFooter}
                    onChange={(e) => setShowOwnerFooter(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>Afficher en bas</span>
                </label>
              </div>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Nom du colombier..."
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900"
              />
              <textarea
                rows={2}
                value={ownerDetails}
                onChange={(e) => setOwnerDetails(e.target.value)}
                placeholder="Adresse, Téléphone, Email..."
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 text-[10px]"
              />
            </div>

            {/* 7. PROJETS ENREGISTRÉS */}
            <div className="bg-slate-100/70 p-2.5 rounded-lg border border-slate-200 space-y-2">
              <div className="text-[10px] font-bold text-slate-700 flex justify-between items-center">
                <span className="flex items-center gap-1">
                  <FolderOpen size={12} className="text-blue-600" />
                  <span>Projets Enregistrés</span>
                </span>
                <span className="text-[9px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded-full">
                  {savedProjects.length}
                </span>
              </div>

              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSaveProject()}
                  className="flex-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-[10px] flex items-center justify-center gap-1 shadow-xs cursor-pointer active:scale-95 transition-all"
                  title="Enregistrer le pédigree actuel"
                >
                  <Save size={11} />
                  <span>Enregistrer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsSavedProjectsModalOpen(true)}
                  className="py-1.5 px-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg font-bold text-[10px] flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                  title="Ouvrir la liste complète des projets enregistrés"
                >
                  <FolderOpen size={11} className="text-blue-600" />
                  <span>Gérer ({savedProjects.length})</span>
                </button>
              </div>

              <div className="max-h-24 overflow-y-auto space-y-1">
                {savedProjects.length > 0 ? (
                  savedProjects.map((proj) => (
                    <div
                      key={proj.id}
                      className="bg-white p-1 rounded border border-slate-200 flex justify-between items-center text-[10px]"
                    >
                      <span
                        onClick={() => handleLoadProject(proj)}
                        className="font-bold text-blue-700 hover:underline cursor-pointer truncate max-w-[180px]"
                      >
                        {proj.ring} {proj.name ? `(${proj.name})` : ''}
                      </span>
                      <button
                        onClick={() => handleDeleteProject(proj.id)}
                        className="text-red-600 hover:text-red-800 p-0.5 cursor-pointer"
                        title="Supprimer ce projet"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-[10px] text-slate-400 text-center py-1">
                    Aucun projet enregistré
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* PREVIEW CANVAS AREA */}
        <main className={`print-area flex-1 bg-slate-700/80 overflow-auto p-4 flex flex-col items-center ${mobileTab === 'preview' ? 'flex' : 'hidden lg:flex'}`}>
          {/* FLOATING QUICK ACTION BAR - GRAND BOUTON VERT + TAILLE TEXTE */}
          <div className="no-print mb-3 bg-slate-900/95 backdrop-blur-md px-4 py-2.5 rounded-2xl border-2 border-emerald-500/50 shadow-2xl flex flex-wrap items-center justify-center gap-3 shrink-0 z-30">
            <span className="text-xs font-bold text-slate-200 hidden sm:flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Aperçu A4
            </span>
            <div className="h-5 w-px bg-slate-700 hidden sm:block" />

            {/* SÉLECTEUR DE TAILLE D'ÉCRITURE */}
            <div className="flex items-center bg-slate-800 rounded-xl px-2.5 py-1 border border-slate-700 text-xs shadow-inner">
              <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1 mr-1.5">
                <Type size={13} className="text-amber-400" />
                <span className="hidden md:inline">Écriture :</span>
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setTextSize('normal')}
                  className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                    textSize === 'normal'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Taille d'écriture normale"
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => setTextSize('grand')}
                  className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                    textSize === 'grand'
                      ? 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-400'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Grande écriture - Lisibilité optimale (Recommandé)"
                >
                  Grand ★
                </button>
                <button
                  type="button"
                  onClick={() => setTextSize('tres_grand')}
                  className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                    textSize === 'tres_grand'
                      ? 'bg-amber-600 text-white shadow-xs ring-1 ring-amber-400'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Très grande écriture"
                >
                  Très Grand
                </button>
              </div>
            </div>

            <div className="h-5 w-px bg-slate-700 hidden sm:block" />

            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2.5 px-6 py-2.5 text-sm font-black rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white transition-all shadow-xl active:scale-95 cursor-pointer border-2 border-emerald-300 ring-4 ring-emerald-500/40"
              title="Télécharger le fichier PDF A4"
            >
              <Download size={18} className="animate-bounce" />
              <span>TÉLÉCHARGER PDF (A4)</span>
            </button>
            <button
              onClick={handleExportPNG}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-500 text-white transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <ImageIcon size={14} />
              <span>Image PNG</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white hover:bg-slate-100 text-slate-900 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Printer size={14} />
              <span>Imprimer</span>
            </button>
          </div>

          {/* BANNIÈRE PROJET VIERGE - GUIDE RAPIDE DE REMPLISSAGE */}
          {(!pigeons[0]?.ring || pigeons[0].ring.trim() === '') &&
           (!pigeons[1]?.ring || pigeons[1].ring.trim() === '') && (
            <div className="no-print mb-4 w-full max-w-[800px] p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-2 border-amber-500/80 rounded-2xl shadow-2xl text-white space-y-3 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="text-amber-400 w-5 h-5 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Modèle Officiel Elghali Vierge</span>
                      <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700 px-2 py-0.2 rounded-full font-bold">
                        Prêt à l'emploi
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-300">
                      Toutes les 31 cases sont prêtes. Remplissez par recherche de bague, import direct, ou saisie manuelle :
                    </p>
                  </div>
                </div>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold px-2.5 py-0.5 rounded-full shrink-0">
                  ★ Modèle Officiel Elghali A4 (5 Gen)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const searchInput = document.querySelector('input[placeholder*="Rechercher un N° de bague"]') as HTMLInputElement;
                    searchInput?.focus();
                  }}
                  className="p-3 bg-slate-800/90 hover:bg-slate-750 active:bg-slate-900 border border-slate-600 rounded-xl flex items-center gap-2.5 text-left transition-all cursor-pointer group hover:border-amber-400"
                >
                  <Search className="w-5 h-5 text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-100">1. Rechercher Bague</div>
                    <div className="text-[10px] text-slate-400">Auto-remplir l'arbre</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="p-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 active:from-red-700 border border-red-400/80 rounded-xl flex items-center gap-2.5 text-left text-white transition-all shadow-md cursor-pointer hover:scale-[1.02]"
                >
                  <FileText className="w-5 h-5 text-amber-200 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold">2. Importer PDF / Photo</div>
                    <div className="text-[10px] text-red-100">Scan IA sur modèle vierge</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(0);
                    setMobileTab('editor');
                  }}
                  className="p-3 bg-slate-800/90 hover:bg-slate-750 active:bg-slate-900 border border-slate-600 rounded-xl flex items-center gap-2.5 text-left transition-all cursor-pointer group hover:border-blue-400"
                >
                  <Layers className="w-5 h-5 text-blue-400 shrink-0 group-hover:scale-110 transition-transform" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-100">3. Saisir Sujet #0</div>
                    <div className="text-[10px] text-slate-400">Saisie case par case</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          <div className="transition-transform duration-100">
            <PedigreeCard
              ref={cardPrintRef}
              pigeons={pigeons}
              selectedId={selectedId}
              onSelectPigeon={(id) => setSelectedId(id)}
              theme={theme}
              textSize={textSize}
              logoUrl={logoUrl}
              ownerName={ownerName}
              ownerDetails={ownerDetails}
              showOwnerFooter={showOwnerFooter}
              scale={scale}
              g0Offset={g0Offset}
              onExportPdf={handleExportPDF}
            />
          </div>
        </main>
      </div>

      {/* CONTENEUR FIXE DÉDIÉ POUR EXPORTATION PARFAITE SANS DÉFORMATION DE SCROLL NI DE VIEWPORT MOBILE */}
      <div
        id="pedigreeCardExportContainer"
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '794px',
          height: '1123px',
          zIndex: -9999,
          opacity: 0.01,
          pointerEvents: 'none',
          overflow: 'hidden',
          backgroundColor: '#ffffff',
        }}
      >
        <PedigreeCard
          pigeons={pigeons}
          selectedId={-1}
          onSelectPigeon={() => {}}
          theme={theme}
          textSize={textSize}
          logoUrl={logoUrl}
          ownerName={ownerName}
          ownerDetails={ownerDetails}
          showOwnerFooter={showOwnerFooter}
          scale={1}
          g0Offset={g0Offset}
        />
      </div>

      {/* GRAND BOUTON VERT FLOTTANT TOUJOURS VISIBLE DANS TOUTE L'APPLICATION */}
      <div className="no-print fixed bottom-6 right-6 z-[9999] flex items-center gap-2.5">
        <button
          type="button"
          onClick={handleExportPDF}
          className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 active:from-emerald-700 active:to-green-700 text-white font-black text-sm sm:text-base px-6 py-4 rounded-2xl shadow-[0_12px_40px_rgba(16,185,129,0.65)] flex items-center gap-3 border-2 border-white ring-4 ring-emerald-400/50 cursor-pointer transition-all hover:scale-105 active:scale-95 animate-pulse hover:animate-none"
          title="Télécharger immédiatement le document PDF A4"
        >
          <Download size={22} className="animate-bounce" />
          <span className="tracking-wide">TÉLÉCHARGER PDF (A4)</span>
        </button>
      </div>

      {/* MODAL IMPORTER / EXTRAIRE UN PÉDIGREE (IMAGE OU PDF PAR IA) */}
      <ImportPedigreeModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={handleImportSuccess}
      />

      {/* MODAL PROJETS ENREGISTRÉS */}
      <SavedProjectsModal
        isOpen={isSavedProjectsModalOpen}
        onClose={() => setIsSavedProjectsModalOpen(false)}
        projects={savedProjects}
        currentRing={pigeons[0]?.ring || ''}
        currentName={pigeons[0]?.name || ''}
        currentUser={currentUser}
        onLoadProject={handleLoadProject}
        onSaveCurrentProject={(name) => handleSaveProject(name)}
        onDeleteProject={handleDeleteProject}
        onExportProjectJson={handleExportProjectJson}
        onImportProjectsJson={handleImportProjectsJson}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onSyncWithFirebase={handleSyncFirebaseAll}
      />

      {/* OVERLAY CHARGEMENT EXPORTATION */}
      {isExporting && (
        <div className="fixed inset-0 z-[99998] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/50 rounded-2xl p-6 flex flex-col items-center gap-3 text-white shadow-2xl max-w-xs text-center animate-in fade-in">
            <div className="w-10 h-10 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin shrink-0" />
            <div className="text-sm font-bold text-slate-100">
              Génération haute résolution en cours...
            </div>
            <p className="text-[11px] text-slate-400">
              Mise en page A4 et calcul du document pour votre téléphone...
            </p>
          </div>
        </div>
      )}

      {/* MODAL DE TÉLÉCHARGEMENT & PARTAGE MOBILE (GARANTIE 100% SMARTPHONES) */}
      {mobileExportReady && (
        <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border-2 border-emerald-500 rounded-3xl p-4 sm:p-5 max-w-sm w-full text-white shadow-2xl animate-in zoom-in-95 duration-150 my-auto">
            <div className="flex items-center gap-3 mb-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle size={24} />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-white truncate">
                  {mobileExportReady.type === 'pdf' ? '✓ Pédigree PDF A4 Prêt !' : '✓ Image PNG HD Prête !'}
                </h3>
                <p className="text-[11px] text-emerald-400 font-mono truncate">
                  {mobileExportReady.filename}
                </p>
              </div>
            </div>

            {/* APERÇU VISUEL DIRECT DU PÉDIGREE GÉNÉRÉ */}
            {mobileExportReady.previewUrl && (
              <div className="my-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-700 flex flex-col items-center">
                <img
                  src={mobileExportReady.previewUrl}
                  alt="Aperçu Pédigree"
                  className="max-h-[35vh] w-auto object-contain rounded-lg shadow-md border border-slate-800"
                />
                <p className="text-[10px] text-amber-300 font-medium text-center mt-1.5 px-1 leading-snug">
                  👉 <strong>Sur iPhone &amp; Android :</strong> Maintenez votre doigt appuyé sur l'image ci-dessus pour l'<strong>« Enregistrer dans Photos »</strong>
                </p>
              </div>
            )}

            <div className="space-y-2 pt-1">
              {/* BOUTON 1 : PARTAGER SUR WHATSAPP / FICHIERS (API NATIVE SMARTPHONE) */}
              <button
                type="button"
                onClick={async () => {
                  if (navigator.share) {
                    try {
                      if (mobileExportReady.file && navigator.canShare && navigator.canShare({ files: [mobileExportReady.file] })) {
                        await navigator.share({
                          files: [mobileExportReady.file],
                          title: 'Pédigree Pigeon Pro',
                          text: `Pédigree A4 - ${pigeons[0]?.ring || 'Pigeon'}`,
                        });
                        showToast('✓ Partagé avec succès !');
                        return;
                      }
                      await navigator.share({
                        title: 'Pédigree Pigeon Pro',
                        text: `Pédigree A4 - ${pigeons[0]?.ring || 'Pigeon'}`,
                        url: window.location.href,
                      });
                    } catch (e: any) {
                      if (e?.name !== 'AbortError') {
                        window.open(mobileExportReady.url, '_blank');
                      }
                    }
                  } else {
                    window.open(mobileExportReady.url, '_blank');
                  }
                }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-all cursor-pointer"
              >
                <Share2 size={16} />
                <span>Partager (WhatsApp / Enregistrer dans Fichiers)</span>
              </button>

              {/* BOUTON 2 : TÉLÉCHARGER DIRECTEMENT LE FICHIER (LIEN HTTP SERVEUR SANS BLOCAGE IFRAME/BLOB) */}
              <a
                href={mobileExportReady.serverDownloadUrl || mobileExportReady.url}
                download={mobileExportReady.filename}
                onClick={() => {
                  showToast('✓ Téléchargement lancé !');
                }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-all cursor-pointer no-underline text-center"
              >
                <Download size={16} />
                <span>Télécharger le fichier ({mobileExportReady.type.toUpperCase()})</span>
              </a>

              {/* BOUTON 3 : OUVRIR EN PLEIN ÉCRAN / NOUVEL ONGLET (VISIONNEUSE NATIVE SMARTPHONE) */}
              <a
                href={mobileExportReady.serverViewUrl || mobileExportReady.serverDownloadUrl || mobileExportReady.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 active:bg-slate-850 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer no-underline text-center"
              >
                <ExternalLink size={15} className="text-cyan-400" />
                <span>Ouvrir en plein écran (Zoomer / Enregistrer)</span>
              </a>

              {/* BOUTON 4 : IMPRIMER EN PDF DU SMARTPHONE */}
              <button
                type="button"
                onClick={() => {
                  setMobileExportReady(null);
                  setTimeout(() => {
                    window.print();
                  }, 250);
                }}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 active:bg-slate-850 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer"
              >
                <Printer size={15} />
                <span>Imprimer ou Enregistrer en PDF (Système)</span>
              </button>

              {/* FERMER */}
              <button
                type="button"
                onClick={() => setMobileExportReady(null)}
                className="w-full py-2 text-slate-400 hover:text-white font-semibold rounded-xl text-xs transition-all cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
