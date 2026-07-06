/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import * as Lucide from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: keyof typeof Lucide;
  color: 'blue' | 'emerald' | 'amber' | 'rose' | 'indigo';
  id?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color,
  id
}) => {
  const IconComponent = Lucide[icon] as React.ComponentType<{ className?: string }>;

  const colorStyles = {
    blue: {
      bg: 'bg-gradient-to-br from-[#111114] to-[#16161B]',
      iconBg: 'bg-blue-500/10 text-blue-400 border border-blue-500/15',
      border: 'border-[#1F1F24] hover:border-blue-500/30',
      text: 'text-blue-400',
      glow: 'glow-card-blue'
    },
    emerald: {
      bg: 'bg-gradient-to-br from-[#111114] to-[#16161B]',
      iconBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15',
      border: 'border-[#1F1F24] hover:border-emerald-500/30',
      text: 'text-emerald-400',
      glow: 'glow-card-emerald'
    },
    amber: {
      bg: 'bg-gradient-to-br from-[#111114] to-[#16161B]',
      iconBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/15',
      border: 'border-[#1F1F24] hover:border-amber-500/30',
      text: 'text-amber-400',
      glow: 'glow-card-amber'
    },
    rose: {
      bg: 'bg-gradient-to-br from-[#111114] to-[#16161B]',
      iconBg: 'bg-rose-500/10 text-rose-400 border border-rose-500/15',
      border: 'border-[#1F1F24] hover:border-rose-500/30',
      text: 'text-rose-400',
      glow: 'glow-card-rose'
    },
    indigo: {
      bg: 'bg-gradient-to-br from-[#111114] to-[#16161B]',
      iconBg: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/15',
      border: 'border-[#1F1F24] hover:border-indigo-500/30',
      text: 'text-indigo-400',
      glow: 'glow-card-indigo'
    }
  };

  const currentStyle = colorStyles[color];

  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`relative overflow-hidden rounded-xl border p-5 shadow-sm transition-all duration-300 ${currentStyle.bg} ${currentStyle.border} ${currentStyle.glow}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            {title}
          </p>
          <h4 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl font-display">
            {value}
          </h4>
        </div>
        <div className={`rounded-lg p-2.5 ${currentStyle.iconBg}`}>
          {IconComponent && <IconComponent className="h-5 w-5" />}
        </div>
      </div>
      {subtitle && (
        <div className="mt-3 flex items-center text-xs font-medium text-zinc-400 border-t border-[#1F1F24]/60 pt-2.5">
          <span className="truncate">{subtitle}</span>
        </div>
      )}
    </motion.div>
  );
};
