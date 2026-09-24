// Mensagem curta para o paciente entrar na chamada. Só o link e o nome da
// clínica: nada clínico sai do Vivance por aqui.
export function teleconsultationInvite(url: string, patientName?: string | null) {
  const first = patientName?.trim().split(/\s+/)[0];
  return `${first ? `Olá, ${first}!` : "Olá!"} Este é o link da sua teleconsulta com o Instituto Vivance: ${url}\n\nAbra no horário combinado. Se pedir, permita câmera e microfone.`;
}

/** Abre o WhatsApp (app ou web) com a mensagem pronta; a pessoa escolhe o contato. */
export function whatsappShareUrl(url: string, patientName?: string | null) {
  return `https://wa.me/?text=${encodeURIComponent(teleconsultationInvite(url, patientName))}`;
}
