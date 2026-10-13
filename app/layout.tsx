import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Bootstrap, Footer, Header, Main, Overlays } from '@/components/Shell';
import '@/styles/tokens.css';
import '@/styles/app.css';

export const metadata: Metadata = { title: 'Texas Private Capital' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:ital,wght@0,400;0,500;0,600;1,400&family=Source+Serif+4:opsz,wght@8..60,500;8..60,600&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Header />
        <div className="demo-strip"><b>Sample data:</b> every firm, LP, person, deal and source on this site is fictional. Your changes are saved in this browser only.</div>
        <Main>{children}</Main>
        <Footer />
        <Overlays />
        <Bootstrap />
      </body>
    </html>
  );
}
