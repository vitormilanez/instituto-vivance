"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadDocument } from "@/lib/document-upload";
import type { Nutrition, PatientProfileContext, ProfilePhotos, ProfileSection } from "@/modules/onboarding/profile-types";
import { OnboardingExamUpload } from "./onboarding-workspace";
import { Icon, Mark } from "./patient/icons";

const patterns: Record<Nutrition['pattern'], string> = { '':'Não informado', mixed:'Como alimentos variados', vegetarian:'Vegetariana', vegan:'Vegana', other:'Outra forma de comer' };
const mealNames = { breakfast:'Café da manhã', lunch:'Almoço', dinner:'Jantar', snack:'Lanches e outros momentos' };
const photos: { key:keyof ProfilePhotos; title:string; hint:string }[] = [
  {key:'frontDocumentId',title:'De frente',hint:'Olhe para a câmera. Deixe os braços levemente abertos, afastados do corpo.'},
  {key:'sideDocumentId',title:'De lado',hint:'Vire o corpo de lado. Deixe os braços afastados o suficiente para mostrar o contorno da cintura.'},
  {key:'backDocumentId',title:'De costas',hint:'Fique de costas para a câmera, com os braços levemente abertos.'},
];
const titles = {nutrition:'Sua alimentação',photos:'Suas fotos',exams:'Exames anteriores'};
const sectionParams = {nutrition:'alimentacao',photos:'fotos',exams:'exames'};
type Patch = Partial<Pick<PatientProfileContext,'nutrition'|'photos'|'examsStatus'|'examsDocumentIds'>>;

export function PatientProfileWorkspace({tenantId, initial, section}:{tenantId:string; initial:PatientProfileContext; section:ProfileSection}) {
  const router=useRouter();
  const [profile,setProfile]=useState(initial);
  const profileRef=useRef(initial);
  const dirty=useRef(false);
  const [step,setStep]=useState(0);
  const [saving,setSaving]=useState(false);
  const busy=useRef(false);
  const [pendingFiles,setPendingFiles]=useState(false);
  const [error,setError]=useState('');
  const [consent,setConsent]=useState(false);
  const [finished,setFinished]=useState(false);
  const [editingReview,setEditingReview]=useState(false);
  const heading=useRef<HTMLHeadingElement>(null);
  const home=`/clinicas/${tenantId}/meu-cuidado/hoje`;
  const endpoint=`/api/v1/clinics/${tenantId}/profile-context`;
  useEffect(()=>{heading.current?.focus({preventScroll:true});},[step,finished]);

  function update(patch:Patch) { const next={...profileRef.current,...patch}; profileRef.current=next;setProfile(next);dirty.current=true;setError(''); }
  async function request(method:'PATCH'|'POST',payload:object) {
    const response=await fetch(endpoint,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify({version:profileRef.current.version,...payload})});
    const body=await response.json() as {profileContext?:PatientProfileContext;error?:string};
    if(!response.ok || !body.profileContext) throw new Error(response.status===409 ? 'Seu perfil mudou em outra tela. Atualize a página para continuar.' : body.error || 'Não conseguimos salvar. Tente novamente.');
    profileRef.current=body.profileContext;setProfile(body.profileContext);dirty.current=false;
  }
  async function save() {
    if(!dirty.current) return;
    const current=profileRef.current;
    await request('PATCH',section==='nutrition'?{nutrition:current.nutrition}:section==='photos'?{photos:current.photos}:{examsStatus:current.examsStatus,examsDocumentIds:current.examsDocumentIds});
  }
  async function action(work:()=>Promise<void>) {
    if(busy.current) return false;
    busy.current=true;setSaving(true);setError('');
    try {await work();return true;} catch(reason) {setError(reason instanceof Error?reason.message:'Não conseguimos salvar. Tente novamente.');return false;}
    finally {busy.current=false;setSaving(false);}
  }
  async function advance(next:number) { return action(async()=>{await save();setStep(next);window.scrollTo({top:0,behavior:'instant'});}); }
  async function edit(next:number) {setEditingReview(true);await advance(next);}
  async function continueNutrition() {if(await advance(editingReview?3:step+1))setEditingReview(false);}
  async function leave() { await action(async()=>{await save();router.push(home);router.refresh();}); }
  async function submit() {
    if(!consent) return;
    await action(async()=>{await save();await request('POST',{section,shareConsent:true});setFinished(true);window.scrollTo({top:0,behavior:'instant'});});
  }
  async function addPhoto(key:keyof ProfilePhotos,file:File|null) {
    if(!file) return;
    await action(async()=>{
      const uploaded=await uploadDocument({tenantId,patientId:profileRef.current.patientId,file,category:'clinical_document',visibility:'internal'});
      update({photos:{...profileRef.current.photos,[key]:uploaded.documentId}});
      try {await save();} catch {throw new Error('A foto chegou, mas falta salvar a associação. Use “Salvar e sair” para tentar novamente sem reenviar.');}
    });
  }
  async function addExams(ids:string[]) {
    const current=profileRef.current;
    update({examsDocumentIds:[...new Set([...current.examsDocumentIds,...ids])],examsStatus:'shared'});
    try {await save();} catch {throw new Error('O arquivo chegou, mas falta salvar a associação. Tente novamente nesta linha sem reenviar o arquivo.');}
  }
  function nutrition(patch:Partial<Nutrition>) {update({nutrition:{...profileRef.current.nutrition,...patch}});}
  const allPhotos=photos.every(item=>Boolean(profile.photos[item.key]));
  const nutritionHasContent=Boolean(profile.nutrition.pattern||profile.nutrition.preferences.trim()||profile.nutrition.avoidedFoods.trim()||profile.nutrition.mealRoutine.some(item=>item.time.trim()||item.description.trim()));
  const ready=section==='nutrition'&&nutritionHasContent||section==='photos'&&allPhotos||section==='exams'&&(profile.examsStatus==='none_now'||profile.examsDocumentIds.length>0);
  const disabled=saving||pendingFiles;
  const nextSection=section==='nutrition'?'photos':section==='photos'?'exams':null;

  if(finished) return <section className="vi-intake vi-complete vi-complete-new">
    <div className="vi-success-art" aria-hidden="true"><svg viewBox="0 0 180 150" fill="none"><path className="vi-success-route" d="M15 116C15 58 66 106 90 58C114 106 165 58 165 116"/><path className="vi-success-check" d="m69 51 14 14 29-31"/></svg></div>
    <h1 ref={heading} tabIndex={-1}>{section==='nutrition'?'Sua rotina tem espaço no seu cuidado.':section==='photos'?'Mais um passo para conhecer você.':'Seu perfil está ganhando forma.'}</h1>
    <p className="vi-lead">{section==='exams'&&profile.examsStatus==='none_now'?'Registramos que você não tem exames para enviar agora. Se encontrar depois, pode voltar por Meu cuidado.':'Suas informações foram compartilhadas com a equipe. Obrigado por construir esse começo com a gente.'}</p>
    {nextSection&&<button type="button" className="vi-primary" onClick={()=>{router.push(`/clinicas/${tenantId}/completar-perfil?etapa=${sectionParams[nextSection]}`);router.refresh();}}>{nextSection==='photos'?'Próximo: fotos de acompanhamento':'Próximo: exames anteriores'}<Icon name="arrow"/></button>}
    <button type="button" className={nextSection?'vi-text-button':'vi-primary'} onClick={()=>{router.push(`${home}?enviado=${sectionParams[section]}`);router.refresh();}}>Ir para meu início</button>
  </section>;

  return <section className="vi-intake">
    <header className="vi-intake-header"><Mark size={34}/><span>{titles[section]}</span><button type="button" className="vi-text-button" disabled={disabled} onClick={()=>void leave()}>Salvar e sair</button></header>
    {section==='nutrition'&&<div className="vi-progress"><div className="vi-progress-line" role="progressbar" aria-label="Progresso da alimentação" aria-valuemin={0} aria-valuemax={4} aria-valuenow={step+1}><span style={{transform:`scaleX(${(step+1)/4})`}}/></div><p><span>{['Seu jeito de comer','Preferências','Seus horários','Conferir'][step]}</span><span>{step+1} de 4</span></p></div>}
    <fieldset disabled={disabled} className="vi-workspace-fields"><div key={step} className="vi-intake-body">
      {section==='nutrition'&&step===0?<>
        <h1 ref={heading} tabIndex={-1}>Vamos conhecer seu jeito de comer?</h1><p className="vi-lead">Sem certo ou errado. Sua rotina ajuda a equipe a construir um cuidado que cabe na sua vida.</p>
        <fieldset className="vi-health-question"><legend>Como você descreveria sua alimentação?</legend><div className="vi-choices">{(['mixed','vegetarian','vegan','other'] as const).map(value=><button type="button" aria-pressed={profile.nutrition.pattern===value} key={value} onClick={()=>nutrition({pattern:value})}>{patterns[value]}</button>)}</div></fieldset>
        <p className="vi-support">Esta é uma visão da sua rotina. As refeições do dia a dia continuam no registro de alimentação.</p>
      </>:section==='nutrition'&&step===1?<>
        <h1 ref={heading} tabIndex={-1}>O que combina com você?</h1><p className="vi-lead">Conte suas preferências e o que costuma deixar de fora.</p>
        <div className="vi-basics"><label className="vi-field">O que gosta de comer ou come com frequência?<textarea rows={3} maxLength={4000} value={profile.nutrition.preferences} placeholder="Ex.: arroz e feijão, frutas, café pela manhã…" onChange={e=>nutrition({preferences:e.target.value})}/></label><label className="vi-field">O que não come ou prefere evitar?<textarea rows={3} maxLength={4000} value={profile.nutrition.avoidedFoods} placeholder="Ex.: não gosto de peixe; evito leite porque me causa desconforto." onChange={e=>nutrition({avoidedFoods:e.target.value})}/><small>Se houver restrição, diga o motivo se souber. Alergias já informadas ficam no seu histórico de saúde.</small></label></div>
      </>:section==='nutrition'&&step===2?<>
        <h1 ref={heading} tabIndex={-1}>Como é um dia comum para você?</h1><p className="vi-lead">Horários aproximados e exemplos já ajudam. Deixe em branco as refeições que não faz.</p>
        <div>{profile.nutrition.mealRoutine.map(meal=><section className="vi-meal" key={meal.id}><h2>{mealNames[meal.id]}</h2><div className="vi-meal-fields"><label className="vi-field">Horário<input type="text" maxLength={100} value={meal.time} placeholder={meal.id==='snack'?'Ao longo do dia':'Ex.: 8h–9h'} onChange={e=>nutrition({mealRoutine:profile.nutrition.mealRoutine.map(item=>item.id===meal.id?{...item,time:e.target.value}:item)})}/></label><label className="vi-field">O que costuma comer<textarea rows={2} maxLength={2000} value={meal.description} placeholder="Ex.: pão, ovo e café" onChange={e=>nutrition({mealRoutine:profile.nutrition.mealRoutine.map(item=>item.id===meal.id?{...item,description:e.target.value}:item)})}/></label></div></section>)}</div>
      </>:section==='nutrition'?<>
        <h1 ref={heading} tabIndex={-1}>Sua rotina, do seu jeito.</h1><p className="vi-lead">Confira o que quer compartilhar. Você pode completar ou atualizar depois.</p>
        <dl className="vi-review"><div><dt>Seu jeito de comer<button type="button" onClick={()=>void edit(0)}>Editar</button></dt><dd>{patterns[profile.nutrition.pattern]}</dd></div><div><dt>Preferências e restrições<button type="button" onClick={()=>void edit(1)}>Editar</button></dt><dd>{profile.nutrition.preferences||'Preferências não informadas'}{'\n'}{profile.nutrition.avoidedFoods||'Alimentos evitados não informados'}</dd></div><div><dt>Um dia comum<button type="button" onClick={()=>void edit(2)}>Editar</button></dt><dd>{profile.nutrition.mealRoutine.filter(item=>item.time||item.description).map(item=>`${mealNames[item.id]} · ${item.time||'Horário não informado'} · ${item.description||'Alimentos não informados'}`).join('\n')||'Rotina ainda não informada'}</dd></div></dl>
      </>:section==='photos'?<>
        <h1 ref={heading} tabIndex={-1}>Um registro de onde você começa.</h1><p className="vi-lead">Três fotos ajudam a equipe a acompanhar sua evolução ao longo do tempo. Faça no seu ritmo e só se estiver confortável.</p>
        <div className="vi-photo-guide"><p><strong>Roupa confortável que mostre o contorno do corpo:</strong> camiseta ajustada ou top, com shorts ou legging. Não precisa ficar sem roupa. Você pode deixar o rosto fora do enquadramento.</p><p>Use um fundo simples, boa luz e a câmera na altura do tronco. Enquadre o corpo inteiro, fique em postura natural e não contraia a barriga. Se puder, peça ajuda a alguém.</p></div>
        <p className="vi-support">JPG ou PNG, até 5 MB por foto. As imagens ficam privadas no seu rascunho; a equipe recebe quando você confirmar abaixo.</p>
        <div className="vi-photo-list">{photos.map((item,index)=><section className="vi-photo-item" key={item.key}><h2><span>0{index+1}</span>{item.title}</h2><p>{item.hint}</p><label className="vi-field">{profile.photos[item.key]?'Substituir foto':'Escolher ou tirar foto'}<input type="file" accept="image/jpeg,image/png" capture="environment" onChange={e=>{const file=e.target.files?.[0]??null;e.target.value='';void addPhoto(item.key,file);}}/></label>{profile.photos[item.key]&&<div className="vi-photo-received"><span><Icon name="check" size={16}/>Foto recebida</span><a href={`/api/v1/clinics/${tenantId}/documents/${profile.photos[item.key]}/download`} target="_blank" rel="noreferrer">Ver foto</a></div>}</section>)}</div>
      </>:<>
        <h1 ref={heading} tabIndex={-1}>Você já tem exames anteriores?</h1><p className="vi-lead">Compartilhe o que já tiver. Não precisa fazer novos exames para completar esta etapa.</p><p className="vi-support">Envie o laudo completo e legível, de preferência em PDF. A equipe vai conferir os documentos; o envio não altera suas orientações automaticamente.</p>
        <OnboardingExamUpload tenantId={tenantId} patientId={profile.patientId} receivedIds={profile.examsDocumentIds} onComplete={addExams} onPendingChange={setPendingFiles}/>
        <label className="vi-consent"><input type="checkbox" checked={profile.examsStatus==='none_now'} disabled={profile.examsDocumentIds.length>0} onChange={e=>update({examsStatus:e.target.checked?'none_now':'not_started'})}/><span>Não tenho exames para enviar agora.</span></label>
      </>}
      {section==='nutrition'&&step===3&&!nutritionHasContent&&<p className="vi-support">Conte ao menos um detalhe da sua alimentação antes de compartilhar. Se preferir, use “Salvar e sair” e complete depois.</p>}
      {(section!=='nutrition'||step===3)&&<label className="vi-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>{section==='exams'&&profile.examsStatus==='none_now'?'Confirmo que não tenho exames para enviar agora.':'Quero compartilhar esta seção com minha equipe de cuidado.'}</span></label>}
    </div></fieldset>
    <footer className="vi-intake-actions"><button type="button" className="vi-primary" disabled={disabled||(section!=='nutrition'||step===3)&&(!consent||!ready)} onClick={()=>section==='nutrition'&&step<3?void continueNutrition():void submit()}>{saving?'Salvando…':pendingFiles?'Enviando arquivos…':section==='nutrition'&&step<3?'Continuar':'Compartilhar com a equipe'}<Icon name="arrow"/></button>{section==='nutrition'&&step>0&&<button type="button" className="vi-text-button" disabled={disabled} onClick={()=>void advance(step-1)}>Voltar</button>}{section!=='nutrition'&&<button type="button" className="vi-text-button" disabled={disabled} onClick={()=>void leave()}>Fazer depois</button>}</footer>
    {error&&<p className="vi-save-state is-error" role="alert">{error}</p>}
    {section==='nutrition'&&<p className="vi-save-state">Seu rascunho fica salvo ao avançar ou escolher “Salvar e sair”.</p>}
  </section>;
}
