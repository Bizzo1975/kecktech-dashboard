"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { joinStringArray, textareaClassName } from "@/lib/cms";

const postFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  excerpt: z.string().optional(),
  content: z.string().min(1, "Content is required"),
  tags: z.string().optional(),
  author: z.string().optional(),
  status: z.enum(["draft", "scheduled", "published"]).default("draft"),
  featuredImage: z.string().optional(),
  scheduledPublishAt: z.string().optional(),
});

type PostFormValues = z.infer<typeof postFormSchema>;

function toLocalInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EditPostPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<PostFormValues>({
    resolver: zodResolver(postFormSchema),
  });

  const status = watch("status");

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await fetch(`/api/admin/posts/${id}`);
        if (!response.ok) throw new Error("Failed to fetch post");
        const post = await response.json();
        setValue("title", post.title);
        setValue("slug", post.slug);
        setValue("excerpt", post.excerpt || "");
        setValue("content", post.content || "");
        setValue("tags", joinStringArray(post.tags));
        setValue("author", post.author || "Kecktech");
        setValue("status", post.status);
        setValue("featuredImage", post.featuredImage || "");
        setValue(
          "scheduledPublishAt",
          toLocalInputValue(post.scheduledPublishAt)
        );
      } catch {
        toast({
          title: "Error",
          description: "Failed to load post. Please try again.",
          variant: "destructive",
        });
        router.push("/admin/posts");
      } finally {
        setIsLoading(false);
      }
    };
    fetchPost();
  }, [id, setValue, router, toast]);

  const onSubmit = async (data: PostFormValues) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        featuredImage: data.featuredImage || null,
        scheduledPublishAt:
          data.status === "scheduled" && data.scheduledPublishAt
            ? new Date(data.scheduledPublishAt).toISOString()
            : null,
      };

      const response = await fetch(`/api/admin/posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update post");
      }

      toast({
        title: "Post updated",
        description: "The post has been successfully updated.",
      });
      router.push("/admin/posts");
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update post. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost">
          <Link href="/admin/posts">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Posts
          </Link>
        </Button>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Edit Post</h1>
        <p className="text-muted-foreground">Update post information</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Content</CardTitle>
                <CardDescription>Post body and details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    {...register("title")}
                    className={errors.title ? "border-destructive" : ""}
                  />
                  {errors.title && (
                    <p className="text-sm text-destructive">
                      {errors.title.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug *</Label>
                  <Input
                    id="slug"
                    {...register("slug")}
                    className={errors.slug ? "border-destructive" : ""}
                  />
                  {errors.slug && (
                    <p className="text-sm text-destructive">
                      {errors.slug.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="excerpt">Excerpt</Label>
                  <textarea
                    id="excerpt"
                    rows={3}
                    {...register("excerpt")}
                    className={textareaClassName}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Content (Markdown) *</Label>
                  <textarea
                    id="content"
                    rows={14}
                    {...register("content")}
                    className={textareaClassName}
                  />
                  {errors.content && (
                    <p className="text-sm text-destructive">
                      {errors.content.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={status || "draft"}
                    onValueChange={(value) =>
                      setValue(
                        "status",
                        value as "draft" | "scheduled" | "published"
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {status === "scheduled" && (
                  <div className="space-y-2">
                    <Label htmlFor="scheduledPublishAt">
                      Scheduled publish at *
                    </Label>
                    <Input
                      id="scheduledPublishAt"
                      type="datetime-local"
                      {...register("scheduledPublishAt")}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input id="tags" {...register("tags")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="author">Author</Label>
                  <Input id="author" {...register("author")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="featuredImage">Featured image URL</Label>
                  <Input id="featuredImage" {...register("featuredImage")} />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                <Save className="mr-2 h-4 w-4" />
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/posts">Cancel</Link>
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
