import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ServicePreviewPage({
  params,
}: {
  params: { id: string };
}) {
  const service = await prisma.service.findUnique({
    where: { id: params.id },
    include: {
      category: true,
    },
  });

  if (!service) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <Container>
        <div className="py-8">
          <Button asChild variant="ghost" className="mb-8">
            <Link href={`/admin/services/${params.id}/edit`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Edit
            </Link>
          </Button>

          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-4">{service.title}</h1>
              {service.category && (
                <p className="text-muted-foreground mb-4">
                  Category: {service.category.name}
                </p>
              )}
              <p className="text-lg text-muted-foreground">{service.description}</p>
            </div>

            {service.image && (
              <div className="relative h-64 w-full overflow-hidden rounded-lg bg-muted">
                <img
                  src={service.image}
                  alt={service.title}
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            {service.content && (
              <Card>
                <CardHeader>
                  <CardTitle>Full Content</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: service.content }}
                  />
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <span className="font-semibold">Status: </span>
                    <span className="capitalize">{service.status}</span>
                  </div>
                  {service.price && (
                    <div>
                      <span className="font-semibold">Price: </span>
                      <span>{service.price}</span>
                    </div>
                  )}
                  <div>
                    <span className="font-semibold">Featured: </span>
                    <span>{service.featured ? "Yes" : "No"}</span>
                  </div>
                  <div>
                    <span className="font-semibold">Display Order: </span>
                    <span>{service.order}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>SEO</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <span className="font-semibold">Meta Title: </span>
                    <span>{service.metaTitle || "Not set"}</span>
                  </div>
                  <div>
                    <span className="font-semibold">Meta Description: </span>
                    <span className="text-sm text-muted-foreground">
                      {service.metaDescription || "Not set"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}

