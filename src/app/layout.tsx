import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: '阿布吉播放器',
  description: '多平台IPTV串流播放器，支援多種協議和解碼方式',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
        <script src="https://cdn.jsdelivr.net/npm/flv.js@latest"></script>
      </head>
      <body className={`${inter.className} bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 min-h-screen`}>
        <div className="relative min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}