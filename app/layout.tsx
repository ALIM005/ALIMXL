import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import OfflineSetup from "../components/OfflineSetup";
import SettingsProvider from "../components/SettingsProvider";

import "./globals.css";

export const metadata: Metadata = {
  title: "ALIMXL",

  description: "ALIMXL — AWM Excel Studio",

  applicationName: "ALIMXL",

  icons: {
    icon: [
      {
        url: "/favicon.ico",
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

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({
  children,
}: Readonly<RootLayoutProps>) {
  return (
    <html lang="en">
      <body>
        <SettingsProvider>
          {children}

          <OfflineSetup />
        </SettingsProvider>
      </body>
    </html>
  );
}