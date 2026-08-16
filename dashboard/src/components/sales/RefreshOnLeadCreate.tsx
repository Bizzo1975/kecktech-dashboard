"use client";

import { useRouter } from "next/navigation";
import { NewLeadForm } from "@/components/sales/NewLeadForm";

export function RefreshOnLeadCreate() {
  const router = useRouter();
  return <NewLeadForm onCreated={() => router.refresh()} />;
}
