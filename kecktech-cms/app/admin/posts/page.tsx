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
import { joinStringArray } from "@/lib/cms";

export default async function PostsPage() {
  const posts = await prisma.post.findMany({
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Posts</h1>
          <p className="text-muted-foreground">Manage blog posts</p>
        </div>
        <Button asChild>
          <Link href="/admin/posts/new">
            <Plus className="mr-2 h-4 w-4" />
            New Post
          </Link>
        </Button>
      </div>

      {posts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No posts found</p>
            <Button asChild>
              <Link href="/admin/posts/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Post
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Card key={post.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="line-clamp-1">{post.title}</CardTitle>
                    <CardDescription className="mt-1">
                      /{post.slug}
                    </CardDescription>
                  </div>
                  <span
                    className={`ml-2 rounded-full px-2 py-1 text-xs font-medium ${
                      post.status === "published"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : post.status === "scheduled"
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                    }`}
                  >
                    {post.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {post.excerpt || "No excerpt"}
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Tags: {joinStringArray(post.tags) || "—"}
                </p>
                <div className="flex items-center justify-between">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/admin/posts/${post.id}/edit`}>
                      <Edit className="h-4 w-4" />
                    </Link>
                  </Button>
                  <DeleteEntityButton
                    endpoint={`/api/admin/posts/${post.id}`}
                    entityLabel="Post"
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
