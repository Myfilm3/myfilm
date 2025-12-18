'use client';

import { create } from 'zustand';
import type {
  QVHMood,
  QVHType,
  QVHTime,
  QVHContext,
  DocTheme,
  DocTime,
} from '../types';

export type QVHStep =
  | 'type'
  | 'mood'
  | 'time'
  | 'context'
  | 'doc_theme'
  | 'doc_time'
  | 'result';

export interface QVHStore {
  step: QVHStep;

  type?: QVHType;

  // movies/series
  mood?: QVHMood;
  time?: QVHTime;
  context?: QVHContext;

  // documentary
  docTheme?: DocTheme;
  docTime?: DocTime;

  setType: (type: QVHType) => void;
  setMood: (mood: QVHMood) => void;
  setTime: (time: QVHTime) => void;
  setContext: (context: QVHContext) => void;

  setDocTheme: (theme: DocTheme) => void;
  setDocTime: (time: DocTime) => void;

  nextStep: () => void;
  prevStep: () => void;

  reset: () => void;
}

const getStepsForType = (type?: QVHType): QVHStep[] => {
  if (type === 'documentary') return ['type', 'doc_theme', 'doc_time', 'result'];
  return ['type', 'mood', 'time', 'context', 'result'];
};

export const useQVHStore = create<QVHStore>((set, get) => ({
  step: 'type',
  type: undefined,

  mood: undefined,
  time: undefined,
  context: undefined,

  docTheme: undefined,
  docTime: undefined,

  setType: (type) => {
    // Al cambiar type, reseteamos lo que no toca + ponemos step al siguiente correcto
    if (type === 'documentary') {
      set({
        type,
        mood: undefined,
        time: undefined,
        context: undefined,
        docTheme: undefined,
        docTime: undefined,
        step: 'doc_theme',
      });
      return;
    }

    // movie / series
    set({
      type,
      docTheme: undefined,
      docTime: undefined,
      mood: undefined,
      time: undefined,
      context: undefined,
      step: 'mood',
    });
  },

  setMood: (mood) => set({ mood }),
  setTime: (time) => set({ time }),
  setContext: (context) => set({ context }),

  setDocTheme: (docTheme) => set({ docTheme }),
  setDocTime: (docTime) => set({ docTime }),

  nextStep: () => {
    const { step, type } = get();
    const steps = getStepsForType(type);
    const index = steps.indexOf(step);
    const next = steps[index + 1] ?? step;
    set({ step: next });
  },

  prevStep: () => {
    const { step, type } = get();
    const steps = getStepsForType(type);
    const index = steps.indexOf(step);
    const prev = steps[index - 1] ?? step;
    set({ step: prev });
  },

  reset: () =>
    set({
      step: 'type',
      type: undefined,
      mood: undefined,
      time: undefined,
      context: undefined,
      docTheme: undefined,
      docTime: undefined,
    }),
}));