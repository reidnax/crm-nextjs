import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NextAuthSessionProvider from "@/components/providers/session-provider";
import QueryProvider from "@/components/providers/query-provider";
import MainLayout from "@/components/layout/main-layout";
import ErrorBoundary from "@/components/ui/error-boundary";

// Initialize event listeners on server side
import { initializeEventListeners } from "@/lib/events/listeners";

// Initialize event system on app startup
if (typeof window === "undefined") {
  initializeEventListeners();
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CRM System",
  description: "Customer Relationship Management System built with Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <ErrorBoundary>
          <NextAuthSessionProvider>
            <QueryProvider>
              <MainLayout>{children}</MainLayout>
            </QueryProvider>
          </NextAuthSessionProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
