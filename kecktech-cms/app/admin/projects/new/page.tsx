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

const projectFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional(),
  content: z.string().optional(),
  image: z.string().optional(),
  liveDemo: z.string().optional(),
  sourceCode: z.string().optional(),
  contactEmail: z.string().optional(),
  technologies: z.string().optional(),
  featured: z.boolean().default(false),
  available: z.boolean().default(true),
  status: z.enum(["draft", "published", "archived"]).default("published"),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

export default function NewProjectPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      status: "published",
      featured: false,
      available: true,
    },
  });

  const onSubmit = async (data: ProjectFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create project");
      }

      toast({
        title: "Project created",
        description: "The project has been created and demos sync attempted.",
      });
      router.push("/admin/projects");
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to create project. Please try again.",
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
          <Link href="/admin/projects">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Link>
        </Button>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">New Project</h1>
        <p className="text-muted-foreground">Create a demo / portfolio project</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Project details</CardDescription>
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
                  <Label htmlFor="description">Description</Label>
                  <textarea
                    id="description"
                    rows={3}
                    {...register("description")}
                    className={textareaClassName}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <textarea
                    id="content"
                    rows={10}
                    {...register("content")}
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
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    onValueChange={(value) =>
                      setValue(
                        "status",
                        value as "draft" | "published" | "archived"
                      )
                    }
                    defaultValue="published"
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="image">Image URL</Label>
                  <Input id="image" {...register("image")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="liveDemo">Live demo URL</Label>
                  <Input id="liveDemo" {...register("liveDemo")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sourceCode">Source code URL</Label>
                  <Input id="sourceCode" {...register("sourceCode")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact email</Label>
                  <Input id="contactEmail" {...register("contactEmail")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="technologies">
                    Technologies (comma-separated)
                  </Label>
                  <Input
                    id="technologies"
                    {...register("technologies")}
                    placeholder="Next.js, Prisma, SQLite"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="featured"
                    {...register("featured")}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="featured">Featured</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="available"
                    {...register("available")}
                    className="h-4 w-4 rounded border-gray-300"
                    defaultChecked
                  />
                  <Label htmlFor="available">Available</Label>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                <Save className="mr-2 h-4 w-4" />
                {isSubmitting ? "Creating..." : "Create Project"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/projects">Cancel</Link>
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
