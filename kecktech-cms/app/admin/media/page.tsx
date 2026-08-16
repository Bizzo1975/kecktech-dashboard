import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { MediaUploadForm } from "@/components/admin/media-upload-form";
import { DeleteEntityButton } from "@/components/admin/delete-entity-button";

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function MediaPage() {
  const files = await prisma.mediaFile.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Media</h1>
        <p className="text-muted-foreground">
          Upload and manage files in public/uploads
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload</CardTitle>
          <CardDescription>Add a file to the media library</CardDescription>
        </CardHeader>
        <CardContent>
          <MediaUploadForm />
        </CardContent>
      </Card>

      {files.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No media files uploaded yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {files.map((file) => (
            <Card key={file.id}>
              <CardHeader>
                <CardTitle className="line-clamp-1 text-base">
                  {file.originalName}
                </CardTitle>
                <CardDescription>
                  {file.mimeType} · {formatBytes(file.size)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {file.mimeType.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={file.url}
                    alt={file.originalName}
                    className="h-32 w-full rounded-md object-cover border"
                  />
                ) : (
                  <div className="flex h-32 items-center justify-center rounded-md border bg-muted text-sm text-muted-foreground">
                    {file.mimeType}
                  </div>
                )}
                <p className="text-xs text-muted-foreground break-all">
                  {file.url}
                </p>
                <div className="flex justify-end">
                  <DeleteEntityButton
                    endpoint={`/api/admin/media/${file.id}`}
                    entityLabel="Media"
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
