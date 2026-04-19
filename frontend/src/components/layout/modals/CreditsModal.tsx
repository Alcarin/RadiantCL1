import React from 'react';
import { Modal } from '../../ui/Modal';
import { Icon } from '../../ui/Icon';

interface CreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const techStack = [
  { name: 'Wails', description: 'Desktop App Framework (Go + React)', icon: 'package' as const },
  { name: 'Go', description: 'Backend Logic & Protocols', icon: 'cpu' as const },
  { name: 'React', description: 'Frontend Library', icon: 'layout' as const },
  { name: 'Monaco Editor', description: 'Advanced Code Editor (VS Code core)', icon: 'file' as const },
  { name: 'xterm.js', description: 'Terminal Emulator', icon: 'terminal' as const },
  { name: 'Tree-sitter', description: 'Incremental Parsing System', icon: 'network' as const },
  { name: 'Lucide', description: 'Beautiful & Consistent Icons', icon: 'settings' as const },
  { name: 'Tailwind CSS', description: 'Utility-first Styling', icon: 'activity' as const },
];

export const CreditsModal: React.FC<CreditsModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Credits - RadiantCL1" width="500px">
      <div className="flex flex-col gap-6 p-1">
        <div className="flex flex-col items-center gap-3 py-4 border-b border-rd-border">
          <div className="w-16 h-16 bg-rd-list-hover rounded-2xl flex items-center justify-center text-rd-accent shadow-lg">
            <Icon name="terminal" size={32} />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-rd-text">RadiantCL1</h2>
            <p className="text-sm text-rd-text-dim">Professional Cisco Terminal & Config Explorer</p>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-rd-text-dim uppercase tracking-wider mb-3 px-1">Built with modern tech</h3>
          <div className="grid grid-cols-2 gap-3">
            {techStack.map((tech) => (
              <div 
                key={tech.name}
                className="flex items-start gap-3 p-3 rounded-lg bg-rd-input border border-rd-border hover:border-rd-accent/30 transition-colors group"
              >
                <div className="mt-0.5 text-rd-text-dim group-hover:text-rd-accent transition-colors">
                  <Icon name={tech.icon} size={16} />
                </div>
                <div>
                  <div className="text-sm font-medium text-rd-text">{tech.name}</div>
                  <div className="text-[11px] text-rd-text-dim leading-tight">{tech.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center pt-2">
          <p className="text-[11px] text-rd-text-dim opacity-60">
            &copy; {new Date().getFullYear()} RadiantCL1 Dev Team. All rights reserved.
          </p>
        </div>
      </div>
    </Modal>
  );
};
