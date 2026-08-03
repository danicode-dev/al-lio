import type { Metadata, Viewport } from "next";
import { Barlow, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });
const barlow = Barlow({
  subsets: ["latin"],
  weight: ["900"],
  display: "swap",
  variable: "--font-barlow",
});

const themeScript = `
(() => {
  try {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = savedTheme === "dark" || (!savedTheme && prefersDark);
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  } catch {}
})();
`;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://al-lio.danielcode.dev"),
  title: {
    default: "AL-LIO",
    template: "%s · AL-LIO",
  },
  description: "Panel privado para tareas, calendario, cursos, hackathons, oportunidades y noticias.",
  icons: {
    icon: [
      { url: "/assets/al_lio_favicon_dark_circle_512.png", type: "image/png" },
    ],
    apple: "/assets/al_lio_favicon_dark_circle_512.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.className} ${barlow.variable}`}>{children}</body>
    </html>
  );
}
