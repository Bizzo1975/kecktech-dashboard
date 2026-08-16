import type { Metadata } from "next";
import { Poppins, Open_Sans } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-heading",
  display: "swap",
});

const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kecktech Dashboard",
  description: "Kecktech internal service dashboard",
  icons: {
    icon: "/brand/transparent-logo.png",
    apple: "/brand/transparent-logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${poppins.variable} ${openSans.variable}`}>
      <body
        style={{
          margin: 0,
          fontFamily: "var(--font-body, 'Open Sans', 'Segoe UI', system-ui, sans-serif)",
          background: "#0f172a",
          display: "flex",
          minHeight: "100vh",
        }}
      >
        <style>{`
          h1, h2, h3, h4, h5, h6 {
            font-family: var(--font-heading, 'Poppins', 'Segoe UI', system-ui, sans-serif);
          }
        `}</style>
        <Sidebar />
        <div style={{ flex: 1, minWidth: 0, overflowX: "hidden" }}>{children}</div>
      </body>
    </html>
  );
}
