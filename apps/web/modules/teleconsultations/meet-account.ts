// Conta Google em que as salas do Meet são criadas nesta fase (decisão do
// Vitor, 23/09/2026). Trocar aqui quando cada médico usar a própria conta.
export const MEET_ACCOUNT = "vtrconsultingbr@gmail.com";

/** Abre uma sala nova já na conta da empresa, mesmo com várias contas logadas. */
export const meetNewRoomUrl = `https://meet.google.com/new?authuser=${encodeURIComponent(MEET_ACCOUNT)}`;
