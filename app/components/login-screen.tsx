'use client';

import {
  ArrowRight,
  CheckCircle,
  Eye,
  EyeSlash,
  ShieldCheck,
  SpinnerGap,
  Stethoscope,
  User,
} from '@phosphor-icons/react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

const DEMO_PASSWORD = 'Vivans@2026';

const demoAccounts = [
  {
    username: 'dr.guilherme',
    password: DEMO_PASSWORD,
    name: 'Dr. Guilherme',
    role: 'Profissional',
    initials: 'GM',
    Icon: Stethoscope,
  },
  {
    username: 'marina',
    password: DEMO_PASSWORD,
    name: 'Marina',
    role: 'Paciente',
    initials: 'MC',
    Icon: User,
  },
  {
    username: 'admin.vivans',
    password: 'VivansLocal@2026',
    name: 'Admin VIVANCE',
    role: 'Administrador',
    initials: 'AV',
    Icon: ShieldCheck,
  },
] as const;

export function LoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function selectAccount(accountUsername: string, accountPassword: string) {
    setUsername(accountUsername);
    setPassword(accountPassword);
    setError('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!username.trim() || !password) {
      setError('Preencha o usuário e a senha.');
      return;
    }

    setBusy(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const payload = (await response.json()) as { error?: string; redirectTo?: string };

      if (!response.ok || !payload.redirectTo) {
        setError(payload.error ?? 'Não foi possível entrar. Tente novamente.');
        return;
      }

      router.replace(payload.redirectTo);
      router.refresh();
    } catch {
      setError('Não foi possível conectar. Verifique sua conexão e tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  const accounts = (
    <div className="grid gap-2.5">
      {demoAccounts.map(({ username: accountUsername, password: accountPassword, name, role, initials, Icon }) => {
        const selected = username === accountUsername;
        return (
          <button
            key={accountUsername}
            type="button"
            onClick={() => selectAccount(accountUsername, accountPassword)}
            aria-pressed={selected}
            className="group flex min-h-[62px] w-full cursor-pointer items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.08] px-3.5 text-left text-white transition-colors hover:bg-white/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8cbaf2] lg:min-h-[68px]"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/12 text-xs font-bold">
              <span className="sr-only">{initials}</span>
              <Icon aria-hidden="true" size={20} weight="duotone" />
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-sm font-semibold">{name}</strong>
              <span className="mt-0.5 block text-xs text-white/65">{role} · {accountUsername}</span>
            </span>
            {selected ? (
              <CheckCircle aria-hidden="true" size={20} weight="fill" className="shrink-0 text-[#8cbaf2]" />
            ) : (
              <ArrowRight aria-hidden="true" size={17} className="shrink-0 text-white/55 transition-transform group-hover:translate-x-0.5" />
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <main className="min-h-svh bg-[#e7ecf5] sm:grid sm:place-items-center sm:p-6 lg:p-8">
      <section className="grid min-h-svh w-full overflow-hidden bg-[#f7f9fc] sm:min-h-0 sm:max-w-[1100px] sm:rounded-[30px] sm:border sm:border-white/80 sm:shadow-[0_32px_90px_-38px_rgba(3,19,45,0.42)] lg:min-h-[720px] lg:grid-cols-[400px_minmax(0,1fr)]">
        <aside className="relative hidden overflow-hidden bg-[#03132d] p-10 text-white lg:flex lg:flex-col">
          <div aria-hidden="true" className="absolute -right-24 -top-24 size-72 rounded-full bg-[#124da0]/30 blur-3xl" />
          <div className="relative flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-white shadow-[0_12px_30px_rgba(0,0,0,0.2)]">
              <Image src="/brand/vivance-mark.png" alt="" width={42} height={42} className="size-[42px] rounded-xl" priority />
            </span>
            <div>
              <p className="text-lg font-bold tracking-[0.14em]">VIVANCE</p>
              <p className="mt-0.5 text-xs font-medium text-[#a9c8ee]">Cuidado contínuo</p>
            </div>
          </div>

          <div className="relative mt-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.08] px-3 py-1.5 text-xs font-semibold text-white/85">
              <ShieldCheck aria-hidden="true" size={16} weight="duotone" />
              Ambiente protegido
            </span>
            <h1 className="font-editorial mt-6 max-w-[310px] text-[2.55rem] leading-[1.08] tracking-[-0.035em]">
              Seu cuidado, em um só lugar.
            </h1>
            <p className="mt-5 max-w-[310px] text-[15px] leading-6 text-white/68">
              Cada perfil acessa somente a experiência preparada para sua jornada.
            </p>
          </div>

          <div className="relative mt-auto rounded-[22px] border border-white/14 bg-white/[0.07] p-4 backdrop-blur-sm">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.13em] text-[#a9c8ee]">Acessos do protótipo</p>
            {accounts}
            <p className="mt-3 text-xs leading-5 text-white/55">Selecione um perfil para preencher os dados de demonstração.</p>
          </div>
        </aside>

        <div className="flex min-w-0 items-center justify-center px-5 py-10 sm:px-12 sm:py-14 lg:px-16">
          <div className="w-full max-w-[470px]">
            <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
              <Image src="/brand/vivance-mark.png" alt="" width={44} height={44} className="size-11 rounded-2xl" priority />
              <div>
                <p className="text-base font-bold tracking-[0.14em] text-[#071a3a]">VIVANCE</p>
                <p className="text-xs font-medium text-[#61718a]">Cuidado contínuo</p>
              </div>
            </div>

            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#124da0]">Acesso seguro</p>
              <h2 className="mt-3 text-[2rem] font-semibold tracking-[-0.045em] text-[#071a3a] sm:text-[2.35rem]">Bem-vindo de volta</h2>
              <p className="mt-2 text-[15px] leading-6 text-[#61718a]">Entre para acessar sua área de cuidado.</p>
            </div>

            <form onSubmit={submit} className="mt-8 rounded-[24px] border border-[#dbe4f0] bg-white p-5 shadow-[0_18px_45px_-30px_rgba(3,19,45,0.32)] sm:p-7" noValidate>
              <div>
                <label htmlFor="username" className="mb-2 block text-sm font-semibold text-[#2d4160]">Usuário</label>
                <input
                  id="username"
                  name="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  disabled={busy}
                  placeholder="Digite seu usuário"
                  className="h-[54px] w-full rounded-2xl border border-[#ccd8e8] bg-white px-4 text-base text-[#071a3a] outline-none transition focus:border-[#124da0] focus:ring-4 focus:ring-[#124da0]/10 disabled:bg-[#f2f5f9]"
                />
              </div>

              <div className="mt-5">
                <label htmlFor="password" className="mb-2 block text-sm font-semibold text-[#2d4160]">Senha</label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    disabled={busy}
                    placeholder="Digite sua senha"
                    className="h-[54px] w-full rounded-2xl border border-[#ccd8e8] bg-white px-4 pr-13 text-base text-[#071a3a] outline-none transition focus:border-[#124da0] focus:ring-4 focus:ring-[#124da0]/10 disabled:bg-[#f2f5f9]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    disabled={busy}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    className="absolute right-1.5 top-1/2 grid size-11 -translate-y-1/2 cursor-pointer place-items-center rounded-xl text-[#61718a] transition-colors hover:bg-[#edf3fb] hover:text-[#124da0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0]"
                  >
                    {showPassword ? <EyeSlash aria-hidden="true" size={20} /> : <Eye aria-hidden="true" size={20} />}
                  </button>
                </div>
              </div>

              {error && (
                <div role="alert" className="mt-4 rounded-xl border border-[#efc5c1] bg-[#fff2f1] px-3.5 py-3 text-sm font-medium text-[#8b3732]">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="mt-6 inline-flex h-[54px] w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#03132d] px-5 text-[15px] font-bold text-white shadow-[0_14px_28px_-16px_rgba(3,19,45,0.7)] transition-colors hover:bg-[#082553] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124da0] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-65"
              >
                {busy ? (
                  <>
                    <SpinnerGap aria-hidden="true" size={19} className="animate-spin motion-reduce:animate-none" />
                    Entrando…
                  </>
                ) : (
                  <>
                    Entrar
                    <ArrowRight aria-hidden="true" size={18} weight="bold" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 lg:hidden">
              <p className="mb-3 text-center text-xs font-bold uppercase tracking-[0.13em] text-[#61718a]">Escolha um acesso de demonstração</p>
              <div className="rounded-[22px] bg-[#03132d] p-3">{accounts}</div>
            </div>

            <p className="mt-6 text-center text-xs leading-5 text-[#718099]">
              Protótipo com dados fictícios. O acesso é separado por perfil.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
