import type { ReactNode } from 'react';
import { DEFAULT_PATIENT_ID } from './demo-routes';
import { DoctorChrome } from './doctor-chrome';
import { RoleHeader, type Role } from './shared';

export function WorkspaceShell({
  role,
  patientId = DEFAULT_PATIENT_ID,
  children,
  displayName,
  demo = true,
}: {
  role: Role;
  patientId?: string;
  children: ReactNode;
  displayName?: string;
  demo?: boolean;
}) {
  return (
    <div className={role === 'doctor' ? 'vivance-app-shell min-h-screen text-[#071a3a]' : 'min-h-screen bg-[#f4f7f5] text-[#17372f]'}>
      <a
        href="#main-content"
        className="sr-only z-[90] rounded-lg bg-[#061b3e] px-4 py-3 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Ir para o conteúdo
      </a>
      {role === 'doctor' ? <DoctorChrome displayName={displayName} demo={demo} /> : <RoleHeader role={role} patientId={patientId} />}
      {children}
    </div>
  );
}
