import type { Metadata } from "next";
import { Outfit, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthSessionProvider } from "@/components/providers/auth-session-provider";
import { getAppSettings } from "@/actions/settings";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getAppSettings();
  return {
    title: `${settings.appName} — Sistem Inventaris Aset`,
    description:
      settings.appDescription ||
      "Sistem manajemen inventaris & pelabelan aset berbasis QR Code",
    icons: {
      // /api/favicon proxies the uploaded logo from Supabase storage
      // Using a proxy route avoids CORS issues and browser favicon restrictions
      icon: [
        { url: "/api/favicon", type: "image/png" },
      ],
      shortcut: "/api/favicon",
      apple: "/api/favicon",
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${outfit.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-outfit">
        <ThemeProvider>
          <AuthSessionProvider>
            <TooltipProvider>
              {children}
            </TooltipProvider>
            <Toaster richColors position="top-right" />
          </AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
