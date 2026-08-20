import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import clsx from 'clsx';
import { IconButton } from './Button';
import './common.css';

export function Modal({ open, onClose, title, children, footer, wide }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="sf-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div
        className={clsx('sf-modal', wide && 'sf-modal-wide')}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
      >
        <div className="sf-modal-header">
          <h2 className="sf-modal-title">{title}</h2>
          <IconButton label="Close" onClick={onClose}><X size={18} /></IconButton>
        </div>
        <div className="sf-modal-body">{children}</div>
        {footer && <div className="sf-modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
