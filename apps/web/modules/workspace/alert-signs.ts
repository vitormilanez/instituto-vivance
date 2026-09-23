// Conteúdo da tela "Sinais de alerta". É texto clínico: só entra aqui o que o
// médico responsável aprovou, com data. Enquanto não houver aprovação, a tela
// mostra só o que vale para qualquer pessoa (ligar 192) e diz que a lista está
// em revisão — nunca uma lista inventada. Não há triagem por IA nesta tela.
export type AlertSignsContent = {
  signs: string[];
  approvedBy: string | null;
  approvedOn: string | null;
  clinicPhone: { display: string; tel: string; hours: string | null } | null;
};

export const alertSigns: AlertSignsContent = {
  signs: [],
  approvedBy: null,
  approvedOn: null,
  clinicPhone: null,
};

export function alertSignsReady(content: AlertSignsContent) {
  return content.signs.length > 0 && Boolean(content.approvedBy && content.approvedOn);
}
