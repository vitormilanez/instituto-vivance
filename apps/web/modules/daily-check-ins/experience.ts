// Presentation only: the stored scales remain 1–5 and bowel_status keeps
// its three existing categories. Hunger is intensity, not a health score.
export const momentLabels = {
  energy: ["Sem energia", "Pouca energia", "Moderada", "Boa energia", "A todo vapor"],
  sleep: ["Muito mal", "Mal", "Mais ou menos", "Bem", "Muito bem"],
  hunger: ["Pouca", "Leve", "Moderada", "Forte", "Muita"],
} as const;

export type ScaleMoment = keyof typeof momentLabels;

export const coreCheckInTopics = ["energy", "sleep", "hunger", "bowel"] as const;
export const topicLabels: Record<string, string> = {
  energy: "Energia", sleep: "Sono", hunger: "Fome", bowel: "Banheiro",
  application: "Aplicação", note: "Recado",
};

export const momentQuestions = {
  energy: "Como está sua energia?",
  sleep: "Como você dormiu?",
  hunger: "Como está sua fome?",
  bowel: "Como está seu intestino hoje?",
} as const;
