"use client";

import React from "react";
import CircuitBackground16 from "@/components/ui/CircuitBackground16";
import { Container } from "@/components/ui/container";
import { ScrollReveal } from "@/components/animations/scroll-reveal";
import { Users, Clock, Award, Settings, DollarSign, Zap } from "lucide-react";

// Benefit items with appropriate icons
const benefitIcons = [
  {
    title: "Expert Team",
    icon: Users,
    description: "Our certified professionals bring years of experience and stay current with the latest technologies."
  },
  {
    title: "24/7 Support",
    icon: Clock,
    description: "Round-the-clock technical support ensures your business never stops, even outside regular hours."
  },
  {
    title: "Proven Track Record",
    icon: Award,
    description: "With hundreds of satisfied clients, we have a proven track record of delivering results."
  },
  {
    title: "Custom Solutions",
    icon: Settings,
    description: "We tailor our services to meet your specific business needs and requirements."
  },
  {
    title: "Competitive Pricing",
    icon: DollarSign,
    description: "Transparent, competitive pricing with no hidden fees or surprises."
  },
  {
    title: "Fast Response",
    icon: Zap,
    description: "Quick response times and rapid resolution of issues to minimize downtime."
  },
];

export default function WhyChooseDemoPage() {
  return (
    <div className="min-h-screen relative">
      {/* Circuit Background */}
      <div className="fixed inset-0 z-0">
        <CircuitBackground16 />
      </div>

      {/* Why Choose Kecktech Section */}
      <section className="py-20 md:py-28 bg-[rgba(5,5,10,0.98)] w-full relative z-10 min-h-screen">
        <Container>
          <div className="w-full flex items-center justify-center">
            <div className="w-full max-w-7xl">
              <ScrollReveal>
                <div className="mb-12 text-right">
                  <h2 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl text-white drop-shadow-[0_0_15px_rgba(0,0,0,0.8)]">Why <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0066ff] via-[#3b82f6] to-[#06b6d4]">Kecktech</span>?</h2>
                </div>
              </ScrollReveal>
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                {benefitIcons.map((benefit, index) => {
                  const IconComponent = benefit.icon;
                  return (
                    <div key={index} className="space-y-2 flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-16 h-16 flex items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30">
                          <IconComponent 
                            className="w-8 h-8 text-primary" 
                            strokeWidth={2}
                          />
                        </div>
                      </div>
                      <div className="flex-1 space-y-2">
                        <h4 className="text-xl font-semibold text-white drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]">{benefit.title}</h4>
                        <p className="text-white/95 drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">
                          {benefit.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}

