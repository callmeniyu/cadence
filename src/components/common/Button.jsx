import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';
import './common.css';

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', block, loading, icon, className, children, disabled, type = 'button', ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={clsx(
        'sf-btn',
        `sf-btn-${variant}`,
        size === 'sm' && 'sf-btn-sm',
        size === 'lg' && 'sf-btn-lg',
        block && 'sf-btn-block',
        className
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Loader2 size={16} className="sf-spin" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
});

export const IconButton = forwardRef(function IconButton(
  { variant = 'ghost', className, label, children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      className={clsx('sf-btn', `sf-btn-${variant}`, 'sf-btn-icon', className)}
      aria-label={label}
      title={label}
      {...rest}
    >
      {children}
    </button>
  );
});
