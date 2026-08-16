import { Metadata } from "next";
import { siteConfig } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Services",
  description: "Comprehensive IT services and solutions for your business",
  openGraph: {
    title: "Services | " + siteConfig.name,
    description: "Comprehensive IT services and solutions for your business",
  },
};

export default function ServicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

