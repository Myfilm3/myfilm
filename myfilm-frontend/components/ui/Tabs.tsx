import { useState } from 'react';

export type Tab = {
  id: string;
  label: string;
  content: React.ReactNode; // <- importante para que tu page.tsx compile
};

type TabsProps = {
  tabs: Tab[];
  defaultId?: string;
  className?: string;
};

export default function Tabs({ tabs, defaultId, className = '' }: TabsProps) {
  const [active, setActive] = useState<string>(defaultId ?? tabs[0]?.id);
  const current = tabs.find(t => t.id === active);

  return (
    <div className={className}>
      <div className="flex gap-6 border-b border-gray-200 text-sm">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`-mb-px pb-2 transition ${
              active === t.id
                ? 'border-b-2 border-black font-medium text-gray-900'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="pt-4 text-gray-700">
        {current?.content ?? null}
      </div>
    </div>
  );
}