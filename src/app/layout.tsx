import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { auth } from "@/auth";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tennis-Forderungspyramide",
  description: "Forderungspyramide für Herren und Damen mit OÖTV-ITN-Integration",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Lets the bottom tab bar extend under the iPhone home indicator.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f6f3" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0d0c" },
  ],
};

// Explicit props instead of the generated LayoutProps<"/"> global: that type
// only exists after `next build`/`next typegen`, but CI typechecks before building.
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Header />
        <main className="flex flex-1 flex-col">{children}</main>
        <Footer />
        {session?.user && <BottomNav />}
      </body>
    </html>
  );
}
