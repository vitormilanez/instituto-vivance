import Link from "next/link";
import type { PatientProfileContext } from "@/modules/onboarding/profile-types";
import { Icon } from "./icons";

export function ProfileCompletionPrompt({tenantId,profile}:{tenantId:string;profile:PatientProfileContext}) {
  const items=[
    {done:Boolean(profile.nutritionSubmittedAt),stage:'alimentacao',label:'Alimentação',title:'Agora, vamos conhecer sua alimentação?',detail:'Conte o que gosta de comer, o que evita e como são seus horários. Um passo de cada vez.',action:'Completar alimentação'},
    {done:Boolean(profile.photosSubmittedAt),stage:'fotos',label:'Fotos',title:'Seu próximo passo: fotos de acompanhamento',detail:'Veja como fazer as fotos de frente, lado e costas. Você pode deixar para quando estiver confortável.',action:'Ver guia de fotos'},
    {done:Boolean(profile.examsSubmittedAt),stage:'exames',label:'Exames',title:'Tem exames anteriores para compartilhar?',detail:'Envie o que já tiver ou avise que não tem exames agora. A equipe recebe os documentos para conferir.',action:'Completar exames'},
  ];
  const next=items.find(item=>!item.done);
  if(!next)return null;
  return <section className="vi-profile-prompt" aria-labelledby="vi-profile-next"><p><Icon name="bell" size={16}/> Complete seu perfil · no seu ritmo</p><h2 id="vi-profile-next">{next.title}</h2><p>{next.detail}</p><Link href={`/clinicas/${tenantId}/completar-perfil?etapa=${next.stage}`}>{next.action}<Icon name="arrow" size={18}/></Link><ol aria-label="Etapas do perfil">{items.map((item,index)=><li key={item.stage} className={item.done?'is-done':undefined}>{item.done?'✓':`${index+1}.`} {item.label}{item.done?' · enviado':''}</li>)}</ol></section>;
}
