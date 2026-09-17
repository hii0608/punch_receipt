import { createContext, useContext } from 'react';
import { en } from './en';
import { ko, type Dictionary } from './ko';
import type { Locale } from '@/engine/types';

export const DICTIONARIES: Record<Locale, Dictionary> = { ko, en };

export function detectLocale(): Locale {
  if (typeof navigator === 'undefined') return 'ko';
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const lang of langs) {
    if (!lang) continue;
    if (lang.toLowerCase().startsWith('ko')) return 'ko';
    if (lang.toLowerCase().startsWith('en')) return 'en';
  }
  return 'en';
}

export const LocaleContext = createContext<Locale>('ko');

export function useT(): Dictionary {
  return DICTIONARIES[useContext(LocaleContext)];
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export type { Dictionary };
