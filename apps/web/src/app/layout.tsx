import type { Metadata, Viewport } from 'next';
import { Inter, Fraunces } from 'next/font/google';
import '../styles/globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  axes: ['opsz', 'SOFT', 'WONK'],
  style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  title: 'bela360 - Automação para Negócios de Beleza',
  description:
    'Plataforma de automação completa para salões, barbearias e clínicas de estética',
  keywords: ['salão', 'barbearia', 'estética', 'agendamento', 'whatsapp', 'automação'],
  openGraph: {
    title: 'bela360 - Automação para Negócios de Beleza',
    description:
      'Plataforma de automação completa para salões, barbearias e clínicas de estética',
    siteName: 'bela360',
    locale: 'pt_BR',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#1A0B2E',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} ${fraunces.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
