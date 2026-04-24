import React from 'react';
import { Info } from 'lucide-react';

export default function InfoTooltip({ text }) {
  return (
    <div className="relative group inline-flex items-center ml-2 cursor-help align-middle">
      <Info size={16} className="text-text-secondary hover:text-text-primary transition-colors" />
      <div className="absolute left-1/2 -top-2 -translate-y-full -translate-x-1/2 hidden group-hover:block w-64 bg-tooltip text-text-primary text-xs p-3 rounded-lg border border-card-border shadow-xl z-50 pointer-events-none font-normal leading-relaxed text-center">
        {text}
        {/* Triangle pointer */}
        <div className="absolute left-1/2 bottom-0 translate-y-full -translate-x-1/2 border-4 border-transparent border-t-card-border" />
      </div>
    </div>
  );
}
