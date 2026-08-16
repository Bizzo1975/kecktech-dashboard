"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, Home, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="space-y-6">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="h-8 w-8" />
          </div>
        </div>
        <div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Something went wrong!
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            We're sorry, but something unexpected happened. Please try again.
          </p>
          {error.digest && (
            <p className="mt-2 text-sm text-muted-foreground">
              Error ID: {error.digest}
            </p>
          )}
        </div>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button onClick={reset} size="lg">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Link>
          </Button>
        </div>
      </div>
    </Container>
  );
}

