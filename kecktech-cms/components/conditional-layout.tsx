"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export function ConditionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ALL pages get header and footer - no exceptions
  return (
    <div className="flex min-h-screen flex-col relative z-10">
      <Header />
      <main className="flex-1 w-full relative z-10">{children}</main>
      <Footer />
    </div>
  );
}
