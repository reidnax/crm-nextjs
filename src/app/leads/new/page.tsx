"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import LeadForm from "@/components/forms/lead-form";

// Import the type from the lead form
type LeadFormData = Parameters<typeof LeadForm>[0]["onSubmit"] extends (
  data: infer T
) => void
  ? T
  : never;

export default function NewLeadPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  if (status === "loading") {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded mb-6"></div>
          <div className="h-48 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!session) {
    return <div>Access Denied</div>;
  }

  const handleSubmit = async (formData: LeadFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Lead created successfully!");
        router.push(`/leads/${result.data.id}`);
      } else {
        console.error("Failed to create lead:", result.error);
        toast.error(result.error || "Failed to create lead");
      }
    } catch (error) {
      console.error("Error creating lead:", error);
      toast.error("An unexpected error occurred while creating the lead");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push("/leads");
  };

  return (
    <LeadForm
      mode="create"
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      isLoading={isLoading}
    />
  );
}
