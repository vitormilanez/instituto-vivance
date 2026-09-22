import "server-only";
import { requireClinic } from "@/modules/identity/service";
import { tenantId } from "@/lib/validation";
import {
  earliestCutoff,
  receivedCutoff,
  splitByPatient,
  type ReceivedItem,
  type ReceivedItemKind,
  type ReceivedRow,
} from "./received-items";

// Quantos atendimentos finalizados a varredura aceita para achar o corte de cada
// paciente do dia. Um dia tem poucos pacientes; o limite é rede de segurança.
const finalizedScan = 400;

type ClockRow = {
  id: string;
  patient_id: string;
  at: string | null;
  uploaded_by?: string | null;
  sender_id?: string | null;
  actor_user_id?: string | null;
};

function hrefFor(
  kind: ReceivedItemKind,
  base: string,
  patientId: string,
  id: string,
) {
  const record = `${base}/pacientes/${patientId}`;
  switch (kind) {
    case "preparation":
      return `${base}/preparo?solicitacao=${id}#preparo-${id}`;
    case "documents":
      return `${record}?aba=Documentos`;
    case "measurements":
      return `${record}?aba=Evolu%C3%A7%C3%A3o`;
    case "checkins":
      return `${base}/acompanhamento#check-in-${id}`;
    case "messages":
      return `${base}/mensagens?paciente=${patientId}`;
  }
}

// Corte por paciente: última consulta finalizada; sem nenhuma, o início do
// vínculo de cuidado ativo. Só pacientes com vínculo ativo do profissional
// logado entram no mapa — é o filtro explícito de vínculo, além da RLS.
export async function receivedCutoffs(id: string, patientIds: string[]) {
  const tenant = tenantId(id);
  if (!patientIds.length) return new Map<string, string | null>();
  const { client, user } = await requireClinic(tenant, ["doctor", "nurse"]);
  const [relationships, encounters] = await Promise.all([
    client
      .from("care_relationships")
      .select("patient_id,created_at")
      .eq("tenant_id", tenant)
      .eq("professional_id", user.id)
      .eq("status", "active")
      .in("patient_id", patientIds),
    client
      .from("encounters")
      .select("patient_id,finalized_at")
      .eq("tenant_id", tenant)
      .eq("status", "finalized")
      .in("patient_id", patientIds)
      .order("finalized_at", { ascending: false })
      .limit(finalizedScan),
  ]);
  if (relationships.error || encounters.error)
    throw new Error("Unable to load received cutoffs");
  const latest = new Map<string, string>();
  for (const row of encounters.data ?? []) {
    if (row.finalized_at && !latest.has(row.patient_id))
      latest.set(row.patient_id, row.finalized_at);
  }
  const cutoffs = new Map<string, string | null>();
  for (const relationship of relationships.data ?? [])
    cutoffs.set(
      relationship.patient_id,
      receivedCutoff({
        finalizedAt: latest.get(relationship.patient_id) ?? null,
        relationshipCreatedAt: relationship.created_at,
      }),
    );
  return cutoffs;
}

// Uma query por tipo para o dia inteiro, com o menor corte entre os pacientes;
// o corte de cada um é aplicado depois, no módulo puro. Nunca N+1.
export async function receivedForPatients(
  id: string,
  cutoffs: Map<string, string | null>,
) {
  const tenant = tenantId(id);
  const patientIds = [...cutoffs.keys()];
  const empty = new Map<string, ReceivedItem[]>();
  if (!patientIds.length) return empty;
  const { client } = await requireClinic(tenant, ["doctor", "nurse"]);
  const bound = earliestCutoff(cutoffs);
  const accounts = await client
    .from("patient_accounts")
    .select("patient_id,user_id")
    .eq("tenant_id", tenant)
    .in("patient_id", patientIds);
  if (accounts.error) throw new Error("Unable to load received items");
  const userByPatient = new Map(
    (accounts.data ?? []).map((row) => [row.patient_id, row.user_id]),
  );
  const patientUsers = [...new Set(userByPatient.values())];

  const since = <T extends { gte: (column: string, value: string) => T }>(
    query: T,
    column: string,
  ) => (bound ? query.gte(column, bound) : query);

  const [preparations, documents, messages, checkIns, measurements] =
    await Promise.all([
      since(
        client
          .from("return_preparation_requests")
          .select("id,patient_id,at:submitted_at")
          .eq("tenant_id", tenant)
          .in("status", ["submitted", "reviewed"])
          .in("patient_id", patientIds),
        "submitted_at",
      ),
      since(
        client
          .from("patient_documents")
          .select("id,patient_id,at:available_at,uploaded_by")
          .eq("tenant_id", tenant)
          .eq("status", "available")
          .in("patient_id", patientIds),
        "available_at",
      ),
      since(
        client
          .from("care_messages")
          .select("id,patient_id,at:sent_at,sender_id")
          .eq("tenant_id", tenant)
          .in("patient_id", patientIds)
          .in("sender_id", patientUsers.length ? patientUsers : ["00000000-0000-0000-0000-000000000000"]),
        "sent_at",
      ),
      since(
        client
          .from("care_check_ins")
          .select("id,patient_id,at:submitted_at")
          .eq("tenant_id", tenant)
          .in("status", ["submitted", "reviewed"])
          .in("patient_id", patientIds),
        "submitted_at",
      ),
      since(
        client
          .from("patient_measurements")
          .select("id,patient_id,at:submitted_at,actor_user_id")
          .eq("tenant_id", tenant)
          .in("patient_id", patientIds),
        "submitted_at",
      ),
    ]);
  if (
    preparations.error ||
    documents.error ||
    messages.error ||
    checkIns.error ||
    measurements.error
  )
    throw new Error("Unable to load received items");

  const base = `/clinicas/${tenant}`;
  const rows: ReceivedRow[] = [];
  const consider = (
    kind: ReceivedItemKind,
    data: ClockRow[] | null,
    sentByPatient: (row: ClockRow) => boolean,
  ) => {
    for (const row of data ?? []) {
      if (!row.at) continue;
      // Registro feito pela equipe não é "recebido do paciente".
      if (!sentByPatient(row)) continue;
      rows.push({
        kind,
        id: row.id,
        patientId: row.patient_id,
        at: row.at,
        // Hoje o autor é sempre o paciente; a tela não exibe o campo.
        author: null,
        href: hrefFor(kind, base, row.patient_id, row.id),
      });
    }
  };
  // Pré-consulta enviada e check-in respondido são do paciente por construção:
  // o status já garante isso. Documento, mensagem e medida podem ser da equipe,
  // então cada um compara o autor com o usuário daquele paciente.
  consider("preparation", preparations.data as ClockRow[] | null, () => true);
  consider(
    "documents",
    documents.data as ClockRow[] | null,
    (row) => row.uploaded_by === userByPatient.get(row.patient_id),
  );
  consider(
    "messages",
    messages.data as ClockRow[] | null,
    (row) => row.sender_id === userByPatient.get(row.patient_id),
  );
  consider("checkins", checkIns.data as ClockRow[] | null, () => true);
  consider(
    "measurements",
    measurements.data as ClockRow[] | null,
    (row) => row.actor_user_id === userByPatient.get(row.patient_id),
  );
  return splitByPatient(rows, cutoffs);
}
