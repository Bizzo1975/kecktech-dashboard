import Link from "next/link";
import { Plus, Edit, ExternalLink } from "lucide-react";
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

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Projects (Demos)
          </h1>
          <p className="text-muted-foreground">
            Manage demo apps synced to demos.json
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/projects/new">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Link>
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No projects found</p>
            <Button asChild>
              <Link href="/admin/projects/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Project
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="line-clamp-1">
                      {project.title}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      /{project.slug}
                    </CardDescription>
                  </div>
                  <span
                    className={`ml-2 rounded-full px-2 py-1 text-xs font-medium ${
                      project.status === "published"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : project.status === "draft"
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                    }`}
                  >
                    {project.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {project.description || "No description"}
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  {joinStringArray(project.technologies) || "No technologies"}
                  {project.featured ? " · Featured" : ""}
                  {!project.available ? " · Unavailable" : ""}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {project.liveDemo && (
                      <Button asChild variant="ghost" size="sm">
                        <Link href={project.liveDemo} target="_blank">
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/admin/projects/${project.id}/edit`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                  <DeleteEntityButton
                    endpoint={`/api/admin/projects/${project.id}`}
                    entityLabel="Project"
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
