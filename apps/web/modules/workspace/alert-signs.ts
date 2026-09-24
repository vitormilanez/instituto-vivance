// Conteúdo da tela "Sinais de alerta". É texto clínico: só entra aqui o que o
// médico responsável aprovou, com data. Enquanto não houver aprovação, a tela
// mostra só o que vale para qualquer pessoa (ligar 192) e diz que a lista está
// em revisão — nunca uma lista inventada. Não há triagem por IA nesta tela.
export type ClinicPhone = { display: string; tel: string; hours: string | null };

export type AlertSignsContent = {
  signs: string[];
  approvedBy: string | null;
  approvedOn: string | null;
  clinicPhone: ClinicPhone | null;
};

// Sem nada cadastrado pela clínica.
export const alertSigns: AlertSignsContent = {
  signs: [],
  approvedBy: null,
  approvedOn: null,
  clinicPhone: null,
};

export function alertSignsReady(content: AlertSignsContent) {
  return content.signs.length > 0 && Boolean(content.approvedBy && content.approvedOn);
}

export type ClinicPatientInfoRow = {
  phone_display: string | null;
  phone_tel: string | null;
  phone_hours: string | null;
  alert_signs: string[] | null;
  alert_approved_name: string | null;
  alert_approved_on: string | null;
};

const brDate = (day: string) => {
  const [year, month, date] = day.slice(0, 10).split("-");
  return `${date}/${month}/${year}`;
};

// O que a clínica cadastrou, no formato da tela. Uma lista sem aprovação
// completa (nome e data) nunca aparece.
export function alertSignsFromInfo(row: ClinicPatientInfoRow | null): AlertSignsContent {
  if (!row) return alertSigns;
  const approved = Boolean(row.alert_signs?.length && row.alert_approved_name && row.alert_approved_on);
  return {
    signs: approved ? [...(row.alert_signs ?? [])] : [],
    approvedBy: approved ? row.alert_approved_name : null,
    approvedOn: approved && row.alert_approved_on ? brDate(row.alert_approved_on) : null,
    clinicPhone:
      row.phone_display && row.phone_tel
        ? { display: row.phone_display, tel: row.phone_tel, hours: row.phone_hours }
        : null,
  };
}
