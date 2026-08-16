"use client";

import React from "react";
import CircuitBackground16 from "@/components/ui/CircuitBackground16";
import { Container } from "@/components/ui/container";
import { ExpandableServiceCard } from "@/components/expandable-service-card";
import { ScrollReveal } from "@/components/animations/scroll-reveal";
import { Button } from "@/components/ui/button";

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

export default function ServicesDemoPage() {
  return (
    <div className="min-h-screen relative">
      {/* Circuit Background */}
      <div className="fixed inset-0 z-0">
        <CircuitBackground16 />
      </div>

      {/* Services Section */}
      <section className="py-20 md:py-28 bg-[rgba(5,5,10,0.98)] w-full relative z-10 min-h-screen">
        <Container>
          <div className="w-full flex flex-col gap-12">
            {/* Header and Subheading - Above cards */}
            <div className="w-full">
              <ScrollReveal>
                <div>
                  <div className="text-right mb-6">
                    <h2 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl text-white drop-shadow-[0_0_15px_rgba(0,0,0,0.8)]">
                      Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0066ff] via-[#3b82f6] to-[#06b6d4]">Services</span>
                    </h2>
                  </div>
                  <div className="text-center">
                    <p className="text-xl text-white/95 drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]">
                      Comprehensive IT solutions tailored to your business needs
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            </div>

            {/* Service Cards - Single Row */}
            <div className="w-full">
              <div className="flex flex-wrap justify-center gap-6 mb-16">
                {services.map((service, index) => (
                  <ExpandableServiceCard
                    key={service.slug}
                    iconName={service.icon}
                    title={service.title}
                    description={service.description}
                    index={index}
                    slug={service.slug}
                    backgroundImage={service.backgroundImage}
                  />
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}

