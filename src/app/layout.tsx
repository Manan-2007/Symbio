import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Symbio — turn surplus into resources",
  description: "Demo B2B matchmaker for industrial by-products, using fictional businesses and browser-local data.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
