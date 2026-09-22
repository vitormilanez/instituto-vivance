import Link from "next/link";
import type { PatientSection } from "@/modules/workspace/navigation";
import { patientSections } from "@/modules/workspace/navigation";
import { EmptyModule, FutureButton } from "./module-ui";

// As outras áreas do cuidado. A Home ("hoje") é desenhada em patient-home.tsx.
export function PatientArea({
  section,
  base,
}: {
  section: PatientSection;
  base: string;
}) {
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
      <p className="patient-care-tabs-hint">
        Deslize para ver todas as áreas do seu cuidado.
      </p>
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
                  <span className="quiet-label">
                    {["plano", "consultas", "diario", "evolucao", "documentos", "relatorios"].includes(
                      item.slug,
                    )
                      ? "Disponível"
                      : "Em desenvolvimento"}
                  </span>
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
                      : section.slug === "relatorios"
                        ? "Seus relatórios aparecerão aqui"
                      : "Seus arquivos aparecerão aqui"
            }
          >
            {section.slug === "medicamentos" || section.slug === "plano"
              ? "Esta área ainda não está conectada. Continue seguindo as orientações recebidas diretamente da equipe da clínica."
              : section.slug === "consultas"
                ? "Entre em contato com a clínica para marcar ou alterar seu retorno."
                : "O envio e a consulta de registros serão liberados após a integração. Nenhum dado de exemplo é exibido aqui."}
          </EmptyModule>
        </section>
      )}
    </>
  );
}
