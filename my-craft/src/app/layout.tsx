import Header from '@/app/_components/header';
import { Providers } from '@/providers';
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
  title: 'my craft',
  description: 'AI-powered chat application with Echo billing integration',
  icons: {
    icon: '/mycraft-favicon.png',
    shortcut: '/mycraft-favicon.png',
    apple: '/mycraft-favicon.png',
  },
  openGraph: {
    title: 'my craft',
    description: 'AI-powered chat application with Echo billing integration',
    images: ['/mycraft-favicon.png'],
  },
  twitter: {
    card: 'summary',
    title: 'my craft',
    description: 'AI-powered chat application with Echo billing integration',
    images: ['/mycraft-favicon.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex h-screen flex-col antialiased`}
      >
        <Providers>
          <Header title="my craft" />
          <div className="min-h-0 flex-1">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
