"use client";

import React from "react";
import Image from "next/image";
import CircuitBackground16 from "@/components/ui/CircuitBackground16";
import { Container } from "@/components/ui/container";
import { ScrollReveal } from "@/components/animations/scroll-reveal";
import { FlipValueCard } from "@/components/flip-value-card";

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

export default function AboutDemoPage() {
  return (
    <div className="min-h-screen relative">
      {/* Circuit Background */}
      <div className="fixed inset-0 z-0">
        <CircuitBackground16 />
      </div>

      {/* About Section */}
      <section className="py-20 md:py-28 bg-[rgba(5,5,10,0.98)] w-full relative z-10 min-h-screen">
        <Container>
          <div className="w-full flex items-center justify-center">
            <div className="w-full max-w-7xl">
              <ScrollReveal>
                <div className="mb-16 text-left">
                  <h2 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl text-white drop-shadow-[0_0_15px_rgba(0,0,0,0.8)]">
                    About <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0066ff] via-[#3b82f6] to-[#06b6d4]">Kecktech</span>
                  </h2>
                  <p className="text-xl text-white/95 drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]">
                    Your trusted partner for professional IT services and support
                  </p>
                </div>
              </ScrollReveal>

              {/* Company Story */}
              <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 mb-16 mt-12">
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
                <div className="flex items-center justify-center">
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
              <div className="mb-16">
                <div className="mb-12 flex flex-col items-center">
                  <h3 className="mb-4 text-3xl font-bold tracking-tight text-white drop-shadow-[0_0_12px_rgba(0,0,0,0.8)] text-center">Our Values</h3>
                  <p className="max-w-2xl text-white/95 drop-shadow-[0_0_8px_rgba(0,0,0,0.8)] text-center">
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
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}

