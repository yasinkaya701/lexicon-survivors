import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kampüs Royale: Mezuna Kalma! | YKS & Boğaziçi BUEPT Simülasyonu',
  description:
    '17-20 yaş Türk öğrenciler için YKS (TYT/AYT) ve Boğaziçi Üniversitesi Hazırlık (BUEPT) Kariyer & 1v1 Savaş Simülasyonu.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="dark">
      <body className="min-h-screen bg-[#060913] text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
