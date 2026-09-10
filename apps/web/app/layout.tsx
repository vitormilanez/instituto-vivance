import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'VIVANCE — Cuidado contínuo',
  description: 'Acesso à área de cuidado Vivance.',
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR"><body><a className="skip-link" href="#conteudo">Ir para o conteúdo</a>{children}</body></html>;
}
