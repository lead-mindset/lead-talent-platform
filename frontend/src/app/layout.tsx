import type { Metadata } from "next";
import { Geist, Geist_Mono, Montserrat } from "next/font/google";
import { CookieConsent } from "@/components/cookie-consent";
import { AmbientBackground } from "@/components/ambient-background";
import { SmoothScroll } from "@/components/smooth-scroll";
import { ViewAs } from "@/components/view-as";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LEAD Talent Platform",
  description: "La plataforma de talento de LEAD: personas, eventos y oportunidades.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col overflow-x-hidden bg-background">
        <ToastProvider>
          <AmbientBackground />
          <SmoothScroll />
          {children}
          <CookieConsent />
          <ViewAs />
        </ToastProvider>
      </body>
    </html>
  );
}