export type PreparationQuestion = { id: string; label: string };

// IDs describe source questions, not clinical conclusions or chart columns.
export const preparationQuestions: PreparationQuestion[] = [
  { id: "goal", label: "Qual é o principal assunto que você quer conversar nesta consulta? O que gostaria de conseguir com esse encontro?" },
  { id: "changes", label: "Desde a última consulta — ou nas últimas semanas, se esta for a primeira — o que mudou na sua saúde ou no seu bem-estar?" },
  { id: "routine", label: "Como estão seu sono, alimentação, atividade física e disposição? Qual desses pontos mais precisa de atenção para você?" },
  { id: "treatment", label: "Quais medicamentos, suplementos ou orientações você está seguindo? Teve alguma dificuldade ou percebeu algo que gostaria de relatar?" },
  { id: "questions", label: "Quais dúvidas ou preocupações você não quer deixar de conversar com o médico? Qual delas deve vir primeiro?" },
];

export const preparationTopics = [
  { id: "sleep", label: "Sono" },
  { id: "nutrition", label: "Alimentação" },
  { id: "movement", label: "Atividade física" },
  { id: "energy", label: "Disposição" },
  { id: "treatment", label: "Tratamento e orientações" },
  { id: "concerns", label: "Dúvidas e preocupações" },
  { id: "other", label: "Outro assunto" },
] as const;

export function priorityLabel(id: string) {
  return preparationTopics.find((topic) => topic.id === id)?.label ?? "Assunto não identificado";
}

export function preparationActionPending(status: string) {
  return status === "requested" || status === "draft";
}
