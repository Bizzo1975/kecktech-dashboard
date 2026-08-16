import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { generateServiceSchema } from "@/lib/structured-data";
import { siteConfig } from "@/lib/constants";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const service = await prisma.service.findUnique({
    where: { slug: params.slug },
  });

  if (!service) {
    return {};
  }

  const title = service.metaTitle || service.title;
  const description = service.metaDescription || service.description;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | ${siteConfig.name}`,
      description,
      type: "website",
      url: `${siteConfig.url}/services/${service.slug}`,
      images: service.image
        ? [
            {
              url: service.image,
              width: 1200,
              height: 630,
              alt: service.title,
            },
          ]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: service.image ? [service.image] : [],
    },
  };
}

export default async function ServiceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  const service = await prisma.service.findUnique({
    where: { slug: params.slug },
  });

  if (!service) {
    notFound();
  }

  const serviceSchema = generateServiceSchema(service);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(serviceSchema),
        }}
      />
      {children}
    </>
  );
}

