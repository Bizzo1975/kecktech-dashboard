import Link from "next/link";
import { Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { PublishNowButton } from "@/components/admin/publish-now-button";

export default async function ContentSchedulerPage() {
  const scheduled = await prisma.post.findMany({
    where: { status: "scheduled" },
    orderBy: { scheduledPublishAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Content Scheduler
        </h1>
        <p className="text-muted-foreground">
          Posts waiting for scheduled publication
        </p>
      </div>

      {scheduled.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">
              No scheduled posts right now
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {scheduled.map((post) => (
            <Card key={post.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>{post.title}</CardTitle>
                    <CardDescription className="mt-1">
                      /{post.slug}
                      {post.scheduledPublishAt
                        ? ` · Scheduled for ${new Date(
                            post.scheduledPublishAt
                          ).toLocaleString()}`
                        : " · No schedule date set"}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/admin/posts/${post.id}/edit`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <PublishNowButton postId={post.id} />
                  </div>
                </div>
              </CardHeader>
              {post.excerpt && (
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {post.excerpt}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
