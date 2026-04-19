import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FC Moim",
  description: "아마추어 풋살 동호회 전용 매니지먼트 PWA",
  manifest: "/manifest.json",
  icons: {
    icon: "/brand/fcmoim-mark.svg",
    shortcut: "/brand/fcmoim-mark.svg",
    apple: "/brand/fcmoim-mark.svg",
  },
};

export const viewport = {
  themeColor: "#16a34a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body
        className="font-[Pretendard,_-apple-system,_BlinkMacSystemFont,_'Segoe_UI',_sans-serif]"
      >
        {children}
      </body>
    </html>
  );
}
