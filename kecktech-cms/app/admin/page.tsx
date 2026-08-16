import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Server, Users, FileText, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);
  
  // Get statistics
  const [serviceCount, userCount, pageCount] = await Promise.all([
    prisma.service.count(),
    prisma.user.count(),
    prisma.page.count(),
  ]);

  const stats = [
    {
      title: "Services",
      value: serviceCount,
      icon: Server,
      href: "/admin/services",
      description: "Total service offerings",
    },
    {
      title: "Users",
      value: userCount,
      icon: Users,
      href: "/admin/users",
      description: "Admin users",
    },
    {
      title: "Pages",
      value: pageCount,
      icon: FileText,
      href: "/admin/pages",
      description: "CMS pages",
    },
    {
      title: "Growth",
      value: "+12%",
      icon: TrendingUp,
      href: "#",
      description: "This month",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {session?.user?.name || session?.user?.email}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
                {stat.href !== "#" && (
                  <Button asChild variant="link" className="mt-2 p-0 h-auto">
                    <Link href={stat.href}>View all →</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild className="w-full justify-start">
              <Link href="/admin/services/new">Create New Service</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/admin/pages/new">Create New Page</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/admin/settings">Manage Settings</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest changes and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Activity log will be displayed here
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

