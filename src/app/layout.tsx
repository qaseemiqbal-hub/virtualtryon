import type { Metadata, Viewport } from 'next';
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
  title: 'AURA | AI Virtual Try-On Fashion Studio',
  description: 'Experience premium, state-of-the-art AI-powered virtual try-on. Upload your photo as a guest and see yourself instantly in luxury evening gowns, summer dresses, and cocktail outfits.',
  keywords: ['AI Try-On', 'Virtual Dressing Room', 'Fashion AI', 'AI Clothes Changer', 'AURA Studio', 'Vercel try-on'],
  authors: [{ name: 'AURA AI Fashion' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#060608] text-[#f4f4f7] overflow-x-hidden selection:bg-purple-500 selection:text-white">
        <div className="flex-1 flex flex-col relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}
