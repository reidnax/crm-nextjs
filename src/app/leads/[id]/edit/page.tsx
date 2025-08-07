"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import LeadForm from "@/components/forms/lead-form";

// Import the type from the lead form
type LeadFormData = Parameters<typeof LeadForm>[0]["onSubmit"] extends (
  data: infer T
) => void
  ? T
  : never;

export default function EditLeadPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const leadId = params.id as string;

  const [lead, setLead] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const fetchLead = useCallback(async () => {
    try {
      setIsLoadingData(true);
      const response = await fetch(`/api/leads/${leadId}`);
      const result = await response.json();

      if (result.success) {
        setLead(result.data);
      } else {
        console.error("Failed to fetch lead:", result.error);
        router.push("/leads");
      }
    } catch (error) {
      console.error("Error fetching lead:", error);
      router.push("/leads");
    } finally {
      setIsLoadingData(false);
    }
  }, [leadId, router]);

  useEffect(() => {
    if (session && leadId) {
      fetchLead();
    }
  }, [session, leadId, fetchLead]);

  if (status === "loading" || isLoadingData) {
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

  if (!lead) {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Lead Not Found
          </h1>
          <p className="text-gray-600 mb-4">
            The lead you&apos;re trying to edit doesn&apos;t exist.
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (formData: LeadFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Lead updated successfully!");
        router.push(`/leads/${leadId}`);
      } else {
        console.error("Failed to update lead:", result.error);
        toast.error(result.error || "Failed to update lead");
      }
    } catch (error) {
      console.error("Error updating lead:", error);
      toast.error("An unexpected error occurred while updating the lead");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(`/leads/${leadId}`);
  };

  return (
    <LeadForm
      mode="edit"
      initialData={lead}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      isLoading={isLoading}
    />
  );
}
