// Etapas do editor de atendimento e o nome de cada uma na URL. Módulo comum
// (sem "use client") para a página do servidor ler ?etapa= sem importar
// código de cliente.
export type EncounterStage = "preparation" | "consultation" | "plan" | "closing";

// A etapa vai para a URL (?etapa=consulta) para que recarregar a página, ou
// voltar a ela, não devolva o médico ao passo 1 no meio de um registro.
export const stageSlugs: Record<EncounterStage, string> = {
  preparation: "preparo",
  consultation: "consulta",
  plan: "plano",
  closing: "fechamento",
};
export function stageFromSlug(slug: string | undefined): EncounterStage {
  const found = (Object.keys(stageSlugs) as EncounterStage[]).find(
    (stage) => stageSlugs[stage] === slug,
  );
  return found ?? "preparation";
}
