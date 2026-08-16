import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Container } from "@/components/ui/container";

// This would normally fetch from the database
const serviceDetails: Record<string, any> = {
  "cybersecurity": {
    title: "Cybersecurity",
    description: "Protect your business with enterprise-grade security solutions and monitoring.",
    features: [
      "Firewall Configuration & Management",
      "Intrusion Detection & Prevention",
      "Security Audits & Assessments",
      "Data Encryption & Backup",
      "24/7 Security Monitoring",
      "Vulnerability Scanning",
      "Incident Response Planning",
      "Security Training & Awareness",
    ],
  },
};

export default function ServiceDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const service = serviceDetails[params.slug];

  if (!service) {
    notFound();
  }

  return (
    <div className="flex flex-col">
      <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-16 md:py-24">
        <Container>
          <Button asChild variant="ghost" className="mb-8">
            <Link href="/services">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Services
            </Link>
          </Button>
          <div>
            <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              {service.title}
            </h1>
            <p className="text-lg text-muted-foreground">{service.description}</p>
          </div>
        </Container>
      </section>

      <section className="py-16 md:py-24">
        <Container>
          <Card>
            <CardHeader>
              <CardTitle>Service Features</CardTitle>
              <CardDescription>
                Everything included in our {service.title} service
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {service.features.map((feature: string, index: number) => (
                  <li key={index} className="flex items-start">
                    <Check className="mr-2 h-5 w-5 shrink-0 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </Container>
      </section>
    </div>
  );
}

