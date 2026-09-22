import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import {
  mealTypeLabels,
  patientMealMaxBodyBytes,
} from "../modules/meals/validation.ts";

const component = readFileSync(
  new URL("../components/patient-meal-logs.tsx", import.meta.url),
  "utf8",
);
const staffComponent = readFileSync(
  new URL("../components/staff-meal-logs.tsx", import.meta.url),
  "utf8",
);
const service = readFileSync(
  new URL("../modules/meals/service.ts", import.meta.url),
  "utf8",
);
const route = readFileSync(
  new URL("../app/api/v1/clinics/[tenantId]/meals/route.ts", import.meta.url),
  "utf8",
);
const patientPage = readFileSync(
  new URL(
    "../app/clinicas/[tenantId]/meu-cuidado/[section]/page.tsx",
    import.meta.url,
  ),
  "utf8",
);
const staffPage = readFileSync(
  new URL("../app/clinicas/[tenantId]/[module]/page.tsx", import.meta.url),
  "utf8",
);
const area = readFileSync(
  new URL("../components/patient-area.tsx", import.meta.url),
  "utf8",
);
const css = readFileSync(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);
const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260921191924_patient_meal_logs.sql",
    import.meta.url,
  ),
  "utf8",
);
const photoMigration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260922114500_patient_meal_photo.sql",
    import.meta.url,
  ),
  "utf8",
);
const documentsService = readFileSync(
  new URL("../modules/documents/service.ts", import.meta.url),
  "utf8",
);

test("o diário alimentar entra na jornada existente sem criar uma nona ação rápida", () => {
  assert.match(area, /Meu diário/);
  assert.match(area, /Registre refeições e como você está/);
  // A jornada do paciente continua com as mesmas oito portas de entrada.
  assert.equal(area.match(/available: (?:true|false)/g)?.length, 8);
  // O diário é montado dentro de "Meu diário", a seção que já existia.
  assert.match(patientPage, /slug === "diario" \? await patientMeals\(tenantId\)/);
  assert.match(patientPage, /<PatientMealLogs initial=\{meals\} \/>/);
  assert.match(patientPage, /checkIns && meals/);
  // A equipe lê os relatos dentro do Acompanhamento, sem aba nova.
  assert.match(staffPage, /<StaffMealLogs initial=\{await staffMeals\(tenantId\)\} \/>/);
  assert.match(staffComponent, /Refeições registradas/);
});

test("a interface orienta o primeiro registro, bloqueia reenvio duplicado e permite nova tentativa", () => {
  assert.match(component, /Seu primeiro registro começa aqui/);
  assert.match(component, /if \(busy\.current\) return;/);
  assert.match(component, /disabled=\{pending !== ""\}/);
  assert.match(component, /role="alert"/);
  assert.match(component, /Enviando foto…|Registrar refeição/);
  // A mesma request_key só é reaproveitada quando o conteúdo não mudou, então
  // repetir o envio não cria uma segunda refeição.
  assert.match(component, /request\.current\.fingerprint !== fingerprint/);
  assert.match(component, /crypto\.randomUUID\(\)/);
  assert.match(component, /AbortSignal\.timeout/);
  // O relato é apresentado como relato: sem calorias, nota ou orientação.
  assert.match(component, /Não calcula calorias, não avalia sua alimentação/);
  assert.equal(Object.keys(mealTypeLabels).length, 5);
});

test("o histórico do paciente mostra os 20 relatos mais recentes, na ordem original", () => {
  assert.match(service, /\.order\("eaten_at", \{ ascending: false \}\)\.order\("id", \{ ascending: false \}\)\.limit\(20\)/);
  assert.match(component, /Seus últimos 20 relatos, preservados como foram enviados\./);
  assert.match(component, /clinicalTime\(meal\.eaten_at\)/);
  assert.match(component, /\{meal\.description\}/);
  assert.doesNotMatch(component, /kcal|\bIMC\b|classificação|recomendação automática/i);
  assert.match(staffComponent, /não são avaliação nutricional automática/);
});

test("o formulário permanece legível em 320px e 390px sem rolagem horizontal", () => {
  assert.match(css, /\.meal-log-fields \{ display: grid; grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 760px\) \{\s*\.meal-log-fields \{ grid-template-columns: 1fr; \}/);
  assert.match(css, /\.meal-log-item p \{ margin: 0; max-width: 70ch; white-space: pre-wrap; overflow-wrap: anywhere; \}/);
  // O selo de status do check-in vive na mesma tela e precisa empilhar no
  // celular: sem isso ele escapava do card e era recortado em 320px.
  assert.match(css, /\.patient-check-in > \.section-heading \{\s*flex-direction: column-reverse;/);
});

test("a rota HTTP exige mesma origem, JSON e comporta 2.000 caracteres", () => {
  assert.match(route, /sameOrigin\(request\)/);
  assert.match(route, /application\/json/);
  assert.match(route, /boundedJson\(request, patientMealMaxBodyBytes\)/);
  // Uma descrição de 2.000 caracteres pode ocupar 8 KB em UTF-8; o limite de
  // transporte precisa caber o relato antes da validação de caracteres.
  assert.ok(patientMealMaxBodyBytes > 2000 * 4, "limite de corpo menor que 2.000 caracteres UTF-8");
});

test("a migration mantém o diário append-only, idempotente, literal e restrito ao vínculo ativo", () => {
  assert.match(migration, /create table public\.patient_meal_logs/);
  // O limite conta caracteres; só o relato composto apenas por espaços falha.
  assert.match(migration, /char_length\(description\) between 1 and 2000 and description !~ '\^\[\[:space:\]\]\*\$'/);
  assert.match(migration, /note_text is null or char_length\(note_text\) not between 1 and 2000/);
  assert.match(migration, /unique \(tenant_id, actor_user_id, client_request_id\)/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all on public\.patient_meal_logs from public, anon, authenticated/);
  assert.match(migration, /patient_meal_logs_patient_read/);
  assert.match(migration, /patient_meal_logs_care_read/);
  assert.match(migration, /private\.has_care_access\(tenant_id, patient_id\)/);
  assert.match(migration, /happened_at > clock_timestamp\(\) \+ interval '15 minutes'/);
  // O texto é gravado como enviado: nada de btrim trim() no valor persistido.
  assert.doesNotMatch(migration, /btrim\(note_text\)/);
  assert.match(migration, /type_text, happened_at, note_text, request_key/);
  // Nenhum privilégio de escrita direta: só a função idempotente grava.
  assert.doesNotMatch(migration, /grant (insert|update|delete) on public\.patient_meal_logs/);
});

test("a correção do relato literal alcança bancos onde a migration antiga já rodou", () => {
  const folder = new URL("../../../supabase/migrations/", import.meta.url);
  const name = "20260922015500_patient_meal_literal_description.sql";
  const files = readdirSync(folder).filter((file) => file.endsWith(".sql")).sort();
  assert.ok(
    files.indexOf(name) > files.indexOf("20260921191924_patient_meal_logs.sql"),
    "a correção precisa vir depois da migration original",
  );
  const followUp = readFileSync(new URL(name, folder), "utf8");
  // Recria o CHECK pelo nome e substitui a função; nada de btrim no caminho.
  assert.match(followUp, /drop constraint if exists patient_meal_logs_description_check/);
  assert.match(followUp, /add constraint patient_meal_logs_description_check check \(\s*char_length\(description\) between 1 and 2000/);
  assert.match(followUp, /create or replace function private\.record_patient_meal/);
  assert.match(followUp, /type_text, happened_at, note_text, request_key/);
  assert.match(followUp, /grant execute on function private\.record_patient_meal\(uuid,uuid,text,timestamptz,text\)\s*to authenticated/);
  assert.doesNotMatch(followUp, /btrim/);
  // Não reescreve relatos já gravados.
  assert.doesNotMatch(followUp, /(update|delete from) public\.patient_meal_logs/);
});

test("a foto opcional é uma só fonte: prévia, troca, remoção e recuperação de falha", () => {
  // Só JPG e PNG, com prévia local antes de qualquer envio.
  assert.match(component, /accept="image\/jpeg,image\/png"/);
  assert.match(component, /acceptedPhotoTypes = \["image\/jpeg", "image\/png"\]/);
  assert.match(component, /URL\.createObjectURL\(chosen\)/);
  assert.match(component, /URL\.revokeObjectURL\(preview\)/);
  assert.match(component, /<img src=\{preview\} alt="Prévia da foto escolhida" \/>/);
  assert.match(component, />\s*Trocar foto\s*</);
  assert.match(component, />\s*Remover foto\s*</);
  // Progresso por etapa e erro específico da foto.
  assert.match(component, /Enviando a foto…/);
  assert.match(component, /Registrando a refeição…/);
  assert.match(component, /id="meal-log-photo-error" role="alert"/);
  assert.match(component, /aria-describedby=\{`meal-log-photo-hint/);
  // Falha na foto preserva texto e oferece as duas saídas.
  assert.match(component, /A foto não foi enviada\. Seu texto continua aqui\./);
  assert.match(component, />\s*Tentar foto novamente\s*</);
  assert.match(component, />\s*Salvar sem foto\s*</);
  // A foto é enviada antes e o resultado é reaproveitado numa nova tentativa.
  assert.match(component, /const sent = await uploadDocument\(\{/);
  assert.match(component, /uploaded\.current\?\.fingerprint === photoFingerprint/);
  assert.match(component, /setPending\("photo"\)[\s\S]*setPending\("meal"\)/);
  // A foto viaja no mesmo registro, e o formulário só limpa após sucesso.
  assert.match(component, /photo_document_id: documentId/);
  assert.match(component, /setSuccess\("Refeição registrada no seu diário\."\)/);
  assert.match(component, /formElement\.reset\(\)/);
  // Sem foto, a API mantém os cinco argumentos de sempre.
  assert.match(service, /\.\.\.\(value\.photoDocument \? \{ photo_document: value\.photoDocument \} : \{\}\)/);
  // Acabamento: o botão nomeia a recuperação e a foto já enviada é explicada.
  assert.match(component, /aria-busy=\{pending !== ""\}/);
  assert.match(component, /\? "Tentar novamente"/);
  assert.match(component, /A foto já foi enviada\. Tentar de novo não envia outra\./);
  // A imagem reserva espaço antes de carregar: sem salto de layout.
  assert.match(css, /\.meal-log-photo img \{[^}]*aspect-ratio: 4 \/ 3;[^}]*object-fit: contain;/);
  // Nada de análise da imagem.
  assert.doesNotMatch(component, /kcal|\bIMC\b|classificação|nutri/i);
});

test("paciente e equipe veem a mesma foto pela rota protegida de download", () => {
  const download = /\/api\/v1\/clinics\/\$\{[^}]+\}\/documents\/\$\{[^}]+\}\/download/;
  assert.match(component, download);
  assert.match(staffComponent, download);
  // A equipe recebe imagem e texto como o mesmo relato, com autoria e horário.
  assert.match(staffComponent, /meal\.photo_document_id/);
  assert.match(staffComponent, /<figcaption className="quiet-label">Foto enviada por/);
  assert.match(staffComponent, /clinicalTime\(meal\.eaten_at\)/);
  assert.match(staffComponent, /alt=\{`Foto da refeição enviada por/);
  // Sem URL pública de storage nem signed URL persistida.
  assert.doesNotMatch(component, /storage\/v1|createSignedUrl|supabase\.co/);
  assert.doesNotMatch(staffComponent, /storage\/v1|createSignedUrl|supabase\.co/);
  // A biblioteca de documentos não mistura a foto da refeição.
  assert.equal(documentsService.match(/\.eq\("attached_to", "documents"\)/g)?.length, 2);
});

test("a migration da foto vincula, valida e mantém a idempotência estrita", () => {
  assert.match(photoMigration, /add column photo_document_id uuid/);
  assert.match(photoMigration, /foreign key \(tenant_id, photo_document_id\)\s*references public\.patient_documents\(tenant_id, id\)/);
  assert.match(photoMigration, /unique \(tenant_id, photo_document_id\)/);
  assert.match(photoMigration, /add column attached_to text not null default 'documents'/);
  // Só documento disponível, de imagem, do próprio paciente e do mesmo tenant.
  assert.match(photoMigration, /document\.patient_id = target_patient/);
  assert.match(photoMigration, /document\.uploaded_by = auth\.uid\(\)/);
  assert.match(photoMigration, /document\.status = 'available'/);
  assert.match(photoMigration, /document\.content_type in \('image\/jpeg','image\/png'\)/);
  // Mesma chave com outro conteúdo ou foto é recusada, não silenciada.
  assert.match(photoMigration, /detail = 'meal_request_key_reused'/);
  assert.match(photoMigration, /stored\.photo_document_id is not distinct from photo_document/);
  // A assinatura antiga sai de cena: uma função por chamada, sem sobrecarga.
  assert.match(photoMigration, /drop function if exists public\.record_patient_meal\(uuid, uuid, text, timestamptz, text\)/);
  assert.match(photoMigration, /drop function if exists private\.record_patient_meal\(uuid, uuid, text, timestamptz, text\)/);
  // A migration não abre privilégio nenhum e não analisa a imagem.
  assert.doesNotMatch(photoMigration, /grant (insert|update|delete) on public\.patient_meal_logs/);
  assert.doesNotMatch(photoMigration, /grant (insert|update|delete) on public\.patient_documents/);
  assert.doesNotMatch(photoMigration, /caloria|kcal|IMC|nutri/i);
});
