import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users as UsersIcon } from "lucide-react";

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground">Manage admin users and permissions</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {users.map((user) => (
          <Card key={user.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{user.name || "No Name"}</CardTitle>
                <UsersIcon className="h-5 w-5 text-muted-foreground" />
              </div>
              <CardDescription>{user.email}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-semibold">Role: </span>
                  <span className="text-sm capitalize">{user.role}</span>
                </div>
                <div>
                  <span className="text-sm font-semibold">2FA: </span>
                  <span className="text-sm">
                    {user.twoFactorEnabled ? "enabled" : "off"}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-semibold">Created: </span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

