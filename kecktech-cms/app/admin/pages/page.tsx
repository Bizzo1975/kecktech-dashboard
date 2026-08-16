import Link from "next/link";
import { Plus, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { DeleteEntityButton } from "@/components/admin/delete-entity-button";

export default async function PagesAdminPage() {
  const pages = await prisma.page.findMany({
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pages</h1>
          <p className="text-muted-foreground">Manage CMS pages</p>
        </div>
        <Button asChild>
          <Link href="/admin/pages/new">
            <Plus className="mr-2 h-4 w-4" />
            New Page
          </Link>
        </Button>
      </div>

      {pages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No pages found</p>
            <Button asChild>
              <Link href="/admin/pages/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Page
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pages.map((page) => (
            <Card key={page.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="line-clamp-1">{page.title}</CardTitle>
                    <CardDescription className="mt-1">
                      /{page.slug}
                    </CardDescription>
                  </div>
                  <span
                    className={`ml-2 rounded-full px-2 py-1 text-xs font-medium ${
                      page.published
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                    }`}
                  >
                    {page.published ? "published" : "draft"}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {page.metaDescription || "No meta description"}
                </p>
                <div className="flex items-center justify-between">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/admin/pages/${page.id}/edit`}>
                      <Edit className="h-4 w-4" />
                    </Link>
                  </Button>
                  <DeleteEntityButton
                    endpoint={`/api/admin/pages/${page.id}`}
                    entityLabel="Page"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
