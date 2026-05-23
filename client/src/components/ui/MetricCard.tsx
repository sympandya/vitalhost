import React from 'react';

interface MetricCardProps {
  title: string;
  value: React.ReactNode;
  unit?: string;
  subtitle?: React.ReactNode;
  alert?: boolean;
}

export function MetricCard({ title, value, unit, subtitle, alert = false }: MetricCardProps) {
  return (
    <div className={`bg-neutral-900 p-5 rounded-lg border flex flex-col justify-between ${alert ? 'border-red-500/50 bg-red-950/10' : 'border-neutral-800'}`}>
      <div>
        <h3 className="text-neutral-400 text-sm mb-2">{title}</h3>
        <div className="flex items-baseline gap-2">
          <span className={`text-3xl font-bold ${alert ? 'text-red-400' : 'text-white'}`}>{value}</span>
          {unit && <span className="text-neutral-500 text-sm">{unit}</span>}
        </div>
      </div>
      {subtitle && <div className="mt-3">{subtitle}</div>}
    </div>
  );
}