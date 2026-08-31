import type { Metadata, Viewport } from "next";
import { Barlow, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });
const barlow = Barlow({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  display: "swap",
  variable: "--font-barlow",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://al-lio.danielcode.dev"),
  title: {
    default: "AL-LIO",
    template: "%s · AL-LIO",
  },
  description: "Panel privado para tareas, calendario, cursos, eventos, retos, oportunidades y noticias.",
  icons: {
    icon: [
      { url: "/assets/al_lio_icon_black.png", type: "image/png" },
    ],
    apple: "/assets/al_lio_icon_black.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${inter.className} ${barlow.variable}`}>{children}</body>
    </html>
  );
}
