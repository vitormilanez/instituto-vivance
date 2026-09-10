'use client';
import { useActionState } from 'react';
import { login, savePatient } from '@/app/actions';
export function LoginForm() {
  const [state, action, pending] = useActionState(login, { error: '' });
  return <form action={action}>
    <div className="field"><label htmlFor="email">E-mail</label><input id="email" name="email" type="email" autoComplete="username" maxLength={254} required /></div>
    <div className="field"><label htmlFor="password">Senha</label><input id="password" name="password" type="password" autoComplete="current-password" maxLength={1024} required /></div>
    {state.error && <p className="feedback" role="alert">{state.error}</p>}
    <button className="full" disabled={pending}>{pending ? 'Entrando…' : 'Entrar'}</button>
  </form>;
}
export function PatientForm({ tenantId }: { tenantId: string }) {
  const [state, action, pending] = useActionState(savePatient.bind(null, tenantId), { error: '' });
  return <form action={action}>
    <div className="field"><label htmlFor="display_name">Nome completo</label><input id="display_name" name="display_name" autoComplete="off" minLength={2} maxLength={160} required /></div>
    <div className="field"><label htmlFor="birth_date">Nascimento <small>(opcional)</small></label><input id="birth_date" name="birth_date" type="date" min="1900-01-01" /></div>
    {state.error && <p className="feedback" role="alert">{state.error}</p>}
    <button className="full" disabled={pending}>{pending ? 'Salvando…' : 'Cadastrar paciente'}</button>
  </form>;
}
