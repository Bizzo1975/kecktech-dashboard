"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export default function NotFound() {
  const router = useRouter();

  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="space-y-6">
        <div>
          <h1 className="text-9xl font-bold text-primary">404</h1>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Page Not Found
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Sorry, we couldn't find the page you're looking for.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Link>
          </Button>
          <Button variant="outline" size="lg" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    </Container>
  );
}
