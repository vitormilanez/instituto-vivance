import Link from "next/link";
import type { PatientSection } from "@/modules/workspace/navigation";
import { patientSections } from "@/modules/workspace/navigation";
import { EmptyConversation, EmptyModule, FutureButton } from "./module-ui";

const actions = [
  { label: "Orientações médicas", text: "Seu plano de cuidado", slug: "plano" },
  {
    label: "Mensagem para a equipe",
    text: "Seu espaço de conversa",
    slug: "conversas",
  },
  {
    label: "Tratamento",
    text: "Orientações sobre medicamentos",
    slug: "medicamentos",
  },
  {
    label: "Minha evolução",
    text: "Seu histórico ao longo do tempo",
    slug: "evolucao",
  },
  { label: "Meu diário", text: "Como você está se sentindo", slug: "diario" },
  {
    label: "Próximo retorno",
    text: "Consultas com a clínica",
    slug: "consultas",
  },
] as const;

export function PatientArea({
  section,
  base,
}: {
  section: PatientSection;
  base: string;
}) {
  if (section.slug === "hoje")
    return (
      <>
        <div className="patient-overview">
          <section className="panel">
            <h2>Seu próximo encontro</h2>
            <EmptyModule title="As consultas aparecerão aqui">
              O agendamento ainda não está conectado. Para marcar um horário,
              entre em contato com a clínica.
            </EmptyModule>
            <Link className="text-action" href={`${base}/consultas`}>
              Conhecer a área de consultas
            </Link>
          </section>
          <section className="panel">
            <h2>Seu plano de cuidado</h2>
            <EmptyModule title="Um lugar para suas orientações">
              Os planos revisados pela equipe serão disponibilizados nesta área
              após a integração.
            </EmptyModule>
            <Link className="text-action" href={`${base}/plano`}>
              Conhecer as orientações
            </Link>
          </section>
        </div>
        <section className="patient-shortcuts">
          <h2>O que você quer acompanhar?</h2>
          <div className="quick-actions">
            {actions.map((action) => (
              <Link
                className="quick-action"
                href={`${base}/${action.slug}`}
                key={action.slug}
              >
                <strong>{action.label}</strong>
                <span>{action.text}</span>
                <span className="action-state">Conhecer a área</span>
              </Link>
            ))}
          </div>
        </section>
      </>
    );
  if (section.slug === "conversas")
    return (
      <>
        <EmptyConversation />
        <p className="module-footnote">
          Este espaço ainda não recebe mensagens. Para falar com a equipe, use
          os canais habituais da clínica.
        </p>
      </>
    );
  if (section.slug === "evolucao")
    return (
      <div className="patient-overview">
        <section className="panel">
          <div className="section-heading">
            <h2>Minhas medidas</h2>
            <FutureButton>Atualizar medidas</FutureButton>
          </div>
          <EmptyModule title="Suas medidas, sem estimativas">
            Peso e outras medidas serão exibidos somente após o registro real. O
            envio ainda não está disponível.
          </EmptyModule>
        </section>
        <section className="panel">
          <h2>Histórico de evolução</h2>
          <EmptyModule title="Seu histórico será construído aqui">
            Não há gráficos ilustrativos ou resultados calculados nesta versão.
          </EmptyModule>
        </section>
      </div>
    );
  return (
    <>
      <nav className="module-tabs" aria-label="Áreas do meu cuidado">
        {patientSections
          .filter((item) => item.group === "cuidado")
          .map((item) => (
            <Link
              href={`${base}/${item.slug}`}
              key={item.slug}
              aria-current={item.slug === section.slug ? "page" : undefined}
            >
              {item.title}
            </Link>
          ))}
      </nav>
      {section.slug === "cuidado" ? (
        <section className="panel">
          <h2>Seu cuidado, organizado</h2>
          <ul className="care-directory">
            {patientSections
              .filter(
                (item) => item.group === "cuidado" && item.slug !== "cuidado",
              )
              .map((item) => (
                <li key={item.slug}>
                  <Link href={`${base}/${item.slug}`}>
                    <strong>{item.title}</strong>
                    <span>{item.description}</span>
                  </Link>
                  <span className="quiet-label">Em desenvolvimento</span>
                </li>
              ))}
          </ul>
        </section>
      ) : (
        <section className="panel">
          <div className="section-heading">
            <h2>{section.title}</h2>
            {section.slug === "diario" ? (
              <FutureButton>Registrar atualização</FutureButton>
            ) : section.slug === "documentos" ? (
              <FutureButton>Enviar documento</FutureButton>
            ) : null}
          </div>
          <EmptyModule
            title={
              section.slug === "plano"
                ? "Suas orientações aparecerão aqui"
                : section.slug === "medicamentos"
                  ? "Seu tratamento aparecerá aqui"
                  : section.slug === "diario"
                    ? "Seu diário será construído aqui"
                    : section.slug === "consultas"
                      ? "Suas consultas aparecerão aqui"
                      : "Seus arquivos aparecerão aqui"
            }
          >
            {section.slug === "medicamentos" || section.slug === "plano"
              ? "Esta área ainda não está conectada. Continue seguindo as orientações recebidas diretamente da equipe da clínica."
              : section.slug === "consultas"
                ? "O agendamento ainda não está disponível no aplicativo. Entre em contato com a clínica para marcar seu retorno."
                : "O envio e a consulta de registros serão liberados após a integração. Nenhum dado de exemplo é exibido aqui."}
          </EmptyModule>
        </section>
      )}
    </>
  );
}
