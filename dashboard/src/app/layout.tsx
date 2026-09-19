import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

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
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "var(--font-body)",
          background: "#0f172a",
          display: "flex",
          minHeight: "100vh",
        }}
      >
        <style>{`
          h1, h2, h3, h4, h5, h6 {
            font-family: var(--font-heading);
          }
        `}</style>
        <Sidebar />
        <div style={{ flex: 1, minWidth: 0, overflowX: "hidden" }}>{children}</div>
      </body>
    </html>
  );
}
