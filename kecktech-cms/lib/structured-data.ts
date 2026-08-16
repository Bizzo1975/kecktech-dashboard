import { siteConfig } from "./constants";

export interface ServiceStructuredData {
  "@context": string;
  "@type": string;
  name: string;
  description: string;
  provider?: {
    "@type": string;
    name: string;
  };
  areaServed?: string;
  serviceType?: string;
}

export interface OrganizationStructuredData {
  "@context": string;
  "@type": string;
  name: string;
  description: string;
  url: string;
  logo?: string;
  contactPoint?: {
    "@type": string;
    telephone: string;
    contactType: string;
    email?: string;
  };
  sameAs?: string[];
}

export function generateOrganizationSchema(): OrganizationStructuredData {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+1-555-123-4567",
      contactType: "Customer Service",
      email: "info@kecktech.com",
    },
  };
}

export function generateServiceSchema(service: {
  title: string;
  description: string;
  price?: string | null;
}): ServiceStructuredData {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.title,
    description: service.description,
    provider: {
      "@type": "Organization",
      name: siteConfig.name,
    },
    areaServed: "US",
  };
}

export function generateWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteConfig.url}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

