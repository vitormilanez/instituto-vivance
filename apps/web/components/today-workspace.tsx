import type { ReactNode } from "react";
import type { todayWorkspace } from "@/modules/workspace/today";
import { HomeDay } from "@/components/home-day";
import { DoctorToday } from "@/components/doctor-today";
import type { DoctorDashboardMetrics } from "@/modules/workspace/doctor-dashboard";

// Os cards de contexto vivem em context-card-list; a ficha do paciente importa
// daqui por compatibilidade.
export {
  ContextCardList,
  contextCardsFrom,
  PatientCareLinks,
} from "@/components/context-card-list";

// A Home do médico e da enfermagem: o dia como eixo (direção A). A composição
// fica em HomeDay; os atalhos vêm por último, depois do que exige leitura.
export function TodayWorkspace({
  base,
  data,
  shortcuts,
  doctorView = false,
  metrics,
}: {
  base: string;
  data: Awaited<ReturnType<typeof todayWorkspace>>;
  shortcuts?: ReactNode;
  doctorView?: boolean;
  metrics?: DoctorDashboardMetrics | null;
}) {
  if (doctorView) return <DoctorToday base={base} data={data} metrics={metrics} />;
  return (
    <HomeDay
      base={base}
      data={data}
      shortcuts={shortcuts}
      doctorView={doctorView}
    />
  );
}
