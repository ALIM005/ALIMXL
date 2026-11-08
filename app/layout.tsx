import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import OfflineSetup from "../components/OfflineSetup";
import "./globals.css";

export const metadata: Metadata = {
  title: "ALIMXL",
  description: "ALIMXL — AWM Excel Studio",
  applicationName: "ALIMXL",
  icons: {
    icon: [
      {
        url: "/favicon.ico", // অথবা আপনার ছোট আকারের আইকন পাথ (যেমন: /icon.png)
        sizes: "32x32",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "ALIMXL",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#106ebe",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <OfflineSetup />
      </body>
    </html>
  );
}