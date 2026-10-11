import type { ReactNode } from "react";
import "./medical-ui.css";

export function MedicalPageHeader({ title, description, context, actions, level = 1, id, className = "" }: {
  title: ReactNode;
  description?: ReactNode;
  context?: ReactNode;
  actions?: ReactNode;
  level?: 1 | 2 | 3;
  id?: string;
  className?: string;
}) {
  const Heading = level === 1 ? "h1" : level === 2 ? "h2" : "h3";
  return <header className={`medical-page-header ${className}`}>
    <div>{context && <p className="medical-page-context">{context}</p>}<Heading id={id}>{title}</Heading>{description && <p className="medical-page-description">{description}</p>}</div>
    {actions && <div className="medical-page-actions">{actions}</div>}
  </header>;
}
