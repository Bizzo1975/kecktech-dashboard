import Link from "next/link";
import { Newspaper, Users, Send } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export default async function NewsletterHubPage() {
  const [campaignCount, subscriberCount, campaigns, subscribers] =
    await Promise.all([
      prisma.newsletterCampaign.count(),
      prisma.newsletterSubscriber.count(),
      prisma.newsletterCampaign.findMany({
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
      prisma.newsletterSubscriber.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
    ]);

  const empty = campaignCount === 0 && subscriberCount === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Newsletter</h1>
        <p className="text-muted-foreground">
          Campaigns & subscribers hub. Delivery will wire to Listmonk / Microsoft
          Graph — schema is ready in Prisma.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Campaigns</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Send className="h-6 w-6 text-muted-foreground" />
              {campaignCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Subscribers</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Users className="h-6 w-6 text-muted-foreground" />
              {subscriberCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Integration</CardDescription>
            <CardTitle className="text-base font-medium">
              Listmonk / Graph — pending
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {empty ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-3">
            <Newspaper className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground max-w-md">
              No campaigns or subscribers yet. Models{" "}
              <code className="text-xs">NewsletterCampaign</code> and{" "}
              <code className="text-xs">NewsletterSubscriber</code> exist —
              coming wired to Listmonk / Microsoft Graph. Contact form opt-in can
              write subscribers once the signup route is connected.
            </p>
            <p className="text-xs text-muted-foreground">
              Marketing nav stays in Astro; this hub is CMS-only.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent campaigns</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {campaigns.length === 0 ? (
                <p className="text-sm text-muted-foreground">No campaigns.</p>
              ) : (
                campaigns.map((c) => (
                  <div
                    key={c.id}
                    className="flex justify-between text-sm border-b py-2 last:border-0"
                  >
                    <span className="font-medium">{c.title}</span>
                    <span className="text-muted-foreground capitalize">
                      {c.status}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recent subscribers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {subscribers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No subscribers.</p>
              ) : (
                subscribers.map((s) => (
                  <div
                    key={s.id}
                    className="flex justify-between text-sm border-b py-2 last:border-0"
                  >
                    <span>{s.email}</span>
                    <span className="text-muted-foreground">
                      {s.active ? "active" : "inactive"}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Also see{" "}
        <Link href="/admin/settings" className="underline">
          Settings
        </Link>{" "}
        for site-wide keys once Listmonk env is added.
      </p>
    </div>
  );
}
