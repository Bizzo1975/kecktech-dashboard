"use client";

import React, { useState } from "react";
import CircuitBackground16 from "@/components/ui/CircuitBackground16";
import { Container } from "@/components/ui/container";
import { ScrollReveal } from "@/components/animations/scroll-reveal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, Clock, Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";

const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  subject: z.string().min(3, "Subject must be at least 3 characters"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

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
          <Label htmlFor="name" className="text-white drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">Name *</Label>
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
            <p className="text-sm text-green-600 dark:text-green-400">
              ✓ Valid
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-white drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">Email *</Label>
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
            <p className="text-sm text-green-600 dark:text-green-400">
              ✓ Valid
            </p>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone" className="text-white drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">Phone (Optional)</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="(555) 123-4567"
          {...register("phone")}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="subject" className="text-white drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">Subject *</Label>
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
          <p className="text-sm text-green-600 dark:text-green-400">
            ✓ Valid
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="message" className="text-white drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">Message *</Label>
        <textarea
          id="message"
          rows={6}
          placeholder="Tell us about your project or question..."
          {...register("message")}
          className={
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 " +
            (errors.message
              ? "border-destructive focus-visible:ring-destructive"
              : touchedFields.message && !errors.message
              ? "border-green-500 focus-visible:ring-green-500"
              : "")
          }
        />
        {errors.message && (
          <p className="text-sm text-destructive animate-in fade-in slide-in-from-top-1">
            {errors.message.message}
          </p>
        )}
        {touchedFields.message && !errors.message && (
          <p className="text-sm text-green-600 dark:text-green-400">
            ✓ Valid
          </p>
        )}
      </div>
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full mt-auto"
        size="lg"
      >
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

export default function ContactDemoPage() {
  return (
    <div className="min-h-screen relative">
      {/* Circuit Background */}
      <div className="fixed inset-0 z-0">
        <CircuitBackground16 />
      </div>

      {/* Contact Section */}
      <section className="py-20 md:py-28 bg-[rgba(5,5,10,0.98)] w-full relative z-10 min-h-screen">
        <Container>
          <div className="w-full flex items-center justify-center">
            <div className="w-full max-w-7xl">
              <ScrollReveal>
                <div className="mb-16 text-left">
                  <h2 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl text-white drop-shadow-[0_0_15px_rgba(0,0,0,0.8)]">
                    Contact <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0066ff] via-[#3b82f6] to-[#06b6d4]">Us</span>
                  </h2>
                  <p className="mb-6 text-xl text-white/95 drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]">
                    Have a question or need assistance? We're here to help.
                  </p>
                </div>
              </ScrollReveal>

              <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-stretch">
                {/* Contact Form */}
                <Card className="bg-card/80 backdrop-blur-sm flex flex-col h-full">
                  <CardHeader>
                    <CardTitle className="text-white drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]">Send us a message</CardTitle>
                    <CardDescription className="text-white/90 drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">
                      Fill out the form below and we'll get back to you within 24 hours.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-6 flex-1 flex flex-col">
                    <ContactForm />
                  </CardContent>
                </Card>

                {/* Contact Information */}
                <Card className="bg-card/80 backdrop-blur-sm flex flex-col h-full">
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
          </div>
        </Container>
      </section>
    </div>
  );
}

