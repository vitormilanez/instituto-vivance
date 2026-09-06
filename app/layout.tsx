import type { Metadata } from 'next';
import { Geist, Geist_Mono, Playfair_Display } from 'next/font/google';
import { CareDemoProvider } from './components/care-demo-context';
import { ClinicalIntelligenceProvider } from './components/clinical-intelligence-context';
import { SharedCareProvider } from './components/shared-care-context';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const playfairDisplay = Playfair_Display({
  variable: '--font-playfair-display',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://lume-saude-prototipo.vitormilanez.chatgpt.site'),
  title: 'VIVANCE — Cuidado contínuo',
  description: 'Protótipo de cuidado contínuo para emagrecimento e envelhecimento saudável.',
  openGraph: {
    title: 'VIVANCE',
    description: 'Cuidado contínuo, decisões mais claras.',
    type: 'website',
    locale: 'pt_BR',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'VIVANCE — Cuidado contínuo, decisões mais claras.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VIVANCE',
    description: 'Cuidado contínuo, decisões mais claras.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={`${geistSans.variable} ${geistMono.variable} ${playfairDisplay.variable} antialiased`}>
        <SharedCareProvider>
          <CareDemoProvider>
            <ClinicalIntelligenceProvider>{children}</ClinicalIntelligenceProvider>
          </CareDemoProvider>
        </SharedCareProvider>
      </body>
    </html>
  );
}
