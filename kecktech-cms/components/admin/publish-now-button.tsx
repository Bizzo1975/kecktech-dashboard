"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface PublishNowButtonProps {
  postId: string;
}

export function PublishNowButton({ postId }: PublishNowButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const response = await fetch(`/api/admin/posts/${postId}/publish`, {
        method: "POST",
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to publish");
      }
      toast({
        title: "Published",
        description: "The post is now live.",
      });
      router.refresh();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to publish post.",
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Button size="sm" onClick={handlePublish} disabled={isPublishing}>
      <Send className="mr-2 h-4 w-4" />
      {isPublishing ? "Publishing..." : "Publish now"}
    </Button>
  );
}
