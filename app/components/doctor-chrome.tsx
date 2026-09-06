'use client';

import {
  ArrowLeft,
  Bell,
  Brain,
  CalendarBlank,
  ChatCircle,
  FileText,
  House,
  List,
  Users,
} from '@phosphor-icons/react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { type FocusEvent, useEffect, useRef, useState } from 'react';
import {
  doctorDemoCohortSummary,
  doctorNavigation,
  getDemoPatient,
  getDoctorViewFromPathname,
} from './demo-routes';
import { LogoutButton } from './logout-button';
import { cn, NavigationLink as Link } from './shared';

const navigationIcons = {
  'Visão geral': House,
  Agenda: CalendarBlank,
  Pacientes: Users,
  Mensagens: ChatCircle,
  Relatórios: FileText,
  'Central da IA': Brain,
} as const;

const mobileNavigationLabels = {
  'Visão geral': 'Hoje',
  Agenda: 'Agenda',
  Pacientes: 'Pessoas',
  Mensagens: 'Mens.',
  Relatórios: 'Relat.',
  'Central da IA': 'IA',
} as const;

function getPatientContext(pathname: string) {
  const match = pathname.match(/^\/medico\/pacientes\/([^/]+)/);
  if (!match) return null;

  const patient = getDemoPatient(match[1]);
  if (!patient) return null;

  if (pathname.endsWith('/resumo')) {
    return { title: `Resumo de ${patient.name}`, context: 'Visão cruzada para revisão médica', backHref: `/medico/pacientes/${patient.id}` };
  }
  if (pathname.includes('/pre-consulta/')) {
    return { title: `Pré-consulta de ${patient.name}`, context: 'Contexto para revisar antes do atendimento', backHref: `/medico/pacientes/${patient.id}` };
  }
  if (pathname.includes('/consultas/')) {
    return { title: `Consulta com ${patient.name}`, context: 'Atendimento e decisões sob revisão médica', backHref: `/medico/pacientes/${patient.id}` };
  }
  if (pathname.endsWith('/mensagens')) {
    return { title: `Mensagens com ${patient.name}`, context: 'Conversa vinculada ao acompanhamento', backHref: `/medico/pacientes/${patient.id}` };
  }

  return { title: patient.name, context: 'Acompanhamento, documentos e evolução', backHref: '/medico/pacientes' };
}

function getRouteContext(pathname: string) {
  const patientContext = getPatientContext(pathname);
  if (patientContext) return patientContext;

  if (pathname.startsWith('/medico/agenda')) {
    return { title: 'Agenda', context: '5 consultas hoje · próxima às 10:30', backHref: null };
  }
  if (pathname.startsWith('/medico/pacientes')) {
    return { title: 'Pacientes', context: '22 acompanhados · 5 check-ins para revisar', backHref: null };
  }
  if (pathname.startsWith('/medico/mensagens')) {
    return { title: 'Mensagens', context: '3 conversas aguardam sua leitura', backHref: null };
  }
  if (pathname.startsWith('/medico/relatorios')) {
    return { title: 'Relatórios', context: '4 relatórios na fila de revisão', backHref: null };
  }
  if (pathname.startsWith('/medico/ia')) {
    return { title: 'Central da IA', context: 'Fontes, dados conectados e regras sob supervisão médica', backHref: null };
  }

  return { title: 'Painel médico', context: 'Sexta, 4 de setembro · 5 consultas · Marina às 10:30', backHref: null };
}

function useCollapsibleChrome() {
  const [collapsed, setCollapsed] = useState(false);
  const lastY = useRef(0);
  const downwardTravel = useRef(0);
  const upwardTravel = useRef(0);
  const frame = useRef<number | null>(null);
  const focusWithin = useRef(false);
  const menuOpen = useRef(false);

  const expand = () => {
    downwardTravel.current = 0;
    upwardTravel.current = 0;
    setCollapsed(false);
  };

  useEffect(() => {
    lastY.current = Math.max(0, window.scrollY);
    setCollapsed(lastY.current > 96);

    const update = () => {
      frame.current = null;
      const nextY = Math.max(0, window.scrollY);
      const delta = nextY - lastY.current;

      if (nextY <= 24) {
        downwardTravel.current = 0;
        upwardTravel.current = 0;
        setCollapsed(false);
      } else if (Math.abs(delta) >= 2) {
        if (delta > 0) {
          downwardTravel.current += delta;
          upwardTravel.current = 0;
          if (nextY > 96 && downwardTravel.current >= 32 && !focusWithin.current && !menuOpen.current) {
            setCollapsed(true);
            downwardTravel.current = 0;
          }
        } else {
          upwardTravel.current += Math.abs(delta);
          downwardTravel.current = 0;
          if (upwardTravel.current >= 16) {
            setCollapsed(false);
            upwardTravel.current = 0;
          }
        }
      }

      lastY.current = nextY;
    };

    const onScroll = () => {
      if (frame.current === null) frame.current = window.requestAnimationFrame(update);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame.current !== null) window.cancelAnimationFrame(frame.current);
    };
  }, []);

  return {
    collapsed,
    onFocusCapture: (event: FocusEvent<HTMLElement>) => {
      focusWithin.current = Boolean((event.target as HTMLElement).closest('.doctor-chrome-expanded-only'));
      expand();
    },
    onBlurCapture: (event: FocusEvent<HTMLElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) focusWithin.current = false;
    },
    onMenuToggle: (open: boolean) => {
      menuOpen.current = open;
      if (open) expand();
    },
  };
}

export function DoctorChrome({ displayName = 'Dr. Guilherme Martins', demo = true }: { displayName?: string; demo?: boolean }) {
  const pathname = usePathname();
  const activeView = getDoctorViewFromPathname(pathname);
  const routeContext = demo ? getRouteContext(pathname) : { title: 'Acompanhamento', context: displayName, backHref: null };
  const { collapsed, onFocusCapture, onBlurCapture, onMenuToggle } = useCollapsibleChrome();

  return (
    <header
      className="doctor-chrome pointer-events-none sticky top-0 z-40"
      data-collapsed={collapsed ? 'true' : 'false'}
      onFocusCapture={onFocusCapture}
      onBlurCapture={onBlurCapture}
    >
      <div aria-hidden="true" className="doctor-chrome-surface" />

      <div className="doctor-chrome-top grid lg:grid-cols-[252px_minmax(0,1fr)]">
        <Link href="/medico" aria-label="VIVANCE — início" className="doctor-chrome-brand pointer-events-auto hidden items-center px-5 lg:flex">
          <Image src="/brand/vivance-mark.png" alt="" width={42} height={42} className="size-[42px] shrink-0 rounded-2xl ring-1 ring-white/10" priority />
          <span className="doctor-chrome-expanded-only ml-3 min-w-0">
            <strong className="block text-[15px] font-bold tracking-[0.16em] text-white">VIVANCE</strong>
            <span className="mt-1 block text-[10px] font-medium uppercase tracking-[0.1em] text-[#a9c8ee]">Cuidado contínuo</span>
          </span>
        </Link>

        <div className="relative flex min-w-0 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="doctor-chrome-title-block flex min-w-0 flex-1 items-center gap-2.5">
            {routeContext.backHref ? (
              <Link
                href={routeContext.backHref}
                aria-label="Voltar"
                className="pointer-events-auto grid size-10 shrink-0 place-items-center rounded-xl text-[#405675] transition-colors hover:bg-[#edf3fb] hover:text-[#071a3a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0]"
              >
                <ArrowLeft aria-hidden="true" size={20} />
              </Link>
            ) : (
              <Image src="/brand/vivance-mark.png" alt="" width={36} height={36} className="doctor-chrome-mobile-mark size-9 shrink-0 rounded-xl lg:hidden" priority />
            )}
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-[-0.025em] text-[#071a3a] sm:text-xl">
                {routeContext.title}
              </h1>
              <p className="doctor-chrome-context mt-0.5 truncate text-xs font-medium text-[#5b6d88] sm:text-sm">
                {routeContext.context}
              </p>
            </div>
          </div>

          <div className="doctor-chrome-actions flex shrink-0 items-center gap-2 sm:gap-3">
            {demo && <>
            <Link
              href="/medico/pacientes"
              aria-label={`${doctorDemoCohortSummary.activePatients} pacientes acompanhados, ${doctorDemoCohortSummary.checkInsOnTime} com check-ins em dia e ${doctorDemoCohortSummary.checkInsToReview} para revisar. Abrir pacientes.`}
              className="doctor-chrome-expanded-only pointer-events-auto hidden min-h-11 items-center gap-3 rounded-xl border border-[#dbe4f0] bg-white/70 px-3 text-xs font-semibold text-[#405675] min-[1560px]:flex"
            >
              <span><strong className="text-[#071a3a]">{doctorDemoCohortSummary.activePatients}</strong> acompanhados</span>
              <span aria-hidden="true" className="h-4 w-px bg-[#dbe4f0]" />
              <span><strong className="text-[#124da0]">{doctorDemoCohortSummary.checkInsOnTime}</strong> em dia</span>
              <span aria-hidden="true" className="h-4 w-px bg-[#dbe4f0]" />
              <span><strong className="text-[#8a5b09]">{doctorDemoCohortSummary.checkInsToReview}</strong> revisar</span>
            </Link>

            <Link
              href="/medico/agenda"
              className="doctor-chrome-expanded-only pointer-events-auto hidden min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-[#405675] transition-colors hover:bg-[#edf3fb] xl:flex"
            >
              <CalendarBlank aria-hidden="true" size={18} />
              Agenda
            </Link>

            <button
              type="button"
              aria-label="Abrir notificações"
              className="pointer-events-auto relative hidden size-11 cursor-pointer place-items-center rounded-xl text-[#0b2854] transition-colors hover:bg-[#edf3fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0] sm:grid"
            >
              <Bell aria-hidden="true" size={20} />
              <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-[#124da0] text-[9px] font-bold text-white">3</span>
            </button>
            </>}

            <div
              aria-label={`Perfil atual: ${displayName}, médico`}
              className="doctor-chrome-expanded-only pointer-events-auto hidden min-h-11 items-center gap-2.5 rounded-xl px-1.5 text-left transition-colors hover:bg-[#edf3fb] min-[1500px]:flex"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#061b3e] text-[11px] font-bold text-white">{displayName.replace(/^Dr[a]?\.\s*/u, '').split(' ').slice(0, 2).map(part => part[0]).join('')}</span>
              <span><strong className="block text-xs text-[#071a3a]">{displayName}</strong><span className="block text-[11px] text-[#61718a]">Médico</span></span>
            </div>

            <LogoutButton compact className="pointer-events-auto hidden text-[#405675] hover:bg-[#edf3fb] hover:text-[#071a3a] lg:inline-flex" />

            <details
              className="pointer-events-auto relative lg:hidden"
              onToggle={(event) => onMenuToggle(event.currentTarget.open)}
            >
              <summary aria-label="Abrir opções do painel" className="grid size-11 cursor-pointer list-none place-items-center rounded-xl text-[#0b2854] transition-colors hover:bg-[#edf3fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0]">
                <List aria-hidden="true" size={21} weight="bold" />
              </summary>
              <div className="vivance-glass-menu absolute right-0 top-12 z-50 w-64 rounded-xl p-2 shadow-[0_20px_48px_rgba(3,19,45,0.3)]">
                {demo && <Link href="/medico/mensagens" className="flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79a8df]">
                  <Bell aria-hidden="true" size={18} />
                  3 notificações
                </Link>}
                <div className="mt-2 flex min-h-12 items-center gap-2.5 border-t border-white/12 px-3 pt-2 text-white/80" aria-label={`Perfil atual: ${displayName}, médico`}>
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/10 text-[11px] font-bold text-white">{displayName.replace(/^Dr[a]?\.\s*/u, '').split(' ').slice(0, 2).map(part => part[0]).join('')}</span>
                  <span><strong className="block text-xs text-white">{displayName}</strong><span className="block text-[11px]">Médico</span></span>
                </div>
                <LogoutButton className="mt-1 w-full justify-start text-white/90 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79a8df]" />
              </div>
            </details>
          </div>
        </div>
      </div>

      <div className="doctor-chrome-navigation pointer-events-none lg:hidden">
        <nav aria-label="Navegação principal do médico" className="floating-navigation-glass pointer-events-auto grid w-full max-w-[760px] grid-cols-6 items-stretch gap-1 rounded-[22px] p-1.5">
          {doctorNavigation.filter(item => demo || ['Visão geral', 'Pacientes'].includes(item.label)).map((item) => {
            const Icon = navigationIcons[item.label];
            const active = item.label === activeView;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'pointer-events-auto flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 text-[9px] font-semibold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0] min-[430px]:text-[10px] md:min-h-11 md:flex-row md:gap-2 md:px-3 md:text-xs',
                  active ? 'bg-[#061b3e]/92 text-white shadow-[0_7px_18px_rgba(3,19,45,0.18)]' : 'text-[#071a3a] hover:bg-white/70',
                )}
              >
                <Icon aria-hidden="true" size={15} weight={active ? 'fill' : 'regular'} className="shrink-0" />
                <span className="md:hidden">{mobileNavigationLabels[item.label]}</span>
                <span className="hidden md:inline">{item.label === 'Visão geral' ? 'Hoje' : item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
