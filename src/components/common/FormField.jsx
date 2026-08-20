import clsx from 'clsx';
import './common.css';

export function Field({ label, required, error, hint, children, htmlFor }) {
  return (
    <div className="sf-field">
      {label && (
        <label htmlFor={htmlFor} className={clsx('sf-label', required && 'sf-label-req')}>
          {label}
        </label>
      )}
      {children}
      {error ? (
        <span className="sf-error-text" role="alert">{error}</span>
      ) : hint ? (
        <span className="sf-hint">{hint}</span>
      ) : null}
    </div>
  );
}

export function Input({ error, className, ...rest }) {
  return <input className={clsx('sf-input', error && 'sf-input-error', className)} {...rest} />;
}

export function Select({ error, className, children, ...rest }) {
  return (
    <select className={clsx('sf-select', error && 'sf-select-error', className)} {...rest}>
      {children}
    </select>
  );
}

export function Textarea({ error, className, ...rest }) {
  return <textarea className={clsx('sf-textarea', error && 'sf-textarea-error', className)} {...rest} />;
}
