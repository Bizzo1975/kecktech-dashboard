"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { LogIn, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  totp: z.string().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function AdminLoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        totp: data.totp || "",
        redirect: false,
        callbackUrl: "/admin",
      });

      if (result?.error) {
        toast({
          title: "Login failed",
          description: result.error === "CredentialsSignin" 
            ? "Invalid email, password, or authenticator code. Please try again."
            : "An error occurred during login. Please try again.",
          variant: "destructive",
        });
      } else if (result?.ok) {
        toast({
          title: "Welcome back!",
          description: "You have been successfully logged in.",
        });
        router.push("/admin");
        router.refresh();
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Error",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)] w-full flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-12 px-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-2 border-primary/20">
          <CardHeader className="text-center space-y-4 pb-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary shadow-lg">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold mb-2">Admin Login</CardTitle>
              <CardDescription className="text-base">
                Enter your credentials to access the admin dashboard
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@kecktech.com"
                  {...register("email")}
                  className={`h-11 ${errors.email ? "border-destructive focus-visible:ring-destructive" : "border-border"}`}
                  disabled={isLoading}
                  autoComplete="email"
                />
                {errors.email && (
                  <p className="text-sm text-destructive font-medium">{errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  {...register("password")}
                  className={`h-11 ${errors.password ? "border-destructive focus-visible:ring-destructive" : "border-border"}`}
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                {errors.password && (
                  <p className="text-sm text-destructive font-medium">{errors.password.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="totp" className="text-sm font-semibold">
                  Authenticator code <span className="font-normal text-muted-foreground">(if 2FA enabled)</span>
                </Label>
                <Input
                  id="totp"
                  type="text"
                  inputMode="numeric"
                  placeholder="6-digit code"
                  {...register("totp")}
                  className="h-11 border-border"
                  disabled={isLoading}
                  autoComplete="one-time-code"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-11 text-base font-semibold shadow-lg hover:shadow-xl transition-shadow" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-5 w-5" />
                    Sign In
                  </>
                )}
              </Button>
            </form>
            <div className="mt-6 pt-6 border-t">
              <p className="text-xs text-center text-muted-foreground">
                Default credentials: admin@kecktech.com / admin123
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
