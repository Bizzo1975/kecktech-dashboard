"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { textareaClassName } from "@/lib/cms";

const pageFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  content: z.string().min(1, "Content is required"),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  published: z.boolean().default(true),
});

type PageFormValues = z.infer<typeof pageFormSchema>;

type Props = {
  slug: string;
  heading: string;
  description: string;
  /** Pre-created page id from server ensurePageBySlug */
  pageId: string;
};

export function PageBySlugEditor({ slug, heading, description, pageId }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<PageFormValues>({
    resolver: zodResolver(pageFormSchema),
    defaultValues: {
      slug,
      published: true,
      title: heading,
      content: "{}",
    },
  });

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`/api/admin/pages/${pageId}`);
        if (!response.ok) throw new Error("Failed to fetch page");
        const page = await response.json();
        setValue("title", page.title);
        setValue("slug", page.slug);
        setValue("content", page.content || "{}");
        setValue("metaTitle", page.metaTitle || "");
        setValue("metaDescription", page.metaDescription || "");
        setValue("published", page.published);
      } catch {
        toast({
          title: "Error",
          description: "Failed to load page. Please try again.",
          variant: "destructive",
        });
        router.push("/admin/pages");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [pageId, router, setValue, toast]);

  const onSubmit = async (data: PageFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/pages/${pageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, slug }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update page");
      }
      toast({
        title: "Page saved",
        description: `${heading} content updated. Astro reads published JSON from /api/pages/${slug}.`,
      });
      router.refresh();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update page. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading {heading}…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost">
          <Link href="/admin/pages">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Pages
          </Link>
        </Button>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">{heading}</h1>
        <p className="text-muted-foreground">{description}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Content should be JSON matching Astro{" "}
          <code className="rounded bg-muted px-1">src/data/{slug}.json</code>.
          Nav/demos chrome stays in Astro.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Content (JSON)</CardTitle>
                <CardDescription>
                  Published pages are served at{" "}
                  <code className="text-xs">/api/pages/{slug}</code>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    {...register("title")}
                    className={errors.title ? "border-destructive" : ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">JSON body *</Label>
                  <textarea
                    id="content"
                    rows={20}
                    {...register("content")}
                    className={textareaClassName + " font-mono text-xs"}
                  />
                  {errors.content && (
                    <p className="text-sm text-destructive">
                      {errors.content.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>SEO</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="metaTitle">Meta title</Label>
                  <Input id="metaTitle" {...register("metaTitle")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="metaDescription">Meta description</Label>
                  <textarea
                    id="metaDescription"
                    rows={3}
                    {...register("metaDescription")}
                    className={textareaClassName}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="published"
                    {...register("published")}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="published">Published</Label>
                </div>
                <input type="hidden" {...register("slug")} value={slug} />
              </CardContent>
            </Card>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              <Save className="mr-2 h-4 w-4" />
              {isSubmitting ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
