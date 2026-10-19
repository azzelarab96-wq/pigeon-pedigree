import './utils/intlSegmenterPolyfill';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { testConnection } from './firebase';

// Verify Firebase Firestore connectivity on app boot
testConnection();

// Nettoyage automatique de toute trace de "micolpe" dans l'URL du navigateur
if (typeof window !== 'undefined' && window.location) {
  try {
    const rawUrl = window.location.href;
    if (/micolpe/i.test(rawUrl)) {
      const urlObj = new URL(rawUrl);
      if (/micolpe/i.test(urlObj.pathname)) {
        urlObj.pathname = urlObj.pathname.replace(/micolpe/gi, '').replace(/\/\/+/g, '/') || '/';
      }
      if (/micolpe/i.test(urlObj.search)) {
        const searchParams = new URLSearchParams(urlObj.search);
        for (const [k, v] of Array.from(searchParams.entries())) {
          if (/micolpe/i.test(k) || /micolpe/i.test(v)) {
            searchParams.delete(k);
          }
        }
        urlObj.search = searchParams.toString() ? `?${searchParams.toString()}` : '';
      }
      if (/micolpe/i.test(urlObj.hash)) {
        urlObj.hash = urlObj.hash.replace(/micolpe/gi, '');
      }
      const cleaned = urlObj.pathname + urlObj.search + urlObj.hash;
      window.history.replaceState(null, '', cleaned);
    }
  } catch (e) {
    console.warn('URL sanitization warning:', e);
  }
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Pigeon Pedigree Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white p-8 flex flex-col items-center justify-center">
          <div className="bg-slate-800 p-6 rounded-xl border border-red-500/50 max-w-lg text-center shadow-2xl">
            <h2 className="text-xl font-bold text-red-400 mb-2">Une erreur est survenue</h2>
            <p className="text-sm text-slate-300 mb-4">
              {this.state.error?.message || 'Erreur inattendue lors du chargement.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded font-semibold text-xs"
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
