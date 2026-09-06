'use client';

import Image from 'next/image';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { DEFAULT_PATIENT_ID, getDemoPatient } from './demo-routes';
import { LogoutButton } from './logout-button';

export type Role = 'doctor' | 'patient';

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

/**
 * The local Vinext runtime currently fails while intercepting Next Link clicks.
 * A standard anchor keeps every demo route reachable through a full navigation.
 */
export function NavigationLink({ children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props}>{children}</a>;
}

/**
 * Compatibility badge for legacy prototype screens.
 * Account switching now happens exclusively through the authenticated login flow.
 */
export function RoleSwitcher({
  role,
  className,
}: {
  role: Role;
  patientId: string;
  className?: string;
}) {
  return (
    <span
      aria-label={`Perfil atual: ${role === 'doctor' ? 'Médico' : 'Paciente'}`}
      className={cn(
        'inline-flex min-h-10 items-center rounded-lg border border-[#dbe4f0] bg-[#edf3fb]/82 px-3.5 text-sm font-semibold text-[#405675]',
        className,
      )}
    >
      {role === 'doctor' ? 'Médico' : 'Paciente'}
    </span>
  );
}

export function RoleHeader({ role, patientId = DEFAULT_PATIENT_ID }: { role: Role; patientId?: string }) {
  const patient = getDemoPatient(patientId);
  const homeHref = role === 'doctor' ? '/medico' : `/paciente/${patientId}`;
  const patientInitials = patient?.name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() ?? 'PA';

  return (
    <header className="border-b border-[#dfe8e3] bg-white/95">
      <div className="mx-auto flex h-[72px] max-w-[1540px] items-center justify-between gap-3 px-4 sm:px-5 lg:px-8">
        <NavigationLink href={homeHref} aria-label="Ir para o início" className="flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b7b68] focus-visible:ring-offset-2">
          <Image src="/brand/vivance-mark.png" alt="" width={40} height={40} className="size-10 shrink-0 rounded-xl" />
          <div className="hidden min-w-0 min-[360px]:block">
            <p className="truncate text-[17px] font-bold tracking-[0.12em]">VIVANCE</p>
            <p className="hidden text-xs font-medium text-[#698078] sm:block">Cuidado contínuo</p>
          </div>
        </NavigationLink>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden text-right sm:block">
            <strong className="block text-xs text-[#17372f]">{patient?.name ?? 'Paciente'}</strong>
            <span className="block text-[11px] text-[#60766f]">Paciente</span>
          </div>
          <div className="hidden size-10 place-items-center rounded-full bg-[#d9eee8] text-sm font-bold text-[#0b6a5b] sm:grid">
            {role === 'doctor' ? 'GM' : patientInitials}
          </div>
          <LogoutButton compact className="text-[#526a62] hover:bg-[#edf7f4] hover:text-[#17372f]" />
        </div>
      </div>
    </header>
  );
}

export function Status({
  children,
  tone = 'green',
}: {
  children: ReactNode;
  tone?: 'green' | 'amber' | 'rose' | 'blue' | 'gray';
}) {
  const tones = {
    green: 'bg-[#e7f4ef] text-[#17624e]',
    amber: 'bg-[#fff0ca] text-[#77500a]',
    rose: 'bg-[#fdecea] text-[#9c453f]',
    blue: 'bg-[#edf3fb] text-[#124da0]',
    gray: 'bg-[#eef2f7] text-[#50627f]',
  };
  return <span className={cn('inline-flex rounded-full px-3 py-1.5 text-xs font-bold', tones[tone])}>{children}</span>;
}

export function Heading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#0b7b68]">{eyebrow}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[#15342c]">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#60766f]">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function Toast({ text, patient = false }: { text: string; patient?: boolean }) {
  return (
    <div
      className={cn(
        'pointer-events-none fixed left-1/2 z-[80] -translate-x-1/2',
        patient ? 'bottom-auto top-20 sm:bottom-24 sm:top-auto lg:bottom-5' : 'bottom-5'
      )}
      aria-live="polite"
    >
      {text && <div className="rounded-xl bg-[#03132d] px-4 py-3 text-sm font-semibold text-white shadow-2xl">{text}</div>}
    </div>
  );
}
