import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://monitoreo-mentorias-2026-inacap.zaxht.chatgpt.site'),
  title: 'Gestión de mentorías 2026',
  description: 'App de roles, perfiles, sesiones y exportación Excel para Crea Empresa.',
  openGraph: {
    title: 'Gestión de mentorías 2026',
    description: 'App de roles, perfiles, sesiones y exportación Excel para Crea Empresa.',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gestión de mentorías 2026',
    description: 'App de roles, perfiles, sesiones y exportación Excel para Crea Empresa.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
