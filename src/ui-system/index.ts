/**
 * Menuisier — UI System public entry point.
 *
 * Tout composant applicatif doit importer depuis `ui-system`, jamais depuis
 * les fichiers internes directement. Cela garantit la stabilité des imports
 * et permet de refactorer la structure interne sans casser les écrans.
 *
 *   import { Panel, DataTable, StatusBadge, SplitLayout } from '@/ui-system';
 */

export * from './tokens';
export { Panel } from './components/Panel';
export type { PanelProps } from './components/Panel';
export { DataTable } from './components/DataTable';
export type { DataTableColumn, DataTableProps } from './components/DataTable';
export { PropertyGrid } from './components/PropertyGrid';
export type { PropertyGridProps, PropertyRow, PropertyGroup } from './components/PropertyGrid';
export { StatusBadge, ProcurementBadge } from './components/StatusBadge';
export type { StatusBadgeProps, BadgeKind } from './components/StatusBadge';
export {
  Toolbar,
  ToolbarButton,
  ToolbarMetric,
  ToolbarTabs,
} from './components/Toolbar';
export type {
  ToolbarProps,
  ToolbarButtonProps,
  ToolbarMetricProps,
  ToolbarTab,
  ToolbarTabsProps,
} from './components/Toolbar';
export { SplitLayout } from './components/SplitLayout';
export type { SplitLayoutProps } from './components/SplitLayout';
export { KpiBar } from './components/KpiBar';
export type { KpiBarProps, KpiItem } from './components/KpiBar';
export { Legend } from './components/Legend';
export type { LegendProps, LegendItem } from './components/Legend';
export { AlertStrip } from './components/AlertStrip';
export type { AlertStripProps, AlertKind } from './components/AlertStrip';
export { SectionTitle } from './components/SectionTitle';
export type { SectionTitleProps } from './components/SectionTitle';
export {
  Field,
  TextInput,
  NumberInput,
  Select,
} from './components/Input';
export type {
  FieldProps,
  TextInputProps,
  NumberInputProps,
  SelectProps,
} from './components/Input';
