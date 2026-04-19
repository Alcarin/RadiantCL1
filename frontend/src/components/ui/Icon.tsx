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
  RefreshCw,
  FolderOpen,
  FolderPlus,
  FoldVertical,
  BrickWall,
  Router,
  EthernetPort,
  Waypoints,
  ArrowDownUp,
  CloudSync,
  ArrowLeftRight,
  Shrink,
  Expand,
  Antenna,
  Phone,
  Bluetooth,
  Cable,
  Satellite,
  SatelliteDish,
  Signal,
  Layers,
  Bug,
  Monitor,
  Database,
  Container,
  HardDrive,
  Plug,
  Rocket,
  SquareChevronRight,
  Telescope,
  Laptop,
  Printer,
  Radio,
  RadioTower,
  Smartphone,
  Usb,
  Globe,
  Plane,
  KeyRound,
  Cloud,
  CloudSun,
  Thermometer,
  Lock,
  Tablet,
} from 'lucide-react';

export type IconName =
  | 'file'
  | 'folder'
  | 'folderOpen'
  | 'folderPlus'
  | 'fold'
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
  | 'wifi'
  | 'refresh'
  | 'brickWall'
  | 'firewall' // Alias for brick-wall-fire
  | 'router'
  | 'ethernetPort'
  | 'waypoints'
  | 'arrowDownUp'
  | 'cloudSync'
  | 'arrowLeftRight'
  | 'shrink'
  | 'expand'
  | 'antenna'
  | 'phone'
  | 'bluetooth'
  | 'cable'
  | 'satellite'
  | 'satelliteDish'
  | 'signal'
  | 'layers'
  | 'bug'
  | 'computer' // Alias for Monitor
  | 'database'
  | 'container'
  | 'hardDrive'
  | 'plug'
  | 'rocket'
  | 'squareChevronRight'
  | 'telescope'
  | 'laptop'
  | 'printer'
  | 'radio'
  | 'radioTower'
  | 'smartphone'
  | 'usb'
  | 'globe'
  | 'plane'
  | 'keyRound'
  | 'cloud'
  | 'cloudSun'
  | 'thermometer'
  | 'lock'
  | 'tablet';

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
  folderPlus: FolderPlus,
  fold: FoldVertical,
  network: Network,
  shield: Shield,
  clock: Clock,
  alertTriangle: AlertTriangle,
  info: Info,
  wifi: Wifi,
  refresh: RefreshCw,
  brickWall: BrickWall,
  firewall: BrickWall,
  router: Router,
  ethernetPort: EthernetPort,
  waypoints: Waypoints,
  arrowDownUp: ArrowDownUp,
  cloudSync: CloudSync,
  arrowLeftRight: ArrowLeftRight,
  shrink: Shrink,
  expand: Expand,
  antenna: Antenna,
  phone: Phone,
  bluetooth: Bluetooth,
  cable: Cable,
  satellite: Satellite,
  satelliteDish: SatelliteDish,
  signal: Signal,
  layers: Layers,
  bug: Bug,
  computer: Monitor,
  database: Database,
  container: Container,
  hardDrive: HardDrive,
  plug: Plug,
  rocket: Rocket,
  squareChevronRight: SquareChevronRight,
  telescope: Telescope,
  laptop: Laptop,
  printer: Printer,
  radio: Radio,
  radioTower: RadioTower,
  smartphone: Smartphone,
  usb: Usb,
  globe: Globe,
  plane: Plane,
  keyRound: KeyRound,
  cloud: Cloud,
  cloudSun: CloudSun,
  thermometer: Thermometer,
  lock: Lock,
  tablet: Tablet,
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
