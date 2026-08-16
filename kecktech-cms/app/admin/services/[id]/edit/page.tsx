"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

const serviceFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().min(1, "Description is required"),
  content: z.string().optional(),
  categoryId: z.string().optional(),
  price: z.string().optional(),
  image: z.string().optional(),
  featured: z.boolean().optional().default(false),
  status: z.enum(["active", "coming-soon", "archived"]).optional().default("active"),
  order: z.number().optional().default(0),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

export default function EditServicePage({ params }: { params: { id: string } }) {
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
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
  });

  useEffect(() => {
    const fetchService = async () => {
      try {
        const response = await fetch(`/api/services/${params.id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch service");
        }
        const service = await response.json();
        
        setValue("title", service.title);
        setValue("slug", service.slug);
        setValue("description", service.description);
        setValue("content", service.content || "");
        setValue("categoryId", service.categoryId || "");
        setValue("price", service.price || "");
        setValue("image", service.image || "");
        setValue("featured", service.featured);
        setValue("status", service.status);
        setValue("order", service.order);
        setValue("metaTitle", service.metaTitle || "");
        setValue("metaDescription", service.metaDescription || "");
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load service. Please try again.",
          variant: "destructive",
        });
        router.push("/admin/services");
      } finally {
        setIsLoading(false);
      }
    };

    fetchService();
  }, [params.id, setValue, router, toast]);

  const onSubmit = async (data: ServiceFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/services/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update service");
      }

      toast({
        title: "Service updated",
        description: "The service has been successfully updated.",
      });
      router.push("/admin/services");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update service. Please try again.",
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
      <div className="flex items-center justify-between">
        <div>
          <Button asChild variant="ghost">
            <Link href="/admin/services">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Services
            </Link>
          </Button>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">Edit Service</h1>
          <p className="text-muted-foreground">Update service information</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Enter the service details</CardDescription>
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
                    <p className="text-sm text-destructive">{errors.title.message}</p>
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
                    <p className="text-sm text-destructive">{errors.slug.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <textarea
                    id="description"
                    rows={3}
                    {...register("description")}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  {errors.description && (
                    <p className="text-sm text-destructive">{errors.description.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Full Content</Label>
                  <textarea
                    id="content"
                    rows={10}
                    {...register("content")}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Detailed description of the service..."
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>SEO</CardTitle>
                <CardDescription>Search engine optimization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="metaTitle">Meta Title</Label>
                  <Input id="metaTitle" {...register("metaTitle")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="metaDescription">Meta Description</Label>
                  <textarea
                    id="metaDescription"
                    rows={3}
                    {...register("metaDescription")}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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
                      setValue("status", value as "active" | "coming-soon" | "archived")
                    }
                    defaultValue={watch("status") || "active"}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="coming-soon">Coming Soon</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price</Label>
                  <Input id="price" {...register("price")} placeholder="e.g., $99/month" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="image">Image URL</Label>
                  <Input id="image" {...register("image")} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="order">Display Order</Label>
                  <Input
                    id="order"
                    type="number"
                    {...register("order", { valueAsNumber: true })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="featured"
                    {...register("featured")}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="featured">Featured Service</Label>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                <Save className="mr-2 h-4 w-4" />
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/services">Cancel</Link>
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

