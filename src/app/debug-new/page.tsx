"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import EnhancedPerformanceMonitor from "@/components/debug/EnhancedPerformanceMonitor";
import { RoleGate } from "@/components/auth/RoleGate";

export default function DebugNewPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/login");
    }
  }, [session, status, router]);

  if (status === "loading") {
    return <div className="container mx-auto p-6">Loading...</div>;
  }

  if (!session) {
    return <div>Access Denied</div>;
  }

  return (
    <RoleGate roles={["Admin-Dev"]}>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Performance Debug Tools (New)
          </h1>
          <p className="text-gray-600 mt-1">
            Diagnose performance issues in your Vercel production app using new
            routes
          </p>
        </div>

        <div className="space-y-8">
          <EnhancedPerformanceMonitor />
        </div>
      </div>
    </RoleGate>
  );
}
