import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import EmailOnboardClient from "./EmailOnboardClient";

export const dynamic = "force-dynamic";

export default async function EmailOnboardPage() {
  const user = await getUser();
  if (!user.canOps) redirect("/");
  return <EmailOnboardClient />;
}
