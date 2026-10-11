import Link from "next/link";
import { CalendarDays, ChevronRight, ClipboardList, FileText, Folder, TrendingUp, UserPlus, Users } from "lucide-react";
import { staffActions } from "@/modules/workspace/navigation";
import { widgetCalendar } from "@/modules/workspace/widget-calendar";
import { DoctorNavPending } from "./doctor-nav-pending";

const widgets = [
  { index: 2, key: "agenda", Icon: CalendarDays, description: "" },
  { index: 0, key: "patients", Icon: Users, description: "Acesse fichas e históricos" },
  { index: 1, key: "invite", Icon: UserPlus, description: "Convite para o app ou ficha" },
  { index: 3, key: "encounter", Icon: ClipboardList, description: "Abrir atendimentos" },
  { index: 5, key: "followup", Icon: TrendingUp, description: "Consultar evolução" },
  { index: 4, key: "plans", Icon: FileText, description: "" },
  { index: 6, key: "documents", Icon: Folder, description: "" },
  { index: 7, key: "team", Icon: Users, description: "" },
] as const;

export function DoctorQuickActions({ base, today, agendaSummary }: {
  base: string;
  today: string;
  agendaSummary: string;
}) {
  const actions = staffActions(base);
  const calendar = widgetCalendar(today);
  return <section className="doctor-widgets" aria-labelledby="quick-actions">
    <h2 id="quick-actions">Ações rápidas</h2>
    <ul className="doctor-widget-grid">
      {widgets.map(({ index, key, Icon, description }) => {
        const action = actions[index];
        return <li key={key} className={`doctor-widget-slot doctor-widget-slot-${key}`}>
          <Link href={action.href} className={`doctor-widget doctor-widget-${key}`} aria-label={action.title}>
            <span className="doctor-widget-icon"><Icon size={26} strokeWidth={1.7} aria-hidden="true" /></span>
            <span className="doctor-widget-copy"><strong>{action.title}</strong>{description && <span>{description}</span>}</span>
            <span className="doctor-widget-affordance"><ChevronRight size={18} aria-hidden="true" /><DoctorNavPending /></span>
            {key === "agenda" && <>
              <span className="doctor-widget-date"><b>{calendar.day}</b><strong>{calendar.weekday}</strong><span>{calendar.month}</span></span>
              <span className="doctor-widget-week" aria-hidden="true">{calendar.days.map(day => <span key={day.iso} data-today={day.current || undefined}><small>{day.label}</small><b>{day.day}</b></span>)}</span>
              <span className="doctor-widget-summary">{agendaSummary}</span>
            </>}
          </Link>
        </li>;
      })}
    </ul>
  </section>;
}
