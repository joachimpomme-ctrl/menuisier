/**
 * Toolbar — rail horizontal de contrôles et métriques.
 *
 * Remplace les "actions bars" SaaS avec gros CTA colorés.
 *
 * Structure :
 *   - hauteur fixe 40px, fond panel, border-bottom 1px border
 *   - 3 zones horizontales : [start] [middle (flex)] [end]
 *   - rails séparés par `border-right 1px border` entre zones
 *
 * Composants compagnons :
 *   - <ToolbarButton /> — bouton compact 26px, variantes default / primary / ghost
 *   - <ToolbarMetric /> — bloc KPI label+value, séparés par filets internes
 *
 * Règles :
 *   - au MAX 1 bouton primary par Toolbar
 *   - jamais d'emoji en label
 *   - jamais de transition scale, seulement changement de background
 */

import type {
  ReactNode,
  ButtonHTMLAttributes,
} from 'react';

// ---------------------------------------------------------------------------
// Toolbar shell
// ---------------------------------------------------------------------------

export interface ToolbarProps {
  start?: ReactNode;
  children?: ReactNode;
  end?: ReactNode;
  className?: string;
}

export function Toolbar({ start, children, end, className = '' }: ToolbarProps) {
  return (
    <div className={`flex items-stretch rule-b bg-[color:var(--bg-panel)] ${className}`}>
      {start !== undefined && (
        <div className="flex items-center rule-r">
          {start}
        </div>
      )}
      <div className="flex items-stretch flex-1 overflow-x-auto hide-scrollbar">
        {children}
      </div>
      {end !== undefined && (
        <div className="flex items-center gap-1 px-2 rule-l">
          {end}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ToolbarButton
// ---------------------------------------------------------------------------

export interface ToolbarButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'ghost';
  children: ReactNode;
}

export function ToolbarButton({
  variant = 'default',
  className = '',
  children,
  ...rest
}: ToolbarButtonProps) {
  const variantCls =
    variant === 'primary' ? 'tbtn-primary'
    : variant === 'ghost' ? 'tbtn-ghost'
    : '';
  return (
    <button className={`tbtn ${variantCls} ${className}`} {...rest}>
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// ToolbarMetric — KPI dense inline
// ---------------------------------------------------------------------------

export interface ToolbarMetricProps {
  label: string;
  value: ReactNode;
  unit?: string;
}

export function ToolbarMetric({ label, value, unit }: ToolbarMetricProps) {
  return (
    <div className="metric">
      <span className="metric-label">{label}</span>
      <span className="metric-value">
        {value}
        {unit && (
          <span className="text-[10px] text-[color:var(--fg-subtle)] ml-1 font-sans">
            {unit}
          </span>
        )}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ToolbarTabs — rangée d'onglets sobres (pas de pills, pas de fond coloré)
// ---------------------------------------------------------------------------

export interface ToolbarTab<K extends string = string> {
  key: K;
  label: ReactNode;
  disabled?: boolean;
}

export interface ToolbarTabsProps<K extends string = string> {
  tabs: ToolbarTab<K>[];
  active: K;
  onChange: (key: K) => void;
}

export function ToolbarTabs<K extends string = string>({
  tabs,
  active,
  onChange,
}: ToolbarTabsProps<K>) {
  return (
    <div className="flex rule-b bg-[color:var(--bg-panel)]">
      {tabs.map((t) => {
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            disabled={t.disabled}
            onClick={() => onChange(t.key)}
            className={
              'px-3 py-1.5 border-r border-[color:var(--border-hairline)] ' +
              'uppercase tracking-wider text-[10.5px] font-semibold ' +
              (isActive
                ? 'bg-[color:var(--bg-panel-alt)] text-[color:var(--fg)] shadow-[inset_0_-2px_0_var(--accent)]'
                : 'text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] hover:bg-[color:var(--bg-panel-alt)]')
            }
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
