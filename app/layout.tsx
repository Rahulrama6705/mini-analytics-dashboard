import type { Metadata } from "next";
import { Inter, Geist_Mono, Fredoka } from "next/font/google";
import "./globals.css";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fredoka = Fredoka({
  variable: "--font-wordmark",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: "Coral Academy Analytics",
  description: "Internal analytics dashboard for Coral Academy",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} ${fredoka.variable} h-full antialiased`}
    >
      <body className="flex h-full min-h-screen bg-background text-foreground">
        <TooltipProvider>
          <SidebarNav />
          <div className="flex min-w-0 flex-1 flex-col">
            <main className="flex-1 overflow-y-auto p-6">{children}</main>
          </div>
        </TooltipProvider>
      </body>
    </html>
  );
}
