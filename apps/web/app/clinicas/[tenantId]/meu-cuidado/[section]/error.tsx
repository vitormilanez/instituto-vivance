"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { startTransition } from "react";
import { Icon } from "@/components/patient/icons";
import "@/app/patient.css";

// Quando uma tela do paciente não carrega: diz o que houve em linguagem simples,
// garante que nada se perdeu e oferece tentar de novo.
export default function PatientError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  const params = useParams<{ tenantId: string }>();
  const retry = () =>
    startTransition(() => {
      router.refresh();
      reset();
    });
  return (
    <div className="pv">
      <main id="conteudo" className="pv-main">
        <div className="pv-fallback" role="alert">
          <span className="pv-fallback-icon"><Icon name="refresh" /></span>
          <h1 className="pv-h2">Não conseguimos carregar agora</h1>
          <p className="pv-lead">Seus registros estão seguros. Confira a internet e tente de novo em instantes.</p>
          <button type="button" className="pv-button" onClick={retry}>
            Tentar de novo
            <Icon name="refresh" />
          </button>
          {params?.tenantId && (
            <Link className="pv-link" href={`/clinicas/${params.tenantId}/meu-cuidado/hoje`}>Voltar para o início</Link>
          )}
        </div>
      </main>
    </div>
  );
}
