'use client';

import { useQVHStore } from './store/qvh.store';

import TypeStep from './steps/TypeStep';
import MoodStep from './steps/MoodStep';
import TimeStep from './steps/TimeStep';
import ContextStep from './steps/ContextStep';
import ResultStep from './steps/ResultStep';
import DocThemeStep from './steps/DocThemeStep';
import DocTimeStep from './steps/DocTimeStep';

export default function QueVerHoyPage() {
  const step = useQVHStore((s) => s.step);

  switch (step) {
    case 'type':
      return <TypeStep />;
    case 'mood':
      return <MoodStep />;
    case 'time':
      return <TimeStep />;
    case 'context':
      return <ContextStep />;
    case 'doc_theme':
      return <DocThemeStep />;
    case 'doc_time':
      return <DocTimeStep />;
    case 'result':
      return <ResultStep />;
    default:
      return null;
  }
}