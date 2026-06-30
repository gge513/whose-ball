import type { Metadata } from "next";
import { Bricolage_Grotesque, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({
  variable: "--ff-display",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const mono = JetBrains_Mono({
  variable: "--ff-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Whose Ball",
  description:
    "Agent-native cohort PM: a GitHub-fed shipping heartbeat and a Friday voting console.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full font-mono">{children}</body>
    </html>
  );
}
