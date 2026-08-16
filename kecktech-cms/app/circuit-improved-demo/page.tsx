"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Award, Users, Target, Heart, Shield, Cloud, Network, Server, Smartphone, Zap, Database, Code, Monitor, Mail, Phone, MapPin, Send, Clock, Settings, DollarSign, ChevronDown, ChevronUp } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { GlassCard } from "@/components/ui/glass-card";
import { ExpandableServiceCard } from "@/components/expandable-service-card";
import { FlipValueCard } from "@/components/flip-value-card";
import { ScrollReveal } from "@/components/animations/scroll-reveal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Grid } from "@/components/ui/grid";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { siteConfig } from "@/lib/constants";
import CircuitBackground16Improved from "@/components/ui/CircuitBackground16Improved";

const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  subject: z.string().min(3, "Subject must be at least 3 characters"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

const values = [
  {
    icon: "Target",
    title: "Mission-Driven",
    description: "We're committed to delivering IT solutions that drive your business forward.",
    backgroundImage: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop&q=80",
  },
  {
    icon: "Heart",
    title: "Client-Focused",
    description: "Your success is our success. We build lasting partnerships with our clients.",
    backgroundImage: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=400&h=300&fit=crop&q=80",
  },
  {
    icon: "Award",
    title: "Excellence",
    description: "We maintain the highest standards in everything we do.",
    backgroundImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop&q=80",
  },
  {
    icon: "Users",
    title: "Expert Team",
    description: "Our team of certified professionals brings years of experience.",
    backgroundImage: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=300&fit=crop&q=80",
  },
  {
    icon: "Zap",
    title: "Innovation",
    description: "We leverage cutting-edge technology to solve complex business challenges.",
    backgroundImage: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=300&fit=crop&q=80",
  },
];

const services = [
  {
    slug: "cybersecurity",
    icon: "ShieldCheck",
    title: "Cybersecurity",
    description: "Protect your business with enterprise-grade security solutions and monitoring.",
    backgroundImage: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&h=600&fit=crop&q=80",
  },
  {
    slug: "cloud-services",
    icon: "CloudUpload",
    title: "Cloud Services",
    description: "Migrate to the cloud with confidence. Scalable infrastructure for your needs.",
    backgroundImage: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=600&fit=crop&q=80",
  },
  {
    slug: "network-solutions",
    icon: "Router",
    title: "Network Solutions",
    description: "Design, implement, and maintain robust network infrastructure.",
    backgroundImage: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop&q=80",
  },
  {
    slug: "it-infrastructure",
    icon: "Database",
    title: "IT Infrastructure",
    description: "Complete IT infrastructure management and support.",
    backgroundImage: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=600&fit=crop&q=80",
  },
  {
    slug: "device-management",
    icon: "Devices",
    title: "Device Management",
    description: "Mobile device management and enterprise mobility.",
    backgroundImage: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&h=600&fit=crop&q=80",
  },
  {
    slug: "24-7-support",
    icon: "Headphones",
    title: "24/7 Support",
    description: "Round-the-clock technical support when you need it.",
    backgroundImage: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=600&fit=crop&q=80",
  },
];

// Collapsible Contact Form Component
function CollapsibleContactForm() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mt-6">
      {!isExpanded ? (
        <Button
          onClick={() => setIsExpanded(true)}
          size="lg"
          className="w-full"
        >
          <Send className="mr-2 h-4 w-4" />
          Send Message
        </Button>
      ) : (
        <Card className="bg-transparent border-0 mt-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]">Send us a message</CardTitle>
                <CardDescription className="text-white/90 drop-shadow-[0_0_8px_rgba(0,0,0,0.8)] mt-2">
                  Fill out the form below and we'll get back to you within 24 hours.
                </CardDescription>
              </div>
              <Button
                onClick={() => setIsExpanded(false)}
                variant="outline"
                size="sm"
                className="bg-transparent border-primary/50 text-white hover:bg-primary/10"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pb-6">
            <ContactForm />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ContactForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, touchedFields },
    reset,
    watch,
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    mode: "onChange",
  });

  const watchedValues = watch();

  const onSubmit = async (data: ContactFormValues) => {
    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast({
        title: "Message sent!",
        description: "We'll get back to you as soon as possible.",
      });
      reset();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pb-0 flex-1 flex flex-col">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            placeholder="John Doe"
            {...register("name")}
            className={
              errors.name
                ? "border-destructive focus-visible:ring-destructive"
                : touchedFields.name && !errors.name
                ? "border-green-500 focus-visible:ring-green-500"
                : ""
            }
          />
          {errors.name && (
            <p className="text-sm text-destructive animate-in fade-in slide-in-from-top-1">
              {errors.name.message}
            </p>
          )}
          {touchedFields.name && !errors.name && (
            <p className="text-sm text-green-600 dark:text-green-400">✓ Valid</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            placeholder="john@example.com"
            {...register("email")}
            className={
              errors.email
                ? "border-destructive focus-visible:ring-destructive"
                : touchedFields.email && !errors.email
                ? "border-green-500 focus-visible:ring-green-500"
                : ""
            }
          />
          {errors.email && (
            <p className="text-sm text-destructive animate-in fade-in slide-in-from-top-1">
              {errors.email.message}
            </p>
          )}
          {touchedFields.email && !errors.email && (
            <p className="text-sm text-green-600 dark:text-green-400">✓ Valid email</p>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="(555) 123-4567"
          {...register("phone")}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="subject">Subject *</Label>
        <Input
          id="subject"
          placeholder="How can we help?"
          {...register("subject")}
          className={
            errors.subject
              ? "border-destructive focus-visible:ring-destructive"
              : touchedFields.subject && !errors.subject
              ? "border-green-500 focus-visible:ring-green-500"
              : ""
          }
        />
        {errors.subject && (
          <p className="text-sm text-destructive animate-in fade-in slide-in-from-top-1">
            {errors.subject.message}
          </p>
        )}
        {touchedFields.subject && !errors.subject && (
          <p className="text-sm text-green-600 dark:text-green-400">✓ Valid</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Message *</Label>
        <div className="relative">
          <textarea
            id="message"
            rows={6}
            placeholder="Tell us about your project or question..."
            {...register("message")}
            className={`flex min-h-[80px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50 ${
              errors.message
                ? "border-destructive focus-visible:ring-destructive"
                : touchedFields.message && !errors.message
                ? "border-green-500 focus-visible:ring-green-500"
                : "border-input focus-visible:ring-ring"
            }`}
          />
          {touchedFields.message && (
            <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
              {watchedValues.message?.length || 0} / 10 characters
            </div>
          )}
        </div>
        {errors.message && (
          <p className="text-sm text-destructive animate-in fade-in slide-in-from-top-1">
            {errors.message.message}
          </p>
        )}
        {touchedFields.message && !errors.message && (
          <p className="text-sm text-green-600 dark:text-green-400">✓ Valid message</p>
        )}
      </div>
      <Button type="submit" size="lg" className="w-full mt-auto" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <span className="mr-2">Sending...</span>
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            Send Message
          </>
        )}
      </Button>
    </form>
  );
}

export default function CircuitImprovedDemoPage() {
  // Handle hash navigation on page load
  useEffect(() => {
    if (window.location.hash) {
      const hash = window.location.hash;
      setTimeout(() => {
        const element = document.querySelector(hash);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }
  }, []);

  return (
    <div className="relative z-10 min-h-screen">
      {/* Background - Improved version */}
      <div className="absolute inset-0 z-0 pointer-events-none min-h-full">
        <CircuitBackground16Improved />
      </div>

      {/* Hero Section */}
      <section id="home" className="relative overflow-hidden pt-24 md:pt-32 lg:pt-40 pb-0 w-full min-h-screen flex flex-col bg-transparent">
        <Container className="relative z-10 flex-1 flex flex-col justify-center">
          <div className="w-full flex flex-col items-center justify-center">
            <div className="w-full max-w-5xl text-center">
              {/* Main Heading - Above processor */}
              <ScrollReveal delay={0.1}>
                <h1 className="mb-0 text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl drop-shadow-[0_0_20px_rgba(0,0,0,0.8)] leading-tight" style={{ marginBottom: '50px' }}>
                  Professional IT Service
                  <span className="block mt-4 text-transparent bg-clip-text bg-gradient-to-r from-[#0066ff] via-[#3b82f6] to-[#06b6d4] bg-[length:200%_auto] animate-gradient text-2xl sm:text-3xl md:text-4xl lg:text-5xl leading-tight drop-shadow-[0_0_15px_rgba(0,102,255,0.6)]">
                    & Support
                  </span>
                </h1>
              </ScrollReveal>
              
              {/* Spacer to push content below processor (processor is roughly at 50vh, height ~13vh) */}
              <div className="h-[15vh] md:h-[20vh] lg:h-[25vh] flex-shrink-0" />
              
              {/* Subheader - Below processor, aligned with bottom yellow line horizontal segment */}
              <ScrollReveal>
                <div className="mb-8 inline-flex items-center rounded-full border border-primary/50 bg-primary/20 backdrop-blur-md px-6 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(0,102,255,0.5)]" style={{ marginTop: 'calc(20px + 18vh)' }}>
                  <span className="mr-3 h-2.5 w-2.5 animate-pulse rounded-full bg-accent shadow-[0_0_10px_#06b6d4]" />
                  <span className="text-white">Trusted IT Solutions Since 2020</span>
                </div>
              </ScrollReveal>
              
              <ScrollReveal delay={0.2}>
                <div className="flex items-center justify-center mb-0 mt-8">
                  <p className="max-w-3xl text-xl text-white/95 sm:text-2xl leading-normal drop-shadow-[0_0_15px_rgba(0,0,0,0.8)]">
                    Empowering businesses with cutting-edge technology solutions. We provide
                    comprehensive IT services to keep your operations running smoothly.
                  </p>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </Container>
      </section>

      {/* Services Section */}
      <section id="services" className="pt-0 pb-0 bg-transparent w-full relative z-10 -mt-0" style={{ marginTop: '100px' }}>
        <Container style={{ paddingBottom: '25px' }}>
          <div className="w-full flex flex-col gap-12">
            {/* Header and Subheading - Above cards */}
            <div className="w-full relative" style={{ minHeight: '200px', position: 'relative' }}>
              <ScrollReveal>
                <div className="relative">
                  {/* Header and Subheading - Original position, NOT MOVED */}
                  <div className="text-right mb-6" style={{ marginRight: '50px', position: 'relative' }}>
                    <h2 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl text-white drop-shadow-[0_0_15px_rgba(0,0,0,0.8)]">
                      Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0066ff] via-[#3b82f6] to-[#06b6d4]">Services</span>
                    </h2>
                  </div>
                  
                  {/* Icons - Positioned in a ROW to the far left, at top of section */}
                  <div className="flex flex-col" style={{ position: 'absolute', left: '0px', top: '0px', minHeight: '368px' }}>
                    {/* Subheader - Moved above icons */}
                    <div className="text-left mb-4" style={{ paddingLeft: '10px', maxWidth: '300px' }}>
                      <p className="text-xl text-white/95 drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]">
                        Comprehensive IT solutions tailored to your business needs
                      </p>
                    </div>

                    {/* Icon Row - Fixed at top, always visible */}
                    <div className="flex flex-row gap-2" style={{ position: 'relative', zIndex: 100, flexWrap: 'nowrap', height: '88px' }}>
                      {services.map((service, index) => (
                        <div key={service.slug} style={{ position: 'relative', width: '72px', height: '88px', flexShrink: 0, zIndex: 100 }}>
                          <ExpandableServiceCard
                            iconName={service.icon}
                            title={service.title}
                            description={service.description}
                            index={index}
                            slug={service.slug}
                            backgroundImage={service.backgroundImage}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </Container>
      </section>

      {/* About Section */}
      <section id="about" className="pb-20 md:pb-28 bg-transparent w-full relative z-10" style={{ marginTop: '150px' }}>
        <Container className="bg-transparent">
          <div className="w-full flex items-center justify-center bg-transparent">
            <div className="w-full max-w-7xl bg-transparent">
              <ScrollReveal>
                <div className="mb-16 text-left bg-transparent" style={{ position: 'relative', marginLeft: '35px' }}>
                  <h2 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl text-white drop-shadow-[0_0_15px_rgba(0,0,0,0.8)]" style={{ marginBottom: '25px' }}>
                    About <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0066ff] via-[#3b82f6] to-[#06b6d4]">Kecktech</span>
                  </h2>
                </div>
              </ScrollReveal>

              {/* Company Story */}
              <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 mb-16" style={{ marginTop: '100px' }}>
                <div>
                  <h3 className="mb-6 text-3xl font-bold tracking-tight text-white drop-shadow-[0_0_12px_rgba(0,0,0,0.8)]">Our Story</h3>
                  <div className="space-y-4 text-white/95 drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">
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
                <div className="flex items-center justify-center relative">
                  <div className="relative h-64 w-full max-w-md rounded-lg overflow-hidden">
                    <Image
                      src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&h=600&fit=crop&q=80"
                      alt="Professional IT consultant with laptop bag getting into car"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5"></div>
                  </div>
                </div>
              </div>

              {/* Our Values */}
              <div className="mb-16" style={{ marginTop: '75px' }}>
                <div className="mb-12 flex flex-col items-center">
                  <h3 className="text-3xl font-bold tracking-tight text-white drop-shadow-[0_0_12px_rgba(0,0,0,0.8)] text-center" style={{ marginBottom: '25px' }}>Our Values</h3>
                  <p className="max-w-2xl text-white/95 drop-shadow-[0_0_8px_rgba(0,0,0,0.8)] text-center" style={{ marginBottom: '25px' }}>
                    The principles that guide everything we do
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {values.map((value, index) => (
                    <FlipValueCard
                      key={index}
                      iconName={value.icon}
                      title={value.title}
                      description={value.description}
                      backgroundImage={value.backgroundImage}
                    />
                  ))}
                </div>
              </div>

              {/* Why Choose Us */}
              <div style={{ paddingTop: '200px', position: 'relative' }}>
                <div className="grid grid-cols-2 gap-6 max-w-xl" style={{ position: 'absolute', left: 0, top: '50px' }}>
                  <div className="space-y-2 flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-16 h-16 flex items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30">
                        <Users 
                          className="w-8 h-8 text-primary" 
                          strokeWidth={2}
                        />
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      <h4 className="text-xl font-semibold text-white drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]">Expert Team</h4>
                      <p className="text-white/95 drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">
                        Our certified professionals bring years of experience and stay current with the latest technologies.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-16 h-16 flex items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30">
                        <Clock 
                          className="w-8 h-8 text-primary" 
                          strokeWidth={2}
                        />
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      <h4 className="text-xl font-semibold text-white drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]">24/7 Support</h4>
                      <p className="text-white/95 drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">
                        Round-the-clock technical support ensures your business never stops, even outside regular hours.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-16 h-16 flex items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30">
                        <Award 
                          className="w-8 h-8 text-primary" 
                          strokeWidth={2}
                        />
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      <h4 className="text-xl font-semibold text-white drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]">Proven Track Record</h4>
                      <p className="text-white/95 drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">
                        With hundreds of satisfied clients, we have a proven track record of delivering results.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-16 h-16 flex items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30">
                        <Settings 
                          className="w-8 h-8 text-primary" 
                          strokeWidth={2}
                        />
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      <h4 className="text-xl font-semibold text-white drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]">Custom Solutions</h4>
                      <p className="text-white/95 drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">
                        We tailor our services to meet your specific business needs and requirements.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-16 h-16 flex items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30">
                        <DollarSign 
                          className="w-8 h-8 text-primary" 
                          strokeWidth={2}
                        />
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      <h4 className="text-xl font-semibold text-white drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]">Competitive Pricing</h4>
                      <p className="text-white/95 drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">
                        Transparent, competitive pricing with no hidden fees or surprises.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-16 h-16 flex items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30">
                        <Zap 
                          className="w-8 h-8 text-primary" 
                          strokeWidth={2}
                        />
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      <h4 className="text-xl font-semibold text-white drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]">Fast Response</h4>
                      <p className="text-white/95 drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">
                        Quick response times and rapid resolution of issues to minimize downtime.
                      </p>
                    </div>
                  </div>
                </div>
                <ScrollReveal>
                  {/* MANUAL HEADER POSITION CONTROL - Adjust right value to move header left (increase) or right (decrease) */}
                  {(() => {
                    const manualHeaderOffsetX = -60; // Move left (increase value) or right (decrease value) - adjust to position header horizontally
                    return (
                      <div className="mb-12 text-right" style={{ position: 'relative', right: `${-manualHeaderOffsetX}px` }}>
                        <h2 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl text-white drop-shadow-[0_0_15px_rgba(0,0,0,0.8)]" style={{ marginBottom: '25px' }}>Why <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0066ff] via-[#3b82f6] to-[#06b6d4]">Kecktech</span>?</h2>
                      </div>
                    );
                  })()}
                </ScrollReveal>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Contact Section */}
      <section id="contact" className="pb-20 md:pb-28 bg-transparent w-full relative z-10" style={{ marginTop: '325px' }}>
        <Container>
          <div className="w-full flex items-center justify-center">
            <div className="w-full max-w-7xl">
              <ScrollReveal>
                {/* MANUAL HEADER POSITION CONTROL - Adjust left value to move header left (decrease) or right (increase) */}
                {(() => {
                  const manualContactHeaderOffsetX = 30; // Move left (decrease value) or right (increase value) - adjust to position header horizontally
                  return (
                    <div className="mb-16 text-left" style={{ position: 'relative', left: `${manualContactHeaderOffsetX}px` }}>
                      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2" style={{ alignItems: 'flex-start' }}>
                        {/* Header Section */}
                        <div>
                          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl text-white drop-shadow-[0_0_15px_rgba(0,0,0,0.8)]" style={{ marginBottom: '25px' }}>
                            Contact <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0066ff] via-[#3b82f6] to-[#06b6d4]">Us</span>
                    </h2>
                        </div>

                        {/* Contact Information - Next to header, at top of section */}
                        <Card className="bg-transparent border-0 flex flex-col" style={{ marginTop: '-150px', alignSelf: 'flex-start' }}>
                          <CardHeader>
                            <CardTitle className="text-white drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]">Contact Information</CardTitle>
                            <CardDescription className="text-white/90 drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">
                              Reach out to us through any of these channels
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-6 flex-1">
                            <div className="flex items-start space-x-4">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Mail className="h-5 w-5" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-white drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">Email</h3>
                                <p className="text-white/95 drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">info@kecktech.com</p>
                                <p className="text-sm text-white/95 drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">support@kecktech.com</p>
                              </div>
                            </div>
                            <div className="flex items-start space-x-4">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Phone className="h-5 w-5" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-white drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">Phone</h3>
                                <p className="text-white/95 drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">(555) 123-4567</p>
                                <p className="text-sm text-white/95 drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">Available 24/7</p>
                              </div>
                            </div>
                            <div className="flex items-start space-x-4">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <MapPin className="h-5 w-5" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-white drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">Address</h3>
                                <p className="text-white/95 drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">
                                  123 Tech Street
                                  <br />
                                  Suite 100
                                  <br />
                                  City, State 12345
                                </p>
                              </div>
                            </div>
                            <div className="flex items-start space-x-4">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Clock className="h-5 w-5" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-white drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">Business Hours</h3>
                                <p className="text-white/95 drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">
                                  Monday - Friday: 9:00 AM - 6:00 PM
                                  <br />
                                  Saturday: 10:00 AM - 4:00 PM
                                  <br />
                                  Sunday: Closed
                                  <br />
                                  <span className="text-sm">24/7 Emergency Support Available</span>
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                  </div>
                  );
                })()}
              </ScrollReveal>
              
              {/* Centered "Have a question" and Send Message button */}
              <div className="w-full flex flex-col items-center justify-center mt-16">
                <p className="text-xl text-white/95 drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] text-center" style={{ marginBottom: '25px' }}>
                  Have a question or need assistance? We're here to help.
                </p>
                <div className="w-full max-w-md">
                  <CollapsibleContactForm />
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
