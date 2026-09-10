import Link from 'next/link';
import { Brand } from './brand';
import { logout } from '@/app/actions';
export function Header() {
  return <header className="topbar"><Brand /><div className="topbar-actions"><Link href="/clinicas">Minhas clínicas</Link><form action={logout}><button className="secondary">Sair</button></form></div></header>;
}
