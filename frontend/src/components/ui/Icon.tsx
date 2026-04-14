import React from 'react';
import {
  File,
  Search,
  GitBranch,
  Play,
  Settings,
  ChevronRight,
  ChevronDown,
  X,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Terminal,
  Folder,
  Layout,
  Server,
  Package,
  Cpu,
  Activity,
  Plus,
  Network,
  Shield,
  Clock,
  AlertTriangle,
  Info,
  Wifi,
  FolderOpen,
} from 'lucide-react';

export type IconName =
  | 'file'
  | 'folder'
  | 'folderOpen'
  | 'search'
  | 'git'
  | 'debug'
  | 'settings'
  | 'chevronRight'
  | 'chevronDown'
  | 'close'
  | 'maximize'
  | 'minimize'
  | 'more'
  | 'terminal'
  | 'layout'
  | 'server'
  | 'package'
  | 'cpu'
  | 'activity'
  | 'plus'
  | 'network'
  | 'shield'
  | 'clock'
  | 'alertTriangle'
  | 'info'
  | 'wifi';

const icons: Record<IconName, React.ElementType> = {
  file: File,
  folder: Folder,
  folderOpen: FolderOpen,
  search: Search,
  git: GitBranch,
  debug: Play,
  settings: Settings,
  chevronRight: ChevronRight,
  chevronDown: ChevronDown,
  close: X,
  maximize: Maximize2,
  minimize: Minimize2,
  more: MoreHorizontal,
  terminal: Terminal,
  layout: Layout,
  server: Server,
  package: Package,
  cpu: Cpu,
  activity: Activity,
  plus: Plus,
  network: Network,
  shield: Shield,
  clock: Clock,
  alertTriangle: AlertTriangle,
  info: Info,
  wifi: Wifi,
};

interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
  strokeWidth?: number;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 16,
  strokeWidth = 1.5,
  className,
  ...props
}) => {
  const IconComponent = icons[name] || File;
  return (
    <IconComponent
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      {...props}
    />
  );
};
