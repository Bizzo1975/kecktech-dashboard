"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { slugify, textareaClassName } from "@/lib/cms";

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

export default function NewPostPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<PostFormValues>({
    resolver: zodResolver(postFormSchema),
    defaultValues: {
      status: "draft",
      author: "Kecktech",
    },
  });

  const status = watch("status");

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

      const response = await fetch("/api/admin/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create post");
      }

      toast({
        title: "Post created",
        description: "The post has been successfully created.",
      });
      router.push("/admin/posts");
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to create post. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost">
          <Link href="/admin/posts">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Posts
          </Link>
        </Button>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">New Post</h1>
        <p className="text-muted-foreground">Create a new blog post</p>
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
                    onChange={(e) => {
                      register("title").onChange(e);
                      setValue("slug", slugify(e.target.value));
                    }}
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
                    placeholder="Write your post in markdown..."
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
                    onValueChange={(value) =>
                      setValue(
                        "status",
                        value as "draft" | "scheduled" | "published"
                      )
                    }
                    defaultValue="draft"
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
                  <Input
                    id="tags"
                    {...register("tags")}
                    placeholder="news, product, update"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="author">Author</Label>
                  <Input id="author" {...register("author")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="featuredImage">Featured image URL</Label>
                  <Input
                    id="featuredImage"
                    {...register("featuredImage")}
                    placeholder="/uploads/... or https://..."
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                <Save className="mr-2 h-4 w-4" />
                {isSubmitting ? "Creating..." : "Create Post"}
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
