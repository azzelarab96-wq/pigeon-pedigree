// Polyfill & wrapper ultra-robuste pour Intl.Segmenter (Firefox < 125, Firefox ESR, iOS Safari, Android WebView)
// Corrige définitivement l'erreur "getSegmenter / segmentGraphemes / breakText" dans html2canvas-pro

export function ensureIntlSegmenter(): void {
  if (typeof globalThis === 'undefined') return;

  if (typeof (globalThis as any).Intl === 'undefined') {
    (globalThis as any).Intl = {};
  }

  const intlObj = (globalThis as any).Intl;
  if (intlObj.__safeSegmenterInstalled) return;

  const NativeSegmenter = typeof intlObj.Segmenter === 'function' ? intlObj.Segmenter : null;

  function fallbackSegmentString(
    input: unknown,
    granularity: 'grapheme' | 'word' | 'sentence' = 'grapheme'
  ) {
    const str = String(input == null ? '' : input);
    let chunks: string[] = [];

    if (granularity === 'word') {
      chunks =
        str.match(
          /(\s+|[a-zA-Z0-9\u00C0-\u024F\u0400-\u04FF\u0600-\u06FF_]+|[^\s\da-zA-Z\u00C0-\u024F\u0400-\u04FF\u0600-\u06FF_]+)/g
        ) || (str.length ? [str] : []);
    } else if (granularity === 'sentence') {
      chunks = str.match(/[^.!?]+[.!?]*\s*/g) || (str.length ? [str] : []);
    } else {
      const codePoints = Array.from(str);
      for (let i = 0; i < codePoints.length; i++) {
        let cp = codePoints[i];
        while (
          i + 1 < codePoints.length &&
          /^[\u0300-\u036F\uFE00-\uFE0F\u200D]$/.test(codePoints[i + 1])
        ) {
          cp += codePoints[i + 1];
          i++;
        }
        chunks.push(cp);
      }
    }

    // Garantir que la somme des longueurs UTF-16 correspond exactement à str.length pour Range.setStart/setEnd
    if (chunks.join('') !== str) {
      chunks = Array.from(str);
    }

    const segments: Array<{
      segment: string;
      index: number;
      input: string;
      isWordLike?: boolean;
    }> = [];

    let offset = 0;
    for (let j = 0; j < chunks.length; j++) {
      const seg = chunks[j];
      segments.push({
        segment: seg,
        index: offset,
        input: str,
        isWordLike:
          granularity === 'word'
            ? /[a-zA-Z0-9\u00C0-\u024F\u0400-\u04FF\u0600-\u06FF_]/.test(seg)
            : undefined,
      });
      offset += seg.length;
    }

    return {
      [Symbol.iterator]() {
        return segments[Symbol.iterator]();
      },
      containing(codeUnitIndex: number) {
        const idx = Number(codeUnitIndex) || 0;
        for (let k = 0; k < segments.length; k++) {
          const item = segments[k];
          if (idx >= item.index && idx < item.index + item.segment.length) {
            return item;
          }
        }
        return undefined;
      },
    };
  }

  class SafeSegmenter {
    private locale: string;
    private granularity: 'grapheme' | 'word' | 'sentence';
    private nativeInstance: any = null;

    constructor(locales?: string | string[], options?: { granularity?: 'grapheme' | 'word' | 'sentence' }) {
      const rawLocale = Array.isArray(locales) ? locales[0] : locales;
      this.locale = typeof rawLocale === 'string' && rawLocale.trim() ? rawLocale.trim() : 'fr';
      this.granularity = options?.granularity || 'grapheme';

      if (NativeSegmenter) {
        try {
          this.nativeInstance = new NativeSegmenter(this.locale, { granularity: this.granularity });
        } catch {
          try {
            this.nativeInstance = new NativeSegmenter('en', { granularity: this.granularity });
          } catch {
            this.nativeInstance = null;
          }
        }
      }
    }

    segment(input: unknown) {
      if (this.nativeInstance) {
        try {
          const res = this.nativeInstance.segment(String(input == null ? '' : input));
          if (res && typeof res[Symbol.iterator] === 'function') {
            return res;
          }
        } catch {
          // Repli immédiat sur la segmentation JS pure
        }
      }
      return fallbackSegmentString(input, this.granularity);
    }

    resolvedOptions() {
      return {
        locale: this.locale,
        granularity: this.granularity,
      };
    }

    static supportedLocalesOf(locales?: string | string[]) {
      if (!locales) return [];
      return Array.isArray(locales) ? locales : [locales];
    }
  }

  Object.defineProperty(SafeSegmenter, '__safeSegmenterInstalled', {
    value: true,
    configurable: true,
  });

  try {
    intlObj.Segmenter = SafeSegmenter;
    intlObj.__safeSegmenterInstalled = true;
  } catch {
    try {
      Object.defineProperty(intlObj, 'Segmenter', {
        value: SafeSegmenter,
        writable: true,
        configurable: true,
      });
      intlObj.__safeSegmenterInstalled = true;
    } catch (e) {
      console.warn('Impossible de définir Intl.Segmenter:', e);
    }
  }
}

// Exécution immédiate à l'importation du module
ensureIntlSegmenter();
