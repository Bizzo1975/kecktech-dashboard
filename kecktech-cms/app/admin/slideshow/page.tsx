"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Save } from "lucide-react";
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

type Slide = {
  id: string;
  title: string | null;
  imageUrl: string;
  altText: string | null;
  linkUrl: string | null;
  order: number;
  active: boolean;
};

export default function SlideshowAdminPage() {
  const { toast } = useToast();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [title, setTitle] = useState("");
  const [altText, setAltText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const res = await fetch("/api/admin/slideshow");
    if (!res.ok) throw new Error("Failed to load slides");
    setSlides(await res.json());
  };

  useEffect(() => {
    load().catch(() =>
      toast({
        title: "Error",
        description: "Could not load slideshow.",
        variant: "destructive",
      })
    );
  }, [toast]);

  const addSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/admin/slideshow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl,
          title: title || null,
          altText: altText || null,
          order: slides.length,
          active: true,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Create failed");
      }
      setImageUrl("");
      setTitle("");
      setAltText("");
      await load();
      toast({ title: "Slide added" });
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to add slide.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this slide?")) return;
    const res = await fetch(`/api/admin/slideshow/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast({
        title: "Error",
        description: "Delete failed.",
        variant: "destructive",
      });
      return;
    }
    await load();
  };

  const toggleActive = async (slide: Slide) => {
    const res = await fetch(`/api/admin/slideshow/${slide.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !slide.active }),
    });
    if (res.ok) await load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Slideshow</h1>
        <p className="text-muted-foreground">
          Simple slide CRUD. Public JSON at{" "}
          <code className="text-xs">/api/slideshow</code>.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add slide</CardTitle>
          <CardDescription>Image URL from Media library or absolute URL</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={addSlide} className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="imageUrl">Image URL *</Label>
              <Input
                id="imageUrl"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                required
                placeholder="/uploads/hero.jpg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="altText">Alt text</Label>
              <Input
                id="altText"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={busy}>
                <Plus className="mr-2 h-4 w-4" />
                Add slide
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {slides.length === 0 ? (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="py-10 text-center text-muted-foreground">
              No slides yet.
            </CardContent>
          </Card>
        ) : (
          slides.map((slide) => (
            <Card key={slide.id}>
              <CardHeader>
                <CardTitle className="text-base line-clamp-1">
                  {slide.title || "Untitled"}
                </CardTitle>
                <CardDescription className="truncate">{slide.imageUrl}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slide.imageUrl}
                  alt={slide.altText || slide.title || "Slide"}
                  className="h-32 w-full rounded object-cover bg-muted"
                />
                <div className="flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => toggleActive(slide)}
                  >
                    <Save className="mr-1 h-3 w-3" />
                    {slide.active ? "Active" : "Inactive"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => remove(slide.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
