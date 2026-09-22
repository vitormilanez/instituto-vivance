// Seleção de exames do cadastro: quais arquivos o paciente escolheu, o que cada
// um já é e como o conjunto se descreve. Puro — sem React, sem rede, sem banco —
// para que a mesma frase apareça na tela e no teste. Os nomes que aparecem aqui
// são sempre o nome original escolhido pelo paciente, nunca id, caminho de
// storage ou qualquer identificador técnico.
import { maxDocumentBytes } from "../documents/validation.ts";

// Mesmo limite do contrato de onboarding: exam_document_ids aceita até 50.
export const maxExamFiles = 50;

export const examAcceptedTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export const maxExamBytes = maxDocumentBytes;

export function examByteLimit(): string {
  return `${maxExamBytes / (1024 * 1024)} MB`;
}

export type ExamFileState = "ready" | "sending" | "sent" | "failed";

export type ExamSelectionItem = {
  // Identidade local do arquivo escolhido. Nunca é um id do banco.
  key: string;
  file: File;
  state: ExamFileState;
  // Motivo factual da falha, no vocabulário do estágio que falhou.
  error: string | null;
  // Id do documento que o servidor já recebeu. Existe para reenviar só a
  // associação ao cadastro, sem subir os mesmos bytes duas vezes.
  documentId: string | null;
};

export type ExamRejection = {
  name: string;
  reason: string;
};

export type ExamSelectionState = {
  items: ExamSelectionItem[];
  // Arquivos recusados na escolha, cada um com o próprio motivo.
  rejected: ExamRejection[];
  // Muda a cada arquivo adicionado ou removido. O consentimento é sobre a lista
  // efetivamente selecionada, então ele vale enquanto esta versão não mudar.
  version: number;
  consentedVersion: number | null;
  // Exames já confirmados: o rascunho salvo mais os envios desta sessão.
  sent: string[];
};

export type ExamSelectionAction =
  | { type: "add"; files: File[]; limit?: number }
  | { type: "remove"; key: string }
  | { type: "retry"; key: string }
  | { type: "consent"; consented: boolean }
  | { type: "sending"; key: string }
  | { type: "uploaded"; key: string; documentId: string }
  | { type: "sent"; key: string }
  | { type: "failed"; key: string; error: string }
  | { type: "dismissRejections" };

export function initialExamSelection(sentIds: string[] = []): ExamSelectionState {
  return {
    items: [],
    rejected: [],
    version: 0,
    consentedVersion: null,
    sent: [...new Set(sentIds)],
  };
}

// Um arquivo só entra na lista se puder ser enviado, e o motivo vale para ele
// sozinho: um arquivo recusado nunca derruba os outros.
export function examFileProblem(file: File): string | null {
  if (!(examAcceptedTypes as readonly string[]).includes(file.type))
    return "Formato não aceito. Envie PDF, JPG ou PNG.";
  if (!file.size) return "O arquivo está vazio.";
  if (file.size > maxExamBytes)
    return `Cada arquivo deve ter até ${examByteLimit()}.`;
  return null;
}

export function examFileKind(type: string): string {
  if (type === "application/pdf") return "PDF";
  if (type === "image/jpeg") return "JPG";
  if (type === "image/png") return "PNG";
  return "Arquivo";
}

export function examFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  const megabytes = (bytes / (1024 * 1024)).toFixed(1).replace(".", ",");
  return `${megabytes} MB`;
}

// Nome original, tipo e tamanho: o que o paciente precisa para conferir a
// própria escolha antes de enviar.
export function examFileLabel(item: ExamSelectionItem): string {
  return `${examFileKind(item.file.type)} · ${examFileSize(item.file.size)}`;
}

// O que está acontecendo com este arquivo, dito no card dele.
export function examStateLabel(state: ExamFileState): string {
  if (state === "sending") return "Enviando…";
  if (state === "sent") return "Enviado";
  if (state === "failed") return "Falhou";
  return "Aguardando envio";
}

export function examSentPhrase(count: number): string {
  if (!count) return "Nenhum exame enviado";
  return `${count} exame${count > 1 ? "s" : ""} enviado${count > 1 ? "s" : ""}`;
}

// O estado do conjunto em uma linha curta e factual. Reenvio pendente primeiro,
// porque é o único caso que ainda exige uma ação do paciente.
export function examSelectionPhrase(state: ExamSelectionState): string {
  const failed = state.items.filter((item) => item.state === "failed").length;
  if (failed)
    return `${failed} arquivo${failed > 1 ? "s" : ""} precisa${failed > 1 ? "m" : ""} ser reenviado${failed > 1 ? "s" : ""}`;
  const selected = state.items.filter(
    (item) => item.state === "ready" || item.state === "sending",
  ).length;
  if (selected)
    return `${selected} exame${selected > 1 ? "s" : ""} selecionado${selected > 1 ? "s" : ""}`;
  return examSentPhrase(state.sent.length);
}

export function examSelectionConsented(state: ExamSelectionState): boolean {
  return state.consentedVersion !== null && state.consentedVersion === state.version;
}

// Quanto ainda cabe nesta etapa. O limite do contrato vale sobre o total de
// exames associados ao rascunho — os já enviados mais os ainda não enviados —
// então enviar um arquivo não devolve espaço para outro no lugar dele.
export function examSelectionLimit(state: ExamSelectionState): number {
  const unsent = state.items.filter((item) => item.state !== "sent").length;
  return Math.max(0, maxExamFiles - state.sent.length - unsent);
}

export function examSelectionReady(state: ExamSelectionState): ExamSelectionItem[] {
  return state.items.filter((item) => item.state === "ready");
}

function fileKey(file: File, taken: Set<string>): string {
  const base = `${file.name}|${file.size}|${file.lastModified}`;
  let key = base;
  let occurrence = 2;
  while (taken.has(key)) key = `${base}|${occurrence++}`;
  return key;
}

export function examSelectionReducer(
  state: ExamSelectionState,
  action: ExamSelectionAction,
): ExamSelectionState {
  switch (action.type) {
    case "add": {
      // `room` é quantos arquivos ainda cabem, não o tamanho máximo da lista.
      const room = action.limit ?? examSelectionLimit(state);
      const taken = new Set(state.items.map((item) => item.key));
      const items = [...state.items];
      const rejected = [...state.rejected];
      let added = 0;
      for (const file of action.files) {
        if (added >= room) {
          rejected.push({
            name: file.name,
            reason: `Limite de ${maxExamFiles} exames nesta etapa.`,
          });
          continue;
        }
        const problem = examFileProblem(file);
        if (problem) {
          rejected.push({ name: file.name, reason: problem });
          continue;
        }
        const key = fileKey(file, taken);
        taken.add(key);
        items.push({ key, file, state: "ready", error: null, documentId: null });
        added += 1;
      }
      // A versão só muda quando a lista muda de fato: recusa não é seleção.
      const version =
        items.length === state.items.length ? state.version : state.version + 1;
      return { ...state, items, rejected, version };
    }
    case "remove": {
      const target = state.items.find((item) => item.key === action.key);
      // Arquivo já enviado ou em voo não sai da lista: o que está no rascunho
      // não é apagado por um clique local.
      if (!target || target.state === "sent" || target.state === "sending")
        return state;
      return {
        ...state,
        items: state.items.filter((item) => item.key !== action.key),
        version: state.version + 1,
      };
    }
    case "retry":
      return {
        ...state,
        items: state.items.map((item) =>
          item.key === action.key && item.state === "failed"
            ? { ...item, state: "ready", error: null }
            : item,
        ),
      };
    case "consent":
      return { ...state, consentedVersion: action.consented ? state.version : null };
    case "sending":
      return {
        ...state,
        items: state.items.map((item) =>
          item.key === action.key ? { ...item, state: "sending", error: null } : item,
        ),
      };
    case "uploaded":
      return {
        ...state,
        items: state.items.map((item) =>
          item.key === action.key
            ? { ...item, documentId: action.documentId, error: null }
            : item,
        ),
      };
    case "sent": {
      const target = state.items.find((item) => item.key === action.key);
      const documentId = target?.documentId ?? null;
      return {
        ...state,
        items: state.items.map((item) =>
          item.key === action.key
            ? { ...item, state: "sent", error: null }
            : item,
        ),
        sent:
          documentId && !state.sent.includes(documentId)
            ? [...state.sent, documentId]
            : state.sent,
      };
    }
    case "failed":
      return {
        ...state,
        items: state.items.map((item) =>
          item.key === action.key
            ? { ...item, state: "failed", error: action.error }
            : item,
        ),
      };
    case "dismissRejections":
      return { ...state, rejected: [] };
  }
}
