import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { SettingsForm } from "@/components/admin/settings-form";

const KEYS = ["site_name", "site_url", "default_author"] as const;

export default async function SettingsPage() {
  const rows = await prisma.setting.findMany({
    where: { key: { in: [...KEYS] } },
  });

  const initialValues = {
    site_name: "",
    site_url: "",
    default_author: "",
  };
  for (const row of rows) {
    if (row.key in initialValues) {
      initialValues[row.key as keyof typeof initialValues] = row.value;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage site-wide settings</p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <SettingsIcon className="h-5 w-5" />
            <CardTitle>General Settings</CardTitle>
          </div>
          <CardDescription>
            Keys stored in the Setting table: site_name, site_url,
            default_author
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm initialValues={initialValues} />
        </CardContent>
      </Card>
    </div>
  );
}
