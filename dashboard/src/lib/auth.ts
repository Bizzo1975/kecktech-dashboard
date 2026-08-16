import { headers } from "next/headers";

export type UserInfo = {
  user: string;
  email: string;
  groups: string[];
  isAdmin: boolean;
  canSupport: boolean;
  canBilling: boolean;
  canSales: boolean;
  canOps: boolean;
};

export async function getUser(): Promise<UserInfo> {
  const h = await headers();
  const user = h.get("Remote-User") || "";
  const email = h.get("Remote-Email") || "";
  const groups = (h.get("Remote-Groups") || "")
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);

  const isAdmin = groups.includes("kecktech_admins");
  return {
    user,
    email,
    groups,
    isAdmin,
    canSupport:
      isAdmin ||
      groups.includes("kecktech_support") ||
      groups.includes("kecktech_staff"),
    canBilling: isAdmin || groups.includes("kecktech_billing"),
    canSales:
      isAdmin ||
      groups.includes("kecktech_billing") ||
      groups.includes("kecktech_sales"),
    canOps: isAdmin || groups.includes("kecktech_support"),
  };
}
