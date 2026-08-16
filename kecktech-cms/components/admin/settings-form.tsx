"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface SettingsFormProps {
  initialValues: {
    site_name: string;
    site_url: string;
    default_author: string;
  };
}

export function SettingsForm({ initialValues }: SettingsFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [values, setValues] = useState(initialValues);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to save settings");
      }
      const saved = await response.json();
      setValues(saved);
      toast({
        title: "Settings saved",
        description: "Site settings have been updated.",
      });
      router.refresh();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to save settings.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="site_name">Site name</Label>
        <Input
          id="site_name"
          value={values.site_name}
          onChange={(e) =>
            setValues((v) => ({ ...v, site_name: e.target.value }))
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="site_url">Site URL</Label>
        <Input
          id="site_url"
          value={values.site_url}
          onChange={(e) =>
            setValues((v) => ({ ...v, site_url: e.target.value }))
          }
          placeholder="https://kecktech.net"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="default_author">Default author</Label>
        <Input
          id="default_author"
          value={values.default_author}
          onChange={(e) =>
            setValues((v) => ({ ...v, default_author: e.target.value }))
          }
        />
      </div>
      <Button type="submit" disabled={isSubmitting}>
        <Save className="mr-2 h-4 w-4" />
        {isSubmitting ? "Saving..." : "Save settings"}
      </Button>
    </form>
  );
}
