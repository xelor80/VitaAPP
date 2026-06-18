/**
 * BrandContext — White-label branding (in-app live switch).
 *
 * Fetches the currently active brand from the backend on app start and
 * polls every 30 s so that demo presentations pick up admin changes
 * almost instantly without an app reload.
 *
 * Falls back to a hardcoded VitaGuide+ default if the API is unreachable.
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const POLL_INTERVAL_MS = 30_000;
const CACHE_KEY = 'active_brand_cache_v1';

export type Brand = {
  id: string;
  name: string;
  app_name_de: string;
  app_name_it: string;
  app_name_en: string;
  tagline_de: string;
  tagline_it: string;
  tagline_en: string;
  logo_url: string;
  primary_color: string;
  is_active: boolean;
  is_default?: boolean;
};

const DEFAULT_BRAND: Brand = {
  id: 'default',
  name: 'VitaGuide+ (Default)',
  app_name_de: 'VitaGuide+',
  app_name_it: 'VitaGuide+',
  app_name_en: 'VitaGuide+',
  tagline_de: 'Dein KI-Gesundheitscoach',
  tagline_it: 'Il tuo coach IA della salute',
  tagline_en: 'Your AI health coach',
  logo_url: '',
  primary_color: '#C2272F',
  is_active: true,
  is_default: true,
};

type BrandCtx = {
  brand: Brand;
  loading: boolean;
  refresh: () => Promise<void>;
  appName: (lang: string) => string;
  tagline: (lang: string) => string;
};

const Ctx = createContext<BrandCtx>({
  brand: DEFAULT_BRAND,
  loading: true,
  refresh: async () => {},
  appName: () => 'VitaGuide+',
  tagline: () => '',
});

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [brand, setBrand] = useState<Brand>(DEFAULT_BRAND);
  const [loading, setLoading] = useState(true);

  const fetchBrand = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/branding/active`);
      if (res.ok) {
        const data = await res.json();
        setBrand(data);
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data)).catch(() => {});
      }
    } catch (e) {
      // Network error — keep current brand (cache fallback already loaded)
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial: load cached brand instantly, then fetch fresh in background
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(CACHE_KEY)
      .then(cached => {
        if (cached && !cancelled) {
          try { setBrand(JSON.parse(cached)); } catch {}
        }
      })
      .finally(() => { if (!cancelled) fetchBrand(); });
    const interval = setInterval(fetchBrand, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [fetchBrand]);

  const appName = useCallback((lang: string): string => {
    if (lang === 'it') return brand.app_name_it || brand.app_name_de;
    if (lang === 'en') return brand.app_name_en || brand.app_name_de;
    return brand.app_name_de;
  }, [brand]);

  const tagline = useCallback((lang: string): string => {
    if (lang === 'it') return brand.tagline_it || brand.tagline_de;
    if (lang === 'en') return brand.tagline_en || brand.tagline_de;
    return brand.tagline_de;
  }, [brand]);

  return (
    <Ctx.Provider value={{ brand, loading, refresh: fetchBrand, appName, tagline }}>
      {children}
    </Ctx.Provider>
  );
}

export const useBrand = () => useContext(Ctx);
