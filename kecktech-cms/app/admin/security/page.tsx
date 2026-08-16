"use client";

import { useEffect, useState } from "react";
import { Shield, KeyRound, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type SecurityState = {
  twoFactorEnabled: boolean;
  hasSecret: boolean;
  setupUri: string | null;
  secretPreview: string | null;
};

export default function SecurityAdminPage() {
  const { toast } = useToast();
  const [state, setState] = useState<SecurityState | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [setupUri, setSetupUri] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const res = await fetch("/api/admin/security");
    if (!res.ok) throw new Error("Failed to load security settings");
    const data = await res.json();
    setState(data);
    setSecret(data.secretPreview);
    setSetupUri(data.setupUri);
  };

  useEffect(() => {
    load().catch(() => {
      toast({
        title: "Error",
        description: "Could not load 2FA settings.",
        variant: "destructive",
      });
    });
  }, [toast]);

  const post = async (action: "generate" | "enable" | "disable") => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, token: token || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      if (action === "generate") {
        setSecret(data.secret);
        setSetupUri(data.setupUri);
      }
      setToken("");
      await load();
      toast({
        title: "Updated",
        description:
          action === "generate"
            ? "Secret generated — add it to your authenticator, then enable."
            : action === "enable"
              ? "Two-factor authentication enabled."
              : "Two-factor authentication disabled.",
      });
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Security update failed.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  if (!state) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading security…
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Security & 2FA</h1>
        <p className="text-muted-foreground">
          Pragmatic TOTP for your admin account. Enter the authenticator code on
          login when enabled.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle>Two-factor authentication</CardTitle>
          </div>
          <CardDescription>
            Status:{" "}
            <span className="font-medium">
              {state.twoFactorEnabled ? "Enabled" : "Disabled"}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!state.twoFactorEnabled && (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => post("generate")}
              >
                <KeyRound className="mr-2 h-4 w-4" />
                {secret ? "Regenerate secret" : "Generate authenticator secret"}
              </Button>
              {secret && (
                <div className="rounded-md border bg-muted/40 p-3 space-y-2 text-sm">
                  <p className="font-medium">Manual entry secret</p>
                  <code className="block break-all text-xs">{secret}</code>
                  {setupUri && (
                    <p className="text-xs text-muted-foreground break-all">
                      otpauth URI: {setupUri}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Add this secret in Google Authenticator / 1Password / etc.,
                    then enter a code below and click Enable.
                  </p>
                </div>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="token">Authenticator code</Label>
            <Input
              id="token"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6-digit code"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {!state.twoFactorEnabled ? (
              <Button
                type="button"
                disabled={busy || !secret}
                onClick={() => post("enable")}
              >
                Enable 2FA
              </Button>
            ) : (
              <Button
                type="button"
                variant="destructive"
                disabled={busy}
                onClick={() => post("disable")}
              >
                Disable 2FA
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
