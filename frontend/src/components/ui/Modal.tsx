import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { cn } from '../../lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  width = 'max-w-md',
  footer,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" 
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div 
        ref={modalRef}
        className={cn(
          "relative bg-rd-sidebar border border-rd-border shadow-2xl flex flex-col w-full animate-in fade-in zoom-in duration-200",
          width
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-9 bg-rd-titlebar select-none">
          <span className="text-[12px] font-medium text-rd-text uppercase tracking-wider">
            {title}
          </span>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[80vh]">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex justify-end gap-2 p-4 bg-rd-sidebar border-t border-rd-border">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
}

export const ModalButton: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'secondary', 
  className, 
  ...props 
}) => {
  const variants = {
    primary: "bg-rd-accent hover:bg-rd-accent-hover text-rd-accent-fg",
    secondary: "bg-[#3e3e42] hover:bg-[#45454d] text-rd-text",
    danger: "bg-[#e51400] hover:bg-[#c71100] text-white",
  };

  return (
    <button
      className={cn(
        "px-4 py-1.5 text-[13px] transition-colors focus:ring-1 focus:ring-rd-focus-border outline-none",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export const ModalInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className, ...props }) => (
  <input
    className={cn(
      "w-full bg-[#3c3c3c] border border-transparent focus:border-rd-accent px-2 py-1 text-rd-text outline-none placeholder:text-rd-text-dim text-[13px]",
      className
    )}
    {...props}
  />
);

export const ModalLabel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <label className={cn("block text-[12px] text-rd-text-dim mb-1 font-medium", className)}>
    {children}
  </label>
);

export const ModalSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ children, className, ...props }) => (
  <select
    className={cn(
      "w-full bg-[#3c3c3c] border border-transparent focus:border-rd-accent px-2 py-1 text-rd-text outline-none text-[13px] appearance-none",
      className
    )}
    {...props}
  >
    {children}
  </select>
);
