import type { Metadata } from "next";
import "./globals.css";
import AppWrapper from "@/components/layout/AppWrapper";

export const metadata: Metadata = {
  title: "ClearBooks",
  description: "Personal finance tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full font-sans">
        <AppWrapper>{children}</AppWrapper>
      </body>
    </html>
  );
}
