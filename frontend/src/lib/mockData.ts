import { TreeNode } from '../components/ui/TreeView';

export interface Connection {
  id: string;
  name: string;
  host: string;
  status: 'connected' | 'connecting' | 'disconnected';
  type: 'ssh' | 'telnet';
}

export const mockConnections: Connection[] = [
  {
    id: 'conn-1',
    name: 'Core-Switch-01',
    host: '10.0.0.1',
    status: 'connected',
    type: 'ssh',
  },
  {
    id: 'conn-2',
    name: 'Edge-Router-Milan',
    host: '172.16.50.12',
    status: 'connected',
    type: 'ssh',
  },
];

export const mockHosts: TreeNode[] = [
  {
    id: 'folder-milan',
    label: 'Milan Office',
    children: [
      {
        id: 'host-1',
        label: 'Core-Switch-01',
        icon: 'server',
        data: { host: '10.0.0.1', type: 'ssh' },
      },
      {
        id: 'host-2',
        label: 'Dist-Switch-A',
        icon: 'server',
        data: { host: '10.0.0.2', type: 'ssh' },
      },
      {
        id: 'subfolder-wifi',
        label: 'Wi-Fi APs',
        children: [
          {
            id: 'host-3',
            label: 'AP-Floor-1',
            icon: 'wifi',
            data: { host: '10.0.1.10', type: 'ssh' },
          },
          {
            id: 'host-4',
            label: 'AP-Floor-2',
            icon: 'wifi',
            data: { host: '10.0.1.11', type: 'ssh' },
          },
        ],
      },
    ],
  },
  {
    id: 'folder-rome',
    label: 'Rome Branch',
    children: [
      {
        id: 'host-5',
        label: 'Gateway-Rome',
        icon: 'network',
        data: { host: '192.168.1.1', type: 'ssh' },
      },
    ],
  },
  {
    id: 'host-6',
    label: 'Cloud-VPS-01',
    icon: 'server',
    data: { host: 'vps.example.com', type: 'ssh' },
  },
];
