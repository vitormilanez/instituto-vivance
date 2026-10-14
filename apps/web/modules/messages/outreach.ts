export const supportiveMessages = [
  {
    title: "Um passo de cada vez",
    content: "Cada pequeno passo merece ser reconhecido. Siga no seu ritmo e lembre-se: você não precisa fazer tudo de uma vez.",
  },
  {
    title: "Seu caminho é único",
    content: "Seu caminho é único. Valorize o que foi possível hoje, sem se comparar com outras pessoas. Estamos juntos nessa jornada.",
  },
  {
    title: "Há espaço para recomeçar",
    content: "Nem todos os dias são iguais, e tudo bem. Hoje pode ser uma nova oportunidade para seguir no seu ritmo, com gentileza consigo.",
  },
] as const;

export type OutreachPreview = {
  recipients: { id: string; displayName: string }[];
  doctorId: string;
  canSend: boolean;
  reason?: string;
};

export type OutreachResult = { patientId: string; status: "sent" | "failed"; error?: string; retryable?: boolean };
