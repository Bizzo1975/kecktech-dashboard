import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowLeft, Shield, Cloud, Network, Server, Smartphone, Zap, Database, Code, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { Grid } from "@/components/ui/grid";
import { Input } from "@/components/ui/input";
import { siteConfig } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Services",
  description: "Comprehensive IT services and solutions for your business",
  openGraph: {
    title: "Services | " + siteConfig.name,
    description: "Comprehensive IT services and solutions for your business",
    type: "website",
    url: `${siteConfig.url}/services`,
  },
};

const allServices = [
  {
    icon: Shield,
    title: "Cybersecurity",
    description: "Protect your business with enterprise-grade security solutions and monitoring.",
    features: [
      "Firewall Configuration & Management",
      "Intrusion Detection & Prevention",
      "Security Audits & Assessments",
      "Data Encryption & Backup",
      "24/7 Security Monitoring",
    ],
    category: "Security",
  },
  {
    icon: Cloud,
    title: "Cloud Services",
    description: "Migrate to the cloud with confidence. Scalable infrastructure for your needs.",
    features: [
      "Cloud Migration Planning",
      "AWS, Azure, GCP Setup",
      "Cloud Infrastructure Management",
      "Cost Optimization",
      "Disaster Recovery Solutions",
    ],
    category: "Infrastructure",
  },
  {
    icon: Network,
    title: "Network Solutions",
    description: "Design, implement, and maintain robust network infrastructure.",
    features: [
      "Network Design & Implementation",
      "Wireless Network Setup",
      "Network Monitoring & Maintenance",
      "VPN Configuration",
      "Bandwidth Management",
    ],
    category: "Infrastructure",
  },
  {
    icon: Server,
    title: "IT Infrastructure",
    description: "Complete IT infrastructure management and support services.",
    features: [
      "Server Setup & Configuration",
      "Virtualization Services",
      "Storage Solutions",
      "Backup & Recovery",
      "Performance Optimization",
    ],
    category: "Infrastructure",
  },
  {
    icon: Smartphone,
    title: "Device Management",
    description: "Mobile device management and enterprise mobility solutions.",
    features: [
      "MDM Implementation",
      "Device Enrollment & Configuration",
      "Policy Management",
      "Remote Wipe & Lock",
      "App Distribution",
    ],
    category: "Management",
  },
  {
    icon: Zap,
    title: "24/7 Support",
    description: "Round-the-clock technical support when you need it most.",
    features: [
      "Help Desk Support",
      "Remote Troubleshooting",
      "On-Site Support",
      "Priority Response Times",
      "Proactive Monitoring",
    ],
    category: "Support",
  },
  {
    icon: Database,
    title: "Database Management",
    description: "Expert database administration and optimization services.",
    features: [
      "Database Design & Implementation",
      "Performance Tuning",
      "Backup & Recovery",
      "Data Migration",
      "Security Hardening",
    ],
    category: "Infrastructure",
  },
  {
    icon: Code,
    title: "Software Development",
    description: "Custom software solutions tailored to your business needs.",
    features: [
      "Custom Application Development",
      "API Integration",
      "Legacy System Modernization",
      "Quality Assurance",
      "Maintenance & Updates",
    ],
    category: "Development",
  },
  {
    icon: Monitor,
    title: "IT Consulting",
    description: "Strategic IT consulting to align technology with business goals.",
    features: [
      "Technology Roadmap Planning",
      "Vendor Selection & Management",
      "IT Budget Planning",
      "Compliance & Governance",
      "Digital Transformation",
    ],
    category: "Consulting",
  },
];

const categories = ["All", "Security", "Infrastructure", "Management", "Support", "Development", "Consulting"];

export default function ServicesPage() {
  return (
    <div className="flex flex-col relative z-10 bg-background/95 backdrop-blur-sm min-h-screen">
      {/* Back Button */}
      <Container className="pt-8">
        <Button asChild variant="ghost" className="mb-4">
          <Link href="/#services">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      </Container>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-16 md:py-24">
        <Container>
          <div className="w-full flex items-center justify-center">
            <div className="w-full max-w-5xl text-center">
              <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                Our Services
              </h1>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                Comprehensive IT solutions designed to keep your business running smoothly
                and securely
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* Services Grid */}
      <section className="py-16 md:py-24">
        <Container>
          {/* Filter Section */}
          <div className="mb-12">
            <div className="flex flex-wrap items-center justify-center gap-4">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={category === "All" ? "default" : "outline"}
                  className="filter-button"
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>

          {/* Services Grid */}
          <Grid cols={3} gap="lg">
            {allServices.map((service, index) => {
              const Icon = service.icon;
              return (
                <Card
                  key={index}
                  className="group relative overflow-hidden border-2 transition-all duration-300 hover:border-primary/50 hover:shadow-lg"
                >
                  <CardHeader>
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="mb-2">
                      <span className="text-xs font-semibold text-primary">
                        {service.category}
                      </span>
                    </div>
                    <CardTitle className="text-xl">{service.title}</CardTitle>
                    <CardDescription className="text-base">
                      {service.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {service.features.slice(0, 3).map((feature, idx) => (
                        <li key={idx} className="flex items-start">
                          <ArrowRight className="mr-2 h-4 w-4 shrink-0 text-primary" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button
                      asChild
                      variant="ghost"
                      className="mt-4 w-full group-hover:text-primary"
                    >
                      <Link href={`/services/${service.title.toLowerCase().replace(/\s+/g, "-")}`}>
                        Learn More
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </Grid>
        </Container>
      </section>

      {/* CTA Section */}
      <section className="border-t bg-muted/30 py-16">
        <Container>
          <div className="text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight">
              Need a Custom Solution?
            </h2>
            <p className="mb-8 text-muted-foreground">
              We can tailor our services to meet your specific business requirements
            </p>
            <Button asChild size="lg">
              <Link href="/contact">Contact Us</Link>
            </Button>
          </div>
        </Container>
      </section>
    </div>
  );
}
