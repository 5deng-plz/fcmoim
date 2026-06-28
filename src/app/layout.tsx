import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "FC Guppy",
  description: "아마추어 풋살 동호회 전용 매니지먼트 PWA",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/svgrepo-fish.svg",
    shortcut: "/icons/svgrepo-fish.svg",
    apple: "/icons/svgrepo-fish.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "var(--brand-primary)",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <Script
        id="theme-loader"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                document.documentElement.setAttribute('data-theme', 'dark');
              } catch (e) {}
            })();
          `
        }}
      />
      <body
        className="font-[Pretendard,_-apple-system,_BlinkMacSystemFont,_'Segoe_UI',_sans-serif]"
      >
        {children}
      </body>
    </html>
  );
}
