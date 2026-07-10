import type { Metadata } from "next";
import { Outfit, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthSessionProvider } from "@/components/providers/auth-session-provider";
import { getAppSettings } from "@/actions/settings";
import "./globals.css";

// App is inherently dynamic (auth-gated pages, DB-backed settings that admins can
// change any time) — force-dynamic here skips static prerendering for every route,
// so `next build` doesn't need a live DB connection to render pages like /login.
export const dynamic = "force-dynamic";

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
  // Falls back to defaults if the DB isn't reachable — e.g. during `next build`,
  // when Next prerenders static pages (like /_not-found) without a live DB connection.
  let appName = "InvenTrack";
  let appDescription =
    "Sistem manajemen inventaris & pelabelan aset berbasis QR Code";

  try {
    const settings = await getAppSettings();
    appName = settings.appName;
    appDescription = settings.appDescription || appDescription;
  } catch (error) {
    console.warn("generateMetadata: failed to load app settings, using defaults.", error);
  }

  return {
    title: `${appName} — Sistem Inventaris Aset`,
    description: appDescription,
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
