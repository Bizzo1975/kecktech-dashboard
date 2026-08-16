"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { Mail, Phone, MapPin, Send, Clock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { siteConfig } from "@/lib/constants";

const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  subject: z.string().min(3, "Subject must be at least 3 characters"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

export default function ContactPage() {
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
    mode: "onChange", // Enable real-time validation
  });

  // Watch form values for real-time feedback
  const watchedValues = watch();

  const onSubmit = async (data: ContactFormValues) => {
    setIsSubmitting(true);
    try {
      // TODO: Implement API endpoint for form submission
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call

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
    <div className="flex flex-col relative z-10 bg-background/95 backdrop-blur-sm min-h-screen">
      {/* Back Button */}
      <Container className="pt-8">
        <Button asChild variant="ghost" className="mb-4">
          <Link href="/#contact">
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
                Get In Touch
              </h1>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                Have a question or need assistance? We're here to help.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* Contact Section */}
      <section className="py-16 md:py-24">
        <Container>
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            {/* Contact Form */}
            <Card>
              <CardHeader>
                <CardTitle>Send us a message</CardTitle>
                <CardDescription>
                  Fill out the form below and we'll get back to you within 24 hours.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                    <p className="text-sm text-green-600 dark:text-green-400">
                      ✓ Valid
                    </p>
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
                    <p className="text-sm text-green-600 dark:text-green-400">
                      ✓ Valid email
                    </p>
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
                    <p className="text-sm text-green-600 dark:text-green-400">
                      ✓ Valid
                    </p>
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
                    <p className="text-sm text-green-600 dark:text-green-400">
                      ✓ Valid message
                    </p>
                  )}
                </div>
                  <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Sending...
                      </>
                    ) : (
                      <>
                        Send Message
                        <Send className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                  <CardDescription>
                    Reach out to us through any of these channels
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Email</h3>
                      <p className="text-muted-foreground">info@kecktech.com</p>
                      <p className="text-sm text-muted-foreground">support@kecktech.com</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Phone</h3>
                      <p className="text-muted-foreground">(555) 123-4567</p>
                      <p className="text-sm text-muted-foreground">Available 24/7</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Address</h3>
                      <p className="text-muted-foreground">
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
                      <h3 className="font-semibold">Business Hours</h3>
                      <p className="text-muted-foreground">
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

              {/* Map Placeholder */}
              <Card>
                <CardContent className="p-0">
                  <div className="flex h-64 items-center justify-center bg-muted">
                    <p className="text-sm text-muted-foreground">
                      Map integration can be added here
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}

