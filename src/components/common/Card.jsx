import clsx from 'clsx';
import './common.css';

export function Card({ className, children, padded = false, ...rest }) {
  return (
    <div className={clsx('sf-card', padded && 'sf-card-pad', className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ title, action, children }) {
  return (
    <div className="sf-card-header">
      <h3 className="sf-card-title">{title}</h3>
      {action || children}
    </div>
  );
}

export function CardBody({ className, children }) {
  return <div className={clsx('sf-card-body', className)}>{children}</div>;
}
