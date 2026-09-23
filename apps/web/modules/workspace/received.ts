import "server-only";
import { requireClinic } from "@/modules/identity/service";
import { InputError, tenantId } from "@/lib/validation";
import { DomainError } from "@/lib/errors";

export class ReceivedError extends DomainError {}
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
//
// Falha é por tipo: se uma query cai, as outras continuam valendo e o tipo que
// falhou volta em `failed`. A tela nomeia o que faltou e não mostra total
// parcial — nunca um zero que parece verdade.
export async function receivedForPatients(
  id: string,
  cutoffs: Map<string, string | null>,
): Promise<{
  byPatient: Map<string, ReceivedItem[]>;
  failed: ReceivedItemKind[];
}> {
  const tenant = tenantId(id);
  const patientIds = [...cutoffs.keys()];
  if (!patientIds.length) return { byPatient: new Map(), failed: [] };
  const { client, user } = await requireClinic(tenant, ["doctor", "nurse"]);
  const bound = earliestCutoff(cutoffs);
  const accounts = await client
    .from("patient_accounts")
    .select("patient_id,user_id")
    .eq("tenant_id", tenant)
    .in("patient_id", patientIds);
  // Sem a conta do paciente não há como separar o que ele enviou do que a
  // equipe registrou: os três tipos que dependem disso ficam indisponíveis.
  const accountsFailed = Boolean(accounts.error);
  const userByPatient = new Map(
    (accounts.data ?? []).map((row) => [row.patient_id, row.user_id]),
  );
  const patientUsers = [...new Set(userByPatient.values())];

  const since = <T extends { gte: (column: string, value: string) => T }>(
    query: T,
    column: string,
  ) => (bound ? query.gte(column, bound) : query);
  const skipped = Promise.resolve({ data: null, error: new Error("skipped") });

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
      accountsFailed
        ? skipped
        : since(
            client
              .from("patient_documents")
              .select("id,patient_id,at:available_at,uploaded_by")
              .eq("tenant_id", tenant)
              .eq("status", "available")
              // Foto de refeição é parte do relato, não exame: fica fora.
              .eq("attached_to", "documents")
              .in("patient_id", patientIds),
            "available_at",
          ),
      accountsFailed
        ? skipped
        : since(
            client
              .from("care_messages")
              .select("id,patient_id,at:sent_at,sender_id")
              .eq("tenant_id", tenant)
              .in("patient_id", patientIds)
              .in(
                "sender_id",
                patientUsers.length
                  ? patientUsers
                  : ["00000000-0000-0000-0000-000000000000"],
              ),
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
      accountsFailed
        ? skipped
        : since(
            client
              .from("patient_measurements")
              .select("id,patient_id,at:submitted_at,actor_user_id")
              .eq("tenant_id", tenant)
              .in("patient_id", patientIds),
            "submitted_at",
          ),
    ]);

  const base = `/clinicas/${tenant}`;
  const rows: ReceivedRow[] = [];
  const failed: ReceivedItemKind[] = [];
  const consider = (
    kind: ReceivedItemKind,
    result: { data: unknown; error: unknown },
    sentByPatient: (row: ClockRow) => boolean,
  ) => {
    if (result.error) {
      failed.push(kind);
      return;
    }
    for (const row of (result.data as ClockRow[] | null) ?? []) {
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
  consider("preparation", preparations, () => true);
  consider(
    "documents",
    documents,
    (row) => row.uploaded_by === userByPatient.get(row.patient_id),
  );
  consider(
    "messages",
    messages,
    (row) => row.sender_id === userByPatient.get(row.patient_id),
  );
  consider("checkins", checkIns, () => true);
  consider(
    "measurements",
    measurements,
    (row) => row.actor_user_id === userByPatient.get(row.patient_id),
  );
  // O que este profissional já abriu. Leitura é por pessoa: a RLS só devolve
  // as linhas do próprio usuário, e o filtro explícito diz a mesma coisa. Se a
  // leitura falhar, nenhum item vira "novo" nem "visto" — fica sem marcação.
  const reads = rows.length
    ? await client
        .from("patient_item_reads")
        .select("item_kind,item_id")
        .eq("tenant_id", tenant)
        .eq("user_id", user.id)
        .in("patient_id", patientIds)
    : { data: [], error: null };
  const seen = reads.error
    ? null
    : new Set(
        (reads.data ?? []).map((row) => `${row.item_kind}:${row.item_id}`),
      );
  for (const row of rows)
    row.seen = seen ? seen.has(`${row.kind}:${row.id}`) : null;
  return { byPatient: splitByPatient(rows, cutoffs), failed };
}

export const allReceivedKinds: ReceivedItemKind[] = [
  "preparation",
  "documents",
  "messages",
  "checkins",
  "measurements",
];

// Os vínculos do profissional logado — ativos e atribuídos à espera do aceite —
// com o nome do paciente. Serve à Home inteira: decide quem tem contexto, quem
// mostra o aceite e quem entra em "Entre consultas". RLS continua sendo a
// autoridade; o filtro por profissional é a intenção declarada.
const relationshipScan = 500;

export async function myCareLinks(id: string) {
  const tenant = tenantId(id);
  const { client, user } = await requireClinic(tenant, ["doctor", "nurse"]);
  const result = await client
    .from("care_relationships")
    .select(
      "id,patient_id,status,version,patients!care_relationships_tenant_id_patient_id_fkey(display_name)",
    )
    .eq("tenant_id", tenant)
    .eq("professional_id", user.id)
    .in("status", ["active", "assigned"])
    .order("patient_id")
    .limit(relationshipScan);
  if (result.error) throw new Error("Unable to load care relationships");
  return (result.data ?? []).map((row) => ({
    relationshipId: row.id,
    patientId: row.patient_id,
    status: row.status as "active" | "assigned",
    version: row.version,
    name: row.patients?.display_name ?? "Paciente",
  }));
}

const readableKinds = new Set<ReceivedItemKind>(allReceivedKinds);

// Marca um item como aberto pelo profissional logado. A função no banco lê o
// item sob a RLS da tabela de origem e exige vínculo ativo: um id inventado,
// de outra clínica ou de outro paciente falha fechado. Idempotente.
export async function markReceivedRead(id: string, input: unknown) {
  const tenant = tenantId(id);
  const body = (input ?? {}) as { kind?: unknown; item_id?: unknown };
  if (
    typeof body.kind !== "string" ||
    !readableKinds.has(body.kind as ReceivedItemKind) ||
    typeof body.item_id !== "string"
  )
    throw new InputError("Item inválido.");
  const item = tenantId(body.item_id);
  const { client } = await requireClinic(tenant, ["doctor", "nurse"]);
  const result = await client.rpc("mark_patient_item_read", {
    target_tenant: tenant,
    target_kind: body.kind,
    target_item: item,
  });
  if (result.error) throw new ReceivedError("Item indisponível.", 403);
  return { ok: true };
}
