import React, { useState, useRef } from 'react';
import imageCompression from 'browser-image-compression';
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  Loader2,
  X,
  Camera,
  Upload,
  Sparkles,
  Save,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  GitBranch,
  Globe,
} from 'lucide-react';
import { PigeonData, PedigreeTheme } from '../types';
import { getPdfDemoPigeons } from '../demoData';

export interface AncetreSchema {
  nom?: string | null;
  numero_bague?: string | null;
  eleveur?: string | null;
  race?: string | null;
  couleur?: string | null;
  resultats?: string | null;
  palmares?: string | null;
}

export interface ExtractedPigeonSchema {
  pigeon: {
    nom: string | null;
    numero_bague: string | null;
    sexe: 'M' | 'F' | null;
    race: string | null;
    date_naissance: string | null;
    couleur?: string | null;
    eleveur: string | null;
    proprietaire?: string | null;
    palmares?: string | null;
  };
  parents: {
    pere: AncetreSchema;
    mere: AncetreSchema;
  };
  grands_parents: {
    paternel?: AncetreSchema;
    paternel_pere: AncetreSchema;
    paternel_mere: AncetreSchema;
    maternel_pere: AncetreSchema;
    maternel_mere: AncetreSchema;
  };
  arriere_grands_parents?: {
    pp_pp?: AncetreSchema;
    pp_pm?: AncetreSchema;
    pm_pp?: AncetreSchema;
    pm_pm?: AncetreSchema;
    mp_pp?: AncetreSchema;
    mp_pm?: AncetreSchema;
    mm_pp?: AncetreSchema;
    mm_pm?: AncetreSchema;
  };
  arriere_arriere_grands_parents?: Record<string, AncetreSchema>;
  details_elevage?: {
    nom_eleveur?: string;
    adresse_eleveur?: string;
    club?: string;
    date_acquisition?: string;
    observations?: string;
  };
  resultats_courses?: Array<{
    course?: string;
    date?: string;
    position?: string;
    nombre_participants?: string;
    distance_km?: string;
    vitesse?: string;
  }>;
  pigeons: PigeonData[];
  ownerName?: string;
  ownerDetails?: string;
}

interface ImportPedigreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (data: {
    pigeons: PigeonData[];
    ownerName?: string;
    ownerDetails?: string;
    theme?: PedigreeTheme;
  }) => void;
}

// Vérification du format de numéro de bague colombophile standard
export function isRingFormatStandard(ring: string | null): boolean {
  if (!ring || ring.trim().length === 0) return false;
  return /^[A-Z]{1,4}[-\s]?[0-9]{3,9}([-/][0-9]{2,4})?$/i.test(ring.trim());
}

const cleanStr = (v: unknown): string => {
  if (v === null || v === undefined || v === 'null' || v === 'undefined') return '';
  return String(v).trim();
};

const inferYearFromRing = (ring: string, existingYear?: string): string => {
  const yClean = cleanStr(existingYear);
  if (yClean) return yClean;
  const rClean = cleanStr(ring);
  if (!rClean) return '';
  const match = rClean.match(/[-/\s](\d{2}|\d{4})$/);
  if (match) {
    const y = match[1];
    return y.length === 2 ? (Number(y) > 50 ? `19${y}` : `20${y}`) : y;
  }
  return '';
};

/**
 * Construit les 31 cases complètes du modèle Elghali A4 à partir de n'importe quelle réponse API ou Worker
 */
function buildComplete31PigeonsFromResponse(data: any): PigeonData[] {
  const boxes: PigeonData[] = Array.from({ length: 31 }, (_, i) => ({
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

  if (Array.isArray(data?.pigeons)) {
    data.pigeons.forEach((p: any, idx: number) => {
      const slotId = typeof p?.id === 'number' && p.id >= 0 && p.id <= 30 ? p.id : idx;
      if (slotId >= 0 && slotId <= 30 && p) {
        const rawSex = cleanStr(p.sex || p.sexe);
        const isFem = rawSex === 'V' || rawSex === 'F' || /femelle|duivin|hen|♀/i.test(rawSex);
        boxes[slotId] = {
          id: slotId,
          ring: cleanStr(p.ring || p.numero_bague),
          name: cleanStr(p.name || p.nom),
          strain: cleanStr(p.strain || p.race),
          owner: cleanStr(p.owner || p.eleveur),
          color: cleanStr(p.color || p.couleur),
          year: inferYearFromRing(cleanStr(p.ring || p.numero_bague), cleanStr(p.year || p.date_naissance)),
          sex: slotId === 0 ? (isFem ? 'V' : 'M') : slotId % 2 === 1 ? 'M' : 'V',
          results: cleanStr(p.results || p.palmares || p.resultats),
          bgColor: p.bgColor || '#ffffff',
        };
      }
    });
  }

  const mergeSlot = (id: number, src: any, defaultSex: 'M' | 'V') => {
    if (!src || typeof src !== 'object') return;
    const prev = boxes[id];
    const ring = cleanStr(src.numero_bague || src.ring) || prev.ring;
    const name = cleanStr(src.nom || src.name) || prev.name;
    const owner = cleanStr(src.eleveur || src.owner || src.proprietaire) || prev.owner;
    const strain = cleanStr(src.race || src.strain) || prev.strain;
    const color = cleanStr(src.couleur || src.color) || prev.color;
    const year = inferYearFromRing(ring, cleanStr(src.date_naissance || src.year) || prev.year);
    const results = cleanStr(src.resultats || src.palmares || src.results) || prev.results;
    const rawSex = cleanStr(src.sexe || src.sex);
    const isFem = rawSex === 'F' || rawSex === 'V' || /femelle|duivin|hen|♀/i.test(rawSex);

    boxes[id] = {
      ...prev,
      id,
      ring,
      name,
      owner,
      strain,
      color,
      year,
      sex: id === 0 ? (isFem ? 'V' : 'M') : defaultSex,
      results,
    };
  };

  // G0 : Sujet #0
  if (data?.pigeon) {
    mergeSlot(0, data.pigeon, data.pigeon.sexe === 'F' ? 'V' : 'M');
  }

  // Ajouter les résultats de courses au sujet #0 si présents
  if (Array.isArray(data?.resultats_courses) && data.resultats_courses.length > 0) {
    const courseLines = data.resultats_courses
      .map((c: any) =>
        [
          cleanStr(c.position),
          cleanStr(c.course),
          cleanStr(c.distance_km) ? `${cleanStr(c.distance_km)}km` : '',
          cleanStr(c.nombre_participants) ? `${cleanStr(c.nombre_participants)}p` : '',
          cleanStr(c.date),
        ]
          .filter(Boolean)
          .join(' ')
      )
      .filter(Boolean);
    if (courseLines.length > 0) {
      const currentRes = boxes[0].results;
      const missingLines = courseLines.filter((line: string) => !currentRes.includes(line));
      if (missingLines.length > 0) {
        boxes[0].results = [currentRes, ...missingLines].filter(Boolean).join('\n');
      }
    }
  }

  // G1 : Parents #1 et #2
  mergeSlot(1, data?.parents?.pere, 'M');
  mergeSlot(2, data?.parents?.mere, 'V');

  // G2 : Grands-Parents #3 à #6
  const gp = data?.grands_parents || {};
  mergeSlot(3, gp.paternel_pere || gp.paternel, 'M');
  mergeSlot(4, gp.paternel_mere, 'V');
  mergeSlot(5, gp.maternel_pere, 'M');
  mergeSlot(6, gp.maternel_mere, 'V');

  // G3 : Arrière-Grands-Parents #7 à #14
  const agp = data?.arriere_grands_parents || {};
  mergeSlot(7, agp.pp_pp, 'M');
  mergeSlot(8, agp.pp_pm, 'V');
  mergeSlot(9, agp.pm_pp, 'M');
  mergeSlot(10, agp.pm_pm, 'V');
  mergeSlot(11, agp.mp_pp, 'M');
  mergeSlot(12, agp.mp_pm, 'V');
  mergeSlot(13, agp.mm_pp, 'M');
  mergeSlot(14, agp.mm_pm, 'V');

  // G4 : Arrière-Arrière-Grands-Parents #15 à #30
  const aagp = data?.arriere_arriere_grands_parents || {};
  for (let id = 15; id <= 30; id++) {
    const slotObj = aagp[`case_${id}`] || aagp[id];
    mergeSlot(id, slotObj, id % 2 === 1 ? 'M' : 'V');
  }

  return boxes;
}

export const ImportPedigreeModal: React.FC<ImportPedigreeModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Configuration Cloudflare Worker optionnelle
  const [workerUrl, setWorkerUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('CF_WORKER_PEDIGREE_URL') || '';
    }
    return '';
  });
  const [showWorkerConfig, setShowWorkerConfig] = useState<boolean>(false);

  // État du formulaire pré-rempli (avec les 31 cases synchronisées comme source unique de vérité)
  const [formData, setFormData] = useState<ExtractedPigeonSchema | null>(null);
  const [showFullTreeDetails, setShowFullTreeDetails] = useState<boolean>(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Mise à jour synchronisée d'une case (0 à 30) dans formData.pigeons
  const updateBoxField = (boxId: number, field: keyof PigeonData, value: string) => {
    if (!formData) return;
    const updatedPigeons = [...formData.pigeons];
    updatedPigeons[boxId] = {
      ...updatedPigeons[boxId],
      [field]: value,
    };

    const nextFormData: ExtractedPigeonSchema = {
      ...formData,
      pigeons: updatedPigeons,
    };

    if (boxId === 0) {
      nextFormData.pigeon = {
        ...nextFormData.pigeon,
        numero_bague: updatedPigeons[0].ring || null,
        nom: updatedPigeons[0].name || null,
        sexe: updatedPigeons[0].sex === 'V' ? 'F' : 'M',
        race: updatedPigeons[0].strain || null,
        couleur: updatedPigeons[0].color || null,
        date_naissance: updatedPigeons[0].year || null,
        eleveur: updatedPigeons[0].owner || null,
        palmares: updatedPigeons[0].results || null,
      };
    }

    setFormData(nextFormData);
  };

  // Compression côté client & lecture en base64 haute netteté pour lecture G0..G4
  const readFileAsBase64 = async (file: File): Promise<{ base64Data: string; mimeType: string }> => {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const res = reader.result as string;
          const commaIdx = res.indexOf(',');
          resolve({
            base64Data: commaIdx >= 0 ? res.slice(commaIdx + 1) : res,
            mimeType: 'application/pdf',
          });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    // Compression optimisée (max 1.5 Mo, 2200px pour garder les petits numéros de bague G3/G4 parfaitement lisibles)
    let processedFile = file;
    try {
      processedFile = await imageCompression(file, {
        maxSizeMB: 1.4,
        maxWidthOrHeight: 2200,
        useWebWorker: true,
        fileType: 'image/jpeg',
        initialQuality: 0.88,
      });
    } catch (compressionErr) {
      console.warn('browser-image-compression warning, fallback direct:', compressionErr);
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = reader.result as string;
        const commaIdx = res.indexOf(',');
        resolve({
          base64Data: commaIdx >= 0 ? res.slice(commaIdx + 1) : res,
          mimeType: processedFile.type || 'image/jpeg',
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(processedFile);
    });
  };

  const handleFileSelected = (file: File) => {
    const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
    const isExtensionValid = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    const isMimeValid =
      file.type === 'application/pdf' ||
      file.type === 'image/jpeg' ||
      file.type === 'image/png' ||
      file.type.startsWith('image/');

    if (!isExtensionValid && !isMimeValid) {
      setErrorMessage('Format non supporté. Veuillez importer un document PDF ou une image (JPG, JPEG, PNG).');
      return;
    }

    setErrorMessage(null);
    setFormData(null);
    setSelectedFile(file);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }

    processFile(file);
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setErrorMessage(null);
    setProcessingStep('1/2 Préparation haute résolution du pedigree...');

    try {
      const { base64Data, mimeType } = await readFileAsBase64(file);

      setProcessingStep('2/2 Extraction intégrale des 5 générations (31 cases) vers le modèle Elghali...');

      let targetUrl = workerUrl.trim() || '/api/extract-pedigree';
      let response: Response;

      try {
        response = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileData: base64Data,
            mimeType,
            filename: file.name,
          }),
        });
      } catch (workerErr: any) {
        if (workerUrl.trim()) {
          console.warn('Échec appel Worker, bascule sur API interne:', workerErr);
          targetUrl = '/api/extract-pedigree';
          response = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileData: base64Data,
              mimeType,
              filename: file.name,
            }),
          });
        } else {
          throw workerErr;
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur du serveur (${response.status})`);
      }

      setProcessingStep('Construction des 31 cases du modèle Elghali A4...');
      const rawResult = await response.json();
      const data = rawResult.data || rawResult;

      if (!data || typeof data !== 'object') {
        throw new Error('Le résultat de l’extraction est invalide.');
      }

      const completePigeons = buildComplete31PigeonsFromResponse(data);
      const p0 = completePigeons[0];

      const extracted: ExtractedPigeonSchema = {
        pigeon: {
          nom: p0.name || null,
          numero_bague: p0.ring || null,
          sexe: p0.sex === 'V' ? 'F' : 'M',
          race: p0.strain || null,
          date_naissance: p0.year || null,
          couleur: p0.color || null,
          eleveur: p0.owner || cleanStr(data.details_elevage?.nom_eleveur) || cleanStr(data.ownerName) || null,
          proprietaire: cleanStr(data.pigeon?.proprietaire) || null,
          palmares: p0.results || null,
        },
        parents: {
          pere: {
            nom: completePigeons[1].name || null,
            numero_bague: completePigeons[1].ring || null,
            eleveur: completePigeons[1].owner || null,
            race: completePigeons[1].strain || null,
            couleur: completePigeons[1].color || null,
            palmares: completePigeons[1].results || null,
          },
          mere: {
            nom: completePigeons[2].name || null,
            numero_bague: completePigeons[2].ring || null,
            eleveur: completePigeons[2].owner || null,
            race: completePigeons[2].strain || null,
            couleur: completePigeons[2].color || null,
            palmares: completePigeons[2].results || null,
          },
        },
        grands_parents: {
          paternel_pere: {
            nom: completePigeons[3].name || null,
            numero_bague: completePigeons[3].ring || null,
            eleveur: completePigeons[3].owner || null,
            race: completePigeons[3].strain || null,
            couleur: completePigeons[3].color || null,
            palmares: completePigeons[3].results || null,
          },
          paternel_mere: {
            nom: completePigeons[4].name || null,
            numero_bague: completePigeons[4].ring || null,
            eleveur: completePigeons[4].owner || null,
            race: completePigeons[4].strain || null,
            couleur: completePigeons[4].color || null,
            palmares: completePigeons[4].results || null,
          },
          maternel_pere: {
            nom: completePigeons[5].name || null,
            numero_bague: completePigeons[5].ring || null,
            eleveur: completePigeons[5].owner || null,
            race: completePigeons[5].strain || null,
            couleur: completePigeons[5].color || null,
            palmares: completePigeons[5].results || null,
          },
          maternel_mere: {
            nom: completePigeons[6].name || null,
            numero_bague: completePigeons[6].ring || null,
            eleveur: completePigeons[6].owner || null,
            race: completePigeons[6].strain || null,
            couleur: completePigeons[6].color || null,
            palmares: completePigeons[6].results || null,
          },
        },
        details_elevage: data.details_elevage || {},
        resultats_courses: data.resultats_courses || [],
        pigeons: completePigeons,
        ownerName: cleanStr(data.ownerName || data.details_elevage?.nom_eleveur || p0.owner),
        ownerDetails: cleanStr(data.ownerDetails || data.details_elevage?.adresse_eleveur),
      };

      setFormData(extracted);
      setProcessingStep('');
    } catch (err: any) {
      console.error('Erreur importation:', err);
      setErrorMessage(
        err.message ||
          'Impossible d\'analyser ce document. Vérifiez que le document PDF ou la photo est bien net et lisible.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTestOfficialExample = () => {
    const demo = getPdfDemoPigeons();
    const completePigeons = buildComplete31PigeonsFromResponse({
      pigeons: demo,
      ownerName: 'Baetens Willy & Ivan',
      ownerDetails: 'Europark Oost 15D\n9100 Sint-Niklaas\nTel.: 0473/97.91.01\nivan.baetens@bricon.be',
    });
    const p0 = completePigeons[0];
    setFormData({
      pigeon: {
        nom: p0.name || 'Boraq',
        numero_bague: p0.ring || 'MA 593-21',
        sexe: 'M',
        race: p0.strain || 'Kras',
        date_naissance: p0.year || '2021',
        eleveur: p0.owner || 'Abdessamad El Bahdaoui',
        palmares: p0.results,
      },
      parents: {
        pere: { nom: completePigeons[1].name, numero_bague: completePigeons[1].ring },
        mere: { nom: completePigeons[2].name, numero_bague: completePigeons[2].ring },
      },
      grands_parents: {
        paternel_pere: { nom: completePigeons[3].name, numero_bague: completePigeons[3].ring },
        paternel_mere: { nom: completePigeons[4].name, numero_bague: completePigeons[4].ring },
        maternel_pere: { nom: completePigeons[5].name, numero_bague: completePigeons[5].ring },
        maternel_mere: { nom: completePigeons[6].name, numero_bague: completePigeons[6].ring },
      },
      pigeons: completePigeons,
      ownerName: 'Baetens Willy & Ivan',
      ownerDetails: 'Europark Oost 15D\n9100 Sint-Niklaas\nTel.: 0473/97.91.01\nivan.baetens@bricon.be',
    });
    setErrorMessage(null);
  };

  // Enregistrement final : applique les 31 cases complètes sur le modèle Elghali A4 et sauvegarde tous les pigeons
  const handleSaveAndApply = () => {
    if (!formData) return;

    const finalPigeons: PigeonData[] = formData.pigeons.map((p, idx) => ({
      id: idx,
      ring: cleanStr(p.ring),
      name: cleanStr(p.name),
      strain: cleanStr(p.strain),
      owner: cleanStr(p.owner),
      color: cleanStr(p.color),
      year: inferYearFromRing(cleanStr(p.ring), cleanStr(p.year)),
      sex: (idx === 0 ? (p.sex === 'V' ? 'V' : 'M') : idx % 2 === 1 ? 'M' : 'V') as 'M' | 'V',
      results: cleanStr(p.results),
      bgColor: p.bgColor || '#ffffff',
    }));

    onImportSuccess({
      pigeons: finalPigeons,
      ownerName: cleanStr(finalPigeons[0].owner || formData.ownerName),
      ownerDetails: cleanStr(formData.ownerDetails),
      theme: 'elghali',
    });

    setFormData(null);
    setSelectedFile(null);
    setFilePreview(null);
    onClose();
  };

  const filledBoxesCount = formData
    ? formData.pigeons.filter((p) => p.ring.trim() !== '' || p.name.trim() !== '' || p.results.trim() !== '').length
    : 0;

  const isPigeonCriticalMissing =
    formData && (!formData.pigeons[0]?.ring && !formData.pigeons[0]?.name);

  const isRingFormatWarning =
    formData && formData.pigeons[0]?.ring && !isRingFormatStandard(formData.pigeons[0].ring);

  return (
    <div className="fixed inset-0 z-[10000] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
        
        {/* HEADER DE LA MODALE */}
        <div className="bg-gradient-to-r from-red-700 via-rose-700 to-red-800 text-white px-5 py-3.5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-amber-300 shadow-sm">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base leading-tight tracking-tight">
                Importation Intégrale vers le Modèle Elghali A4 (31 Cases)
              </h3>
              <p className="text-[11px] text-red-100">
                Convertit vos anciens pedigrees (PDF ou Photo) vers le modèle officiel Elghali 5 générations
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* CONTENU PRINCIPAL */}
        <div className="p-4 sm:p-5 max-h-[84vh] overflow-y-auto space-y-4">
          
          {/* ÉCRAN 1 : CHOIX DU FICHIER SI AUCUNE EXTRACTION ACTIVE */}
          {!formData && !isProcessing && (
            <div className="space-y-4">
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelected(f);
                  e.target.value = '';
                }}
                className="hidden"
              />

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelected(f);
                  e.target.value = '';
                }}
                className="hidden"
              />

              {/* CONFIGURATION CLOUDFLARE WORKER (OPTIONNELLE) */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <button
                  type="button"
                  onClick={() => setShowWorkerConfig(!showWorkerConfig)}
                  className="flex items-center justify-between w-full text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Globe size={14} className="text-amber-600" />
                    <span>Serveur d'extraction (Par défaut : Extracteur IA Elghali 31 cases intégré)</span>
                  </span>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    {workerUrl ? '✓ Worker externe actif' : '✓ Extracteur 31 cases actif'}
                    {showWorkerConfig ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </span>
                </button>

                {showWorkerConfig && (
                  <div className="mt-2.5 pt-2.5 border-t border-slate-200 space-y-2">
                    <p className="text-[11px] text-slate-500">
                      Laissez vide pour utiliser le moteur d'extraction complet 31 cases intégré, ou indiquez l'URL d'un Cloudflare Worker personnalisé :
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={workerUrl}
                        onChange={(e) => {
                          setWorkerUrl(e.target.value);
                          if (typeof window !== 'undefined') {
                            if (e.target.value.trim()) {
                              localStorage.setItem('CF_WORKER_PEDIGREE_URL', e.target.value.trim());
                            } else {
                              localStorage.removeItem('CF_WORKER_PEDIGREE_URL');
                            }
                          }
                        }}
                        placeholder="https://pedigree-worker.mon-compte.workers.dev"
                        className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                      />
                      {workerUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setWorkerUrl('');
                            localStorage.removeItem('CF_WORKER_PEDIGREE_URL');
                          }}
                          className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold"
                        >
                          Effacer
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ZONE DE DROP / SÉLECTION */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-red-300 hover:border-red-500 bg-red-50/40 hover:bg-red-50/70 rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all group"
              >
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform mb-3">
                  <Upload size={26} />
                </div>
                <h4 className="text-sm font-bold text-slate-800">
                  Cliquez ici pour importer votre ancien pedigree
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Sélectionnez un document <strong>PDF</strong> ou une <strong>Photo / Scan (JPG, PNG)</strong>
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  <span className="text-[10px] bg-red-100 text-red-800 font-bold px-2.5 py-0.5 rounded-full border border-red-200">
                    Extraction 5 Générations (G0 à G4)
                  </span>
                  <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
                    Conversion automatique Modèle Elghali A4
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Enregistrement complet des pigeons
                  </span>
                </div>
              </div>

              {/* BOUTON CAMÉRA SMARTPHONE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Camera size={16} className="text-amber-400" />
                  <span>Prendre en photo un ancien pedigree</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestOfficialExample}
                  className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-slate-300 transition-all cursor-pointer"
                  title="Charger un exemple complet de 31 cases pour tester immédiatement"
                >
                  <Sparkles size={14} className="text-red-600" />
                  <span>Tester l'Exemple Officiel (31 cases)</span>
                </button>
              </div>

              {/* RAPPEL SUR LE FORMAT D'ENTRÉE */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Info size={14} className="text-blue-600 shrink-0" />
                  <span>Présentation unifiée avec le modèle Elghali A4 :</span>
                </div>
                <p>
                  Importez n'importe quel ancien pedigree (PDF ou photo). Toutes les cases (Sujet G0, Parents G1, Grands-Parents G2, Arrière-Grands-Parents G3 et 5ème génération G4) ainsi que les palmarès et origines sont extraits et placés directement dans votre modèle officiel <strong>Elghali A4</strong>.
                </p>
              </div>
            </div>
          )}

          {/* ÉCRAN DE CHARGEMENT / ANALYSE */}
          {isProcessing && (
            <div className="py-12 px-4 text-center space-y-4">
              <div className="relative inline-flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-red-600 animate-spin" />
                <Sparkles className="w-5 h-5 text-amber-500 absolute animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">
                  {processingStep || 'Numérisation complète des 31 cases du pedigree...'}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Lecture de toutes les colonnes (G0, G1, G2, G3, G4), bagues, noms, éleveurs et palmarès...
                </p>
              </div>
            </div>
          )}

          {/* MESSAGE D'ERREUR ÉVENTUEL */}
          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-300 text-red-800 rounded-xl text-xs flex items-start gap-2.5">
              <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Erreur d'importation</p>
                <p className="mt-0.5 text-red-700">{errorMessage}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 bg-red-600 text-white rounded font-bold text-[10px] hover:bg-red-700 cursor-pointer"
                  >
                    Réessayer un autre fichier
                  </button>
                  <button
                    type="button"
                    onClick={handleTestOfficialExample}
                    className="px-2.5 py-1 bg-white border border-red-300 text-red-800 rounded font-bold text-[10px] hover:bg-red-50 cursor-pointer"
                  >
                    Tester avec l'exemple
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ÉCRAN 2 : FORMULAIRE PRÉ-REMPLI SYNCHRONISÉ SUR LES 31 CASES */}
          {formData && !isProcessing && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              {/* BANNIÈRE DE VALIDATION RAPIDE EN HAUT */}
              <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center gap-2.5">
                  <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
                  <div>
                    <div className="text-xs font-black">
                      Extraction terminée : {filledBoxesCount} case(s) remplie(s) sur les 31 cases du modèle Elghali A4 !
                    </div>
                    <p className="text-[11px] text-emerald-800">
                      Cliquez sur le bouton vert pour appliquer immédiatement tout le pedigree et enregistrer les pigeons, ou vérifiez les cases ci-dessous.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleSaveAndApply}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Save size={15} />
                    <span>Appliquer au Modèle Elghali</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(null);
                      setSelectedFile(null);
                      setFilePreview(null);
                    }}
                    className="px-2.5 py-2 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[11px] rounded-xl flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw size={12} />
                    <span>Autre fichier</span>
                  </button>
                </div>
              </div>

              {isPigeonCriticalMissing && (
                <div className="p-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl text-xs flex items-start gap-2">
                  <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Attention :</span> Le numéro de bague ou le nom du sujet principal (Case #0) est vide. Vous pouvez le compléter ci-dessous.
                  </div>
                </div>
              )}

              {isRingFormatWarning && (
                <div className="p-2.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-[11px] flex items-center gap-2">
                  <Info size={14} className="text-blue-600 shrink-0" />
                  <span>
                    Numéro de bague détecté : « {formData.pigeons[0]?.ring} ». Vous pouvez le corriger si nécessaire.
                  </span>
                </div>
              )}

              {/* 1. SUJET DU PÉDIGREE (G0 - Case #0) */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h4 className="text-xs font-black uppercase text-slate-800 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
                    <span>1. Sujet Principal du Pédigree (G0)</span>
                  </h4>
                  <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                    Case Principale #0
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-1">
                      Numéro de Bague *
                    </label>
                    <input
                      type="text"
                      value={formData.pigeons[0]?.ring || ''}
                      onChange={(e) => updateBoxField(0, 'ring', e.target.value)}
                      placeholder="ex: MA 593-21"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-red-600 font-bold focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-1">
                      Nom / Surnom
                    </label>
                    <input
                      type="text"
                      value={formData.pigeons[0]?.name || ''}
                      onChange={(e) => updateBoxField(0, 'name', e.target.value)}
                      placeholder='ex: Boraq'
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-1">
                      Sexe
                    </label>
                    <select
                      value={formData.pigeons[0]?.sex || 'M'}
                      onChange={(e) => updateBoxField(0, 'sex', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:ring-1 focus:ring-red-500"
                    >
                      <option value="M">Mâle (♂)</option>
                      <option value="V">Femelle (♀)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-1">
                      Éleveur / Propriétaire
                    </label>
                    <input
                      type="text"
                      value={formData.pigeons[0]?.owner || ''}
                      onChange={(e) => updateBoxField(0, 'owner', e.target.value)}
                      placeholder="ex: Abdessamad El Bahdaoui"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-1">
                      Souche / Lignée
                    </label>
                    <input
                      type="text"
                      value={formData.pigeons[0]?.strain || ''}
                      onChange={(e) => updateBoxField(0, 'strain', e.target.value)}
                      placeholder="ex: Dirk Van Dyck"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-1">
                      Couleur
                    </label>
                    <input
                      type="text"
                      value={formData.pigeons[0]?.color || ''}
                      onChange={(e) => updateBoxField(0, 'color', e.target.value)}
                      placeholder="ex: Kras / Écaillé"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1">
                    Palmarès / Prix / Notes de la Case #0
                  </label>
                  <textarea
                    rows={3}
                    value={formData.pigeons[0]?.results || ''}
                    onChange={(e) => updateBoxField(0, 'results', e.target.value)}
                    placeholder="ex: 1°Ace Speed 4/4 Club '22&#10;1. 274km 1490p Club"
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-red-500 font-mono"
                  />
                </div>
              </div>

              {/* 2. PARENTS (G1 - Cases #1 et #2) */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <div className="border-b border-slate-200 pb-1.5">
                  <h4 className="text-xs font-black uppercase text-slate-800 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                    <span>2. Parents Directs (G1 : Cases #1 et #2)</span>
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: 1, title: 'Père (#1) ♂', bg: 'bg-blue-50/50 border-blue-200', text: 'text-blue-900' },
                    { id: 2, title: 'Mère (#2) ♀', bg: 'bg-rose-50/50 border-rose-200', text: 'text-rose-900' },
                  ].map((item) => {
                    const box = formData.pigeons[item.id];
                    return (
                      <div key={item.id} className={`p-2.5 rounded-lg border space-y-1.5 ${item.bg}`}>
                        <div className={`text-[11px] font-bold flex items-center justify-between ${item.text}`}>
                          <span>{item.title}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-600 mb-0.5">N° Bague</label>
                            <input
                              type="text"
                              value={box?.ring || ''}
                              onChange={(e) => updateBoxField(item.id, 'ring', e.target.value)}
                              placeholder={`Bague #${item.id}`}
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-red-600 font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Nom</label>
                            <input
                              type="text"
                              value={box?.name || ''}
                              onChange={(e) => updateBoxField(item.id, 'name', e.target.value)}
                              placeholder={`Nom #${item.id}`}
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 font-semibold"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Éleveur</label>
                            <input
                              type="text"
                              value={box?.owner || ''}
                              onChange={(e) => updateBoxField(item.id, 'owner', e.target.value)}
                              placeholder="Éleveur"
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-[11px] text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Couleur / Lignée</label>
                            <input
                              type="text"
                              value={box?.strain || box?.color || ''}
                              onChange={(e) => updateBoxField(item.id, 'strain', e.target.value)}
                              placeholder="Couleur / Souche"
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-[11px] text-slate-800"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Palmarès / Notes</label>
                          <textarea
                            rows={2}
                            value={box?.results || ''}
                            onChange={(e) => updateBoxField(item.id, 'results', e.target.value)}
                            placeholder="Father/Mother of..., palmarès..."
                            className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-[11px] text-slate-800 font-mono"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. GRANDS-PARENTS (G2 - Cases #3 à #6) */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <div className="border-b border-slate-200 pb-1.5">
                  <h4 className="text-xs font-black uppercase text-slate-800 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                    <span>3. Les 4 Grands-Parents (G2 : Cases #3 à #6)</span>
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { id: 3, label: 'Père du Père (#3) ♂' },
                    { id: 4, label: 'Mère du Père (#4) ♀' },
                    { id: 5, label: 'Père de la Mère (#5) ♂' },
                    { id: 6, label: 'Mère de la Mère (#6) ♀' },
                  ].map((item) => {
                    const box = formData.pigeons[item.id];
                    return (
                      <div key={item.id} className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-700 block">{item.label}</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          <input
                            type="text"
                            value={box?.ring || ''}
                            onChange={(e) => updateBoxField(item.id, 'ring', e.target.value)}
                            placeholder={`Bague #${item.id}`}
                            className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-red-600 font-bold"
                          />
                          <input
                            type="text"
                            value={box?.name || ''}
                            onChange={(e) => updateBoxField(item.id, 'name', e.target.value)}
                            placeholder={`Nom #${item.id}`}
                            className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 font-semibold"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <input
                            type="text"
                            value={box?.owner || ''}
                            onChange={(e) => updateBoxField(item.id, 'owner', e.target.value)}
                            placeholder="Éleveur"
                            className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-0.5 text-[11px] text-slate-800"
                          />
                          <input
                            type="text"
                            value={box?.strain || box?.color || ''}
                            onChange={(e) => updateBoxField(item.id, 'strain', e.target.value)}
                            placeholder="Couleur / Souche"
                            className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-0.5 text-[11px] text-slate-800"
                          />
                        </div>
                        <textarea
                          rows={2}
                          value={box?.results || ''}
                          onChange={(e) => updateBoxField(item.id, 'results', e.target.value)}
                          placeholder={`Palmarès / Notes #${item.id}`}
                          className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-[10px] text-slate-800 font-mono"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4. ARBRE GÉNÉALOGIQUE COMPLET G3 (#7-#14) & G4 (#15-#30) */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                    <h4 className="text-xs font-black uppercase text-slate-800 flex items-center gap-1.5">
                      <GitBranch size={13} className="text-indigo-600" />
                      <span>4. Arrière-Grands-Parents G3 (#7-#14) &amp; 5ème Génération G4 (#15-#30)</span>
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFullTreeDetails(!showFullTreeDetails)}
                    className="text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>
                      {showFullTreeDetails
                        ? 'Masquer G3 & G4'
                        : `Afficher G3 & G4 (${filledBoxesCount} cases détectées)`}
                    </span>
                    {showFullTreeDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>

                {showFullTreeDetails && (
                  <div className="space-y-3 pt-2 border-t border-slate-200 max-h-80 overflow-y-auto pr-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {formData.pigeons.slice(7, 31).map((box) => {
                        const boxId = box.id;
                        return (
                          <div
                            key={boxId}
                            className={`p-2.5 rounded-lg border text-[11px] space-y-1.5 ${
                              box.ring || box.name
                                ? 'bg-white border-slate-300 shadow-xs'
                                : 'bg-slate-100/60 border-dashed border-slate-200 text-slate-400'
                            }`}
                          >
                            <div className="flex justify-between items-center font-bold">
                              <span className="text-slate-700 font-mono">
                                Case #{boxId} ({boxId <= 14 ? 'G3 - 4ème gén.' : 'G4 - 5ème gén.'})
                              </span>
                              <span className={box.sex === 'V' ? 'text-rose-600' : 'text-blue-600'}>
                                {box.sex === 'V' ? '♀ Femelle' : '♂ Mâle'}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              <input
                                type="text"
                                value={box.ring || ''}
                                onChange={(e) => updateBoxField(boxId, 'ring', e.target.value)}
                                placeholder={`Bague #${boxId}`}
                                className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-0.5 text-xs text-red-600 font-bold"
                              />
                              <input
                                type="text"
                                value={box.name || ''}
                                onChange={(e) => updateBoxField(boxId, 'name', e.target.value)}
                                placeholder={`Nom #${boxId}`}
                                className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-0.5 text-[11px] text-slate-900 font-semibold"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              <input
                                type="text"
                                value={box.owner || ''}
                                onChange={(e) => updateBoxField(boxId, 'owner', e.target.value)}
                                placeholder="Éleveur"
                                className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-0.5 text-[10px] text-slate-800"
                              />
                              <input
                                type="text"
                                value={box.strain || box.color || ''}
                                onChange={(e) => updateBoxField(boxId, 'strain', e.target.value)}
                                placeholder="Couleur / Origine"
                                className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-0.5 text-[10px] text-slate-800"
                              />
                            </div>
                            <textarea
                              rows={boxId <= 14 ? 2 : 1}
                              value={box.results || ''}
                              onChange={(e) => updateBoxField(boxId, 'results', e.target.value)}
                              placeholder={`Palmarès / Notes #${boxId}`}
                              className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-0.5 text-[10px] text-slate-700 font-mono"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* BOUTON D'ENREGISTREMENT ET D'APPLICATION AU MODÈLE ELGHALI */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleSaveAndApply}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 active:from-emerald-700 text-white font-black text-sm rounded-xl shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-98 border border-emerald-400"
                >
                  <Save size={18} />
                  <span>Enregistrer et Appliquer au Modèle Elghali A4 ({filledBoxesCount}/31 cases)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFormData(null);
                    setSelectedFile(null);
                    setFilePreview(null);
                  }}
                  className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition-colors cursor-pointer"
                >
                  Annuler
                </button>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};
