import { Metadata } from "next";
import { siteConfig } from "@/lib/constants";

export const metadata: Metadata = {
  title: "About Us",
  description: "Learn about Kecktech IT Service & Support and our mission to provide exceptional IT solutions",
  openGraph: {
    title: "About Us | " + siteConfig.name,
    description: "Learn about Kecktech IT Service & Support and our mission to provide exceptional IT solutions",
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

