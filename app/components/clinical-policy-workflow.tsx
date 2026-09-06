'use client';
import { useState } from 'react';
import type { ClinicalPolicyStore } from './use-clinical-policy';
import { formatDateTime } from './clinical-intelligence-model';

const button = 'min-h-11 rounded-xl border border-[#c8d8eb] bg-white px-4 text-sm font-bold text-[#124da0] disabled:cursor-not-allowed disabled:opacity-45';
export function ClinicalPolicyWorkflow({ policy }: { policy: ClinicalPolicyStore }) {
  const [acknowledgedTest, setAcknowledgedTest] = useState<string | null>(null);
  const workspace = policy.view?.workspace;
  const draft = workspace?.draft;
  const tested = !policy.hasLocalEdits && draft?.comparison?.passed;
  const comparison = draft?.comparison;
  const approved = tested && draft?.approval;
  const changed = workspace && draft?.fingerprint !== workspace.active.fingerprint;
  return <section aria-labelledby="policy-workflow-title" className="vivance-panel mt-5 rounded-2xl p-5 sm:p-6">
    <h3 id="policy-workflow-title" className="text-xl font-semibold text-[#071a3a]">Revisar antes de aplicar</h3>
    <p className="mt-2 text-sm leading-6 text-[#50627f]">Rascunho → comparação → aprovação médica → publicação. A publicação alcança novas análises da clínica; não muda resultados anteriores nem envia orientações ao paciente.</p>
    <p role="status" className="mt-3 text-sm font-bold text-[#124da0]">{policy.busy ? 'Registrando na Central…'
      : policy.hasLocalEdits ? 'Alterações locais ainda não salvas'
        : approved ? 'Aprovado · aguardando publicação'
          : tested ? 'Comparação concluída · aguardando revisão médica'
            : changed ? 'Rascunho compartilhado · aguardando teste' : `Política v${workspace?.active.version ?? '—'} vigente`}</p>
    {policy.error ? <p role="alert" className="mt-3 rounded-xl bg-[#fff0ed] p-3 text-sm text-[#9c453f]">{policy.error}</p> : null}
    <button type="button" disabled={policy.busy} onClick={() => void policy.reload()} className="mt-2 min-h-11 text-sm font-semibold text-[#124da0] underline">Atualizar versão compartilhada</button>
    {policy.conflict ? <div role="alert" className="my-3 rounded-xl border border-[#e1c58b] bg-[#fff8e8] p-4 text-sm leading-6 text-[#77500a]">
      Outra sessão alterou o rascunho. Sua edição continua nos campos acima e não será sobrescrita automaticamente.
      <details className="mt-2"><summary className="cursor-pointer font-bold">Conferir o rascunho compartilhado</summary>
        <p>{draft?.note}</p><ul>{draft?.candidate.modules.map((module) => <li key={module.id}>{module.label}: {module.enabled ? 'ligado' : 'desligado'} · {module.feedbackGoal}</li>)}</ul>
      </details>
      <button type="button" className="mt-2 min-h-11 font-bold underline" onClick={() => {
        if (window.confirm('Descartar somente a edição local não salva e carregar o rascunho compartilhado?')) policy.useSharedDraft();
      }}>Descartar edição local e usar rascunho compartilhado</button>
    </div> : null}
    <fieldset disabled={policy.busy || !workspace} className="mt-3 space-y-4 disabled:opacity-70">
      <label className="block text-sm font-semibold text-[#405675]">Motivo da atualização
        <textarea value={policy.note} maxLength={2000} onChange={(event) => policy.edit((candidate) => candidate, event.target.value)}
          placeholder="Ex.: tornar explícitas as lacunas de informação antes da consulta." rows={3}
          className="mt-2 w-full rounded-xl border border-[#cbd8e9] bg-white p-3 text-sm font-normal text-[#071a3a] focus:ring-2 focus:ring-[#124da0]" />
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={button} disabled={!policy.hasLocalEdits || !policy.note.trim() || policy.conflict} onClick={() => void policy.run('save')}>1. Salvar rascunho</button>
        <button type="button" className={button} disabled={policy.hasLocalEdits || !changed} onClick={() => void policy.run('test')}>2. Comparar com vigente</button>
      </div>
      {comparison ? <section className="rounded-xl border border-[#dbe4f0] bg-[#f7faff] p-4">
        <h4 className="text-sm font-bold text-[#071a3a]">Comparação v{comparison.baseVersion} → rascunho</h4>
        <p className="mt-2 text-xs leading-5 text-[#50627f]">Simulação determinística de regras em casos fictícios. Não gera respostas de um modelo, não lê estudos e não comprova qualidade clínica ou científica.</p>
        <p className="mt-2 text-sm font-semibold text-[#405675]">{policy.hasLocalEdits ? 'Comparação desatualizada: salve e teste novamente.' : comparison.passed ? 'Verificações de consistência concluídas.' : 'Há bloqueios a resolver.'}</p>
        <ul className="mt-3 list-inside list-disc space-y-1 text-xs leading-5 text-[#50627f]">{comparison.changes.map((change) => <li key={change}>{change}</li>)}</ul>
        {comparison.blockers.length ? <ul className="mt-3 list-inside list-disc text-xs leading-5 text-[#9c453f]">{comparison.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul> : null}
        <details className="mt-3"><summary className="min-h-11 cursor-pointer text-sm font-bold text-[#124da0]">Ver antes e depois · {comparison.cases.length} cenários</summary>
          <ul className="space-y-3">{comparison.cases.map((item) => <li key={item.id} className="rounded-xl border border-[#dbe4f0] bg-white p-3">
            <h5 className="text-xs font-bold text-[#071a3a]">{item.label}</h5>
            <dl className="mt-2 grid gap-3 text-xs leading-5 text-[#50627f] sm:grid-cols-2">
              <div><dt className="font-bold">Antes · v{comparison.baseVersion}</dt><dd>{item.before}</dd></div>
              <div><dt className="font-bold">Depois · rascunho</dt><dd>{item.after}</dd></div>
            </dl>
          </li>)}</ul>
        </details>
        <p className="mt-2 text-[11px] text-[#61718a]">{comparison.suiteVersion} · {formatDateTime(new Date(comparison.createdAt))} · {comparison.createdBy}</p>
      </section> : null}
      {tested ? <label className="flex min-h-11 items-start gap-3 text-sm leading-6 text-[#405675]">
        <input type="checkbox" checked={acknowledgedTest === comparison?.id} className="mt-1 size-5 shrink-0 accent-[#124da0]"
          onChange={(event) => setAcknowledgedTest(event.target.checked ? comparison!.id : null)} />
        Revisei fontes, limitações, objetivos e a comparação desta versão. Entendo que o teste não valida evidência clínica.
      </label> : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={button} disabled={!tested || acknowledgedTest !== comparison?.id || Boolean(approved)} onClick={() => void policy.run('approve', true)}>3. Aprovar versão</button>
        <button type="button" className={`${button} !bg-[#03132d] !text-white`} disabled={!approved} onClick={() => {
          if (window.confirm(`Publicar a política v${(workspace?.active.version ?? 0) + 1} para novas análises dos acompanhamentos autorizados da clínica? Resultados antigos serão preservados.`)) void policy.run('publish');
        }}>4. Publicar para a clínica</button>
      </div>
    </fieldset>
    <details className="mt-5 border-t border-[#dbe4f0] pt-4">
      <summary className="min-h-11 cursor-pointer text-sm font-bold text-[#124da0]">Histórico de versões · fontes e aprovação preservadas</summary>
      <ol className="space-y-3">{policy.view?.history.map((version) => <li key={version.id} className="rounded-xl border border-[#dbe4f0] p-4 text-xs leading-5 text-[#50627f]">
        <strong className="text-sm text-[#071a3a]">v{version.version}{version.version === workspace?.active.version ? ' · vigente' : ' · anterior'}</strong>
        <p>{version.publishedAt} · {version.publishedBy}</p><p className="mt-2">{version.note}</p>
        <p>{version.approval ? `Aprovação: ${version.approval.actorName} · ${formatDateTime(new Date(version.approval.at))}` : 'Configuração inicial fictícia, sem aprovação clínica real.'}</p>
        <details className="mt-2"><summary className="cursor-pointer font-semibold">Ver cópia dos módulos e fontes desta versão</summary>
          <ul className="mt-2 space-y-2">{version.modules.map((module) => <li key={module.id}>{module.label}: {module.enabled ? 'ligado' : 'desligado'} · {module.feedbackGoal}</li>)}</ul>
          <ul className="mt-3 space-y-2">{version.knowledgeSources.map((source) => <li key={source.id}><strong>{source.title} · {source.version} · {source.reference}</strong><p>{source.relevantClaims}</p><p>Limitações: {source.limitations}</p></li>)}</ul>
        </details>
        <p className="mt-2 break-all text-[10px]">Identificação da configuração: {version.fingerprint}</p>
      </li>)}</ol>
    </details>
  </section>;
}
