import { Award, Users, Target, Heart, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Grid } from "@/components/ui/grid";
import { Button } from "@/components/ui/button";
const values = [
  {
    icon: Target,
    title: "Mission-Driven",
    description: "We're committed to delivering IT solutions that drive your business forward.",
  },
  {
    icon: Heart,
    title: "Client-Focused",
    description: "Your success is our success. We build lasting partnerships with our clients.",
  },
  {
    icon: Award,
    title: "Excellence",
    description: "We maintain the highest standards in everything we do.",
  },
  {
    icon: Users,
    title: "Expert Team",
    description: "Our team of certified professionals brings years of experience.",
  },
];

export default function AboutPage() {
  return (
    <div className="flex flex-col relative z-10 bg-background/95 backdrop-blur-sm min-h-screen">
      {/* Back Button */}
      <Container className="pt-8">
        <Button asChild variant="ghost" className="mb-4">
          <Link href="/#about">
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
                About Kecktech
              </h1>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                Your trusted partner for professional IT services and support
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* Company Story */}
      <section className="py-16 md:py-24">
        <Container>
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            <div>
              <h2 className="mb-6 text-3xl font-bold tracking-tight">Our Story</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Founded in 2020, Kecktech IT Service & Support has been at the
                  forefront of providing comprehensive IT solutions to businesses of all
                  sizes. We started with a simple mission: to make enterprise-grade IT
                  services accessible to every business.
                </p>
                <p>
                  Over the years, we've grown from a small team of passionate IT
                  professionals to a trusted partner for hundreds of businesses. Our
                  commitment to excellence and customer satisfaction has earned us a
                  reputation for reliability and innovation.
                </p>
                <p>
                  Today, we continue to evolve with the latest technologies while
                  maintaining our core values of integrity, professionalism, and
                  client-focused service.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div className="relative h-64 w-full max-w-md rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 p-8">
                <div className="text-center">
                  <div className="mb-2 text-5xl font-bold text-primary">500+</div>
                  <div className="text-lg text-muted-foreground">Clients Served</div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Our Values */}
      <section className="border-t bg-muted/30 py-16 md:py-24">
        <Container>
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight">Our Values</h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              The principles that guide everything we do
            </p>
          </div>
          <Grid cols={4} gap="lg">
            {values.map((value, index) => {
              const Icon = value.icon;
              return (
                <Card key={index} className="text-center">
                  <CardHeader>
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-6 w-6" />
                    </div>
                    <CardTitle>{value.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{value.description}</CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </Grid>
        </Container>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 md:py-24">
        <Container>
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight">Why Choose Kecktech?</h2>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Expert Team</h3>
              <p className="text-muted-foreground">
                Our certified professionals bring years of experience and stay current
                with the latest technologies.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">24/7 Support</h3>
              <p className="text-muted-foreground">
                Round-the-clock technical support ensures your business never stops,
                even outside regular hours.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Proven Track Record</h3>
              <p className="text-muted-foreground">
                With hundreds of satisfied clients, we have a proven track record of
                delivering results.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Custom Solutions</h3>
              <p className="text-muted-foreground">
                We tailor our services to meet your specific business needs and
                requirements.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Competitive Pricing</h3>
              <p className="text-muted-foreground">
                Transparent, competitive pricing with no hidden fees or surprises.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Fast Response</h3>
              <p className="text-muted-foreground">
                Quick response times and rapid resolution of issues to minimize
                downtime.
              </p>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}

