import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://unsttopableteam.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: "UNSTOPPABLE TEAM",
  description: "Internal team management platform for Fiverr accounts, messages, and performance tracking",
  icons: {
    icon: [{ url: "/icon", type: "image/png" }],
    apple: [{ url: "/apple-icon", type: "image/png" }],
  },
  openGraph: {
    title: "UNSTOPPABLE TEAM",
    description: "Internal team management platform for Fiverr accounts, messages, and performance tracking",
    url: appUrl,
    siteName: "UNSTOPPABLE TEAM",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "UNSTOPPABLE TEAM",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "UNSTOPPABLE TEAM",
    description: "Internal team management platform for Fiverr accounts, messages, and performance tracking",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
