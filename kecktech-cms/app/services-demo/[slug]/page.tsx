"use client";

import { useRouter, useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import CircuitBackground16 from "@/components/ui/CircuitBackground16";
import dynamic from "next/dynamic";

// Dynamically import icons
const iconMap: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {};

function getIcon(iconName: string): React.ComponentType<React.SVGProps<SVGSVGElement>> {
  if (iconMap[iconName]) {
    return iconMap[iconName];
  }

  const IconComponent = dynamic(
    () =>
      import("lucide-react").then((mod) => {
        const Icon = (mod as any)[iconName];
        if (Icon) {
          iconMap[iconName] = Icon;
          return { default: Icon };
        }
        return { default: mod.Server };
      }),
    { ssr: false }
  ) as React.ComponentType<React.SVGProps<SVGSVGElement>>;

  iconMap[iconName] = IconComponent;
  return IconComponent;
}

const services = [
  {
    slug: "cybersecurity",
    icon: "ShieldCheck",
    title: "Cybersecurity",
    description: "Protect your business with enterprise-grade security solutions and monitoring.",
    details: [
      "24/7 security monitoring and threat detection",
      "Firewall configuration and management",
      "Vulnerability assessments and penetration testing",
      "Security awareness training for employees",
      "Compliance management (GDPR, HIPAA, PCI-DSS)",
      "Incident response and recovery planning",
    ],
  },
  {
    slug: "cloud-services",
    icon: "CloudUpload",
    title: "Cloud Services",
    description: "Migrate to the cloud with confidence. Scalable infrastructure for your needs.",
    details: [
      "Cloud migration strategy and planning",
      "AWS, Azure, and Google Cloud setup",
      "Infrastructure as Code (IaC) implementation",
      "Cloud cost optimization",
      "Disaster recovery and backup solutions",
      "Multi-cloud and hybrid cloud architectures",
    ],
  },
  {
    slug: "network-solutions",
    icon: "Router",
    title: "Network Solutions",
    description: "Design, implement, and maintain robust network infrastructure.",
    details: [
      "Network design and architecture",
      "Wireless network deployment",
      "Network security and segmentation",
      "Performance monitoring and optimization",
      "VPN and remote access solutions",
      "Network troubleshooting and support",
    ],
  },
  {
    slug: "it-infrastructure",
    icon: "Database",
    title: "IT Infrastructure",
    description: "Complete IT infrastructure management and support.",
    details: [
      "Server installation and configuration",
      "Virtualization and containerization",
      "Storage solutions and data management",
      "Backup and disaster recovery",
      "Infrastructure monitoring and maintenance",
      "Hardware lifecycle management",
    ],
  },
  {
    slug: "device-management",
    icon: "Devices",
    title: "Device Management",
    description: "Mobile device management and enterprise mobility.",
    details: [
      "Mobile Device Management (MDM) setup",
      "Device enrollment and provisioning",
      "Security policy enforcement",
      "App management and distribution",
      "Remote device wiping and tracking",
      "BYOD (Bring Your Own Device) support",
    ],
  },
  {
    slug: "24-7-support",
    icon: "Headphones",
    title: "24/7 Support",
    description: "Round-the-clock technical support when you need it.",
    details: [
      "24/7 helpdesk support",
      "Remote troubleshooting and assistance",
      "Priority response times",
      "Proactive system monitoring",
      "On-site support when needed",
      "Dedicated account management",
    ],
  },
];

export default function ServiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string;

  const service = services.find((s) => s.slug === slug);

  if (!service) {
    return (
      <div className="min-h-screen relative">
        <div className="fixed inset-0 z-0">
          <CircuitBackground16 />
        </div>
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4">Service Not Found</h1>
            <Button onClick={() => router.back()}>Go Back</Button>
          </div>
        </div>
      </div>
    );
  }

  const Icon = getIcon(service.icon);

  return (
    <div className="min-h-screen relative">
      {/* Circuit Background */}
      <div className="fixed inset-0 z-0">
        <CircuitBackground16 />
      </div>

      {/* Content */}
      <section className="py-20 md:py-28 bg-[rgba(5,5,10,0.98)] w-full relative z-10 min-h-screen">
        <Container>
          <div className="w-full flex items-center justify-center">
            <div className="w-full max-w-4xl">
              {/* Back Button */}
              <Button
                onClick={() => router.back()}
                variant="ghost"
                className="mb-8 text-white drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] hover:bg-white/10"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Services
              </Button>

              {/* Service Detail Card */}
              <Card className="bg-card/80 backdrop-blur-sm border-2">
                <CardHeader>
                  <div className="flex items-start gap-6">
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 border-2 border-primary/30">
                      <Icon className="h-10 w-10 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-4xl font-bold mb-4 text-white drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]">
                        {service.title}
                      </CardTitle>
                      <CardDescription className="text-xl text-white/90 drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">
                        {service.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <h3 className="text-2xl font-bold mb-6 text-white drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]">
                    What We Offer
                  </h3>
                  <ul className="space-y-4">
                    {service.details.map((detail, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-3 text-white/90 drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]"
                      >
                        <span className="text-primary mt-1">•</span>
                        <span className="text-lg">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}

