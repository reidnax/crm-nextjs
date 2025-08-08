"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, AlertCircle, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import DealerForm from "./dealer-form";
import {
  leadValidationSchema,
  type LeadFormData,
  type LeadInitialData,
  getFieldError,
  LEAD_STATUSES,
  SUB_STATUSES,
  CONVERTED_STATUSES,
  PRIORITIES,
  BUSINESS_CATEGORIES,
  LEAD_SOURCES,
} from "@/lib/validations/lead-validation";

interface LeadFormProps {
  initialData?: LeadInitialData;
  onSubmit: (data: LeadFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  mode?: "create" | "edit";
  serverErrors?: Record<string, string>;
}

// Helper function to ensure all values are strings instead of null
const sanitizeInitialData = (data: LeadInitialData): LeadFormData => {
  return {
    name: data.name || "",
    email: data.email || "",
    phone: data.phone || "",
    alternatePhone: data.alternatePhone || "",
    company: data.company || "",
    businessCategory: data.businessCategory || "",
    businessIndustry: data.businessIndustry || "",
    status: data.status || "New",
    subStatus: data.subStatus || "",
    convertedStatus: data.convertedStatus || "",
    priority: data.priority || "Medium",
    state: data.state || "",
    city: data.city || "",
    address: data.address || "",
    pincode: data.pincode || "",
    website: data.website || "",
    description: data.description || "",
    designation: data.designation || "",
    annualRevenue: data.annualRevenue || "",
    investmentLimit: data.investmentLimit || "",
    source: data.source || "",
    tags: data.tags || [],
    dealer: data.dealer || {},
    socialMedia: {
      linkedin: data.socialMedia?.linkedin || "",
      twitter: data.socialMedia?.twitter || "",
      facebook: data.socialMedia?.facebook || "",
      instagram: data.socialMedia?.instagram || "",
      website: data.socialMedia?.website || "",
    },
    lastContactDate: data.lastContactDate || "",
    nextFollowUpDate: data.nextFollowUpDate || "",
    leadScore: data.leadScore || 0,
  };
};

export default function LeadForm({
  initialData = {},
  onSubmit,
  onCancel,
  isLoading = false,
  mode = "create",
  serverErrors = {},
}: LeadFormProps) {
  const [newTag, setNewTag] = useState("");

  // Sanitize initial data to ensure no null values
  const sanitizedData = sanitizeInitialData(initialData);

  // Set up react-hook-form with Zod validation
  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch,
    setError,
    clearErrors,
  } = useForm({
    resolver: zodResolver(leadValidationSchema),
    defaultValues: sanitizedData,
    mode: "onChange", // Validate on change for better UX
  });

  // Watch tags for dynamic management
  const watchedTags = watch("tags");

  // Set server errors on component mount or when they change
  useEffect(() => {
    if (serverErrors && Object.keys(serverErrors).length > 0) {
      Object.entries(serverErrors).forEach(([field, message]) => {
        setError(field as keyof LeadFormData, {
          type: "server",
          message: message,
        });
      });
    }
  }, [serverErrors, setError]);

  // Tag management functions
  const handleAddTag = () => {
    if (newTag.trim() && !watchedTags?.includes(newTag.trim())) {
      const currentTags = watchedTags || [];
      setValue("tags", [...currentTags, newTag.trim()], {
        shouldValidate: true,
      });
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = watchedTags || [];
    setValue(
      "tags",
      currentTags.filter((tag) => tag !== tagToRemove),
      { shouldValidate: true }
    );
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  // Form submission with react-hook-form
  const onFormSubmit = (data: any) => {
    // Clear any server errors before submitting
    Object.keys(serverErrors).forEach((field) => {
      clearErrors(field as keyof LeadFormData);
    });

    onSubmit(data as LeadFormData);
  };

  // Helper function to get field error message
  const getErrorMessage = (fieldName: string): string | undefined => {
    return getFieldError(errors, fieldName);
  };

  // Generate breadcrumb items
  const leadName = initialData?.name;
  const breadcrumbItems =
    mode === "create"
      ? [
          { label: "Leads", href: "/leads" },
          { label: "New Lead", isCurrentPage: true },
        ]
      : [
          { label: "Leads", href: "/leads" },
          ...(leadName ? [{ label: leadName, href: `#` }] : []),
          { label: "Edit", isCurrentPage: true },
        ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto">
        {/* Mobile-first Navigation Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 md:px-6">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2"
              onClick={onCancel}
              disabled={isLoading}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Back to Leads</span>
              <span className="sm:hidden">Back</span>
            </Button>

            {/* Mobile Save Button */}
            <div className="md:hidden">
              <Button
                type="submit"
                form="lead-form"
                size="sm"
                disabled={isLoading || Object.keys(errors).length > 0}
                className="px-4"
              >
                {isLoading ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>

          <div className="mt-3">
            <Breadcrumb items={breadcrumbItems} />
          </div>
        </div>

        {/* Form Container */}
        <div className="p-4 md:p-6">
          <form
            id="lead-form"
            onSubmit={handleSubmit(onFormSubmit)}
            className="space-y-6"
          >
            {/* Page Title */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                    {mode === "create" ? "Create New Lead" : "Edit Lead"}
                  </h1>
                  <p className="text-sm md:text-base text-gray-600 mt-1">
                    {mode === "create"
                      ? "Add a new lead to your sales pipeline"
                      : "Update lead information and details"}
                  </p>
                </div>
              </div>
            </div>

            {/* Error Summary */}
            {Object.keys(errors).length > 0 && (
              <Alert variant="destructive" className="mx-4 md:mx-0">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please fix the following errors before submitting:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    {Object.entries(errors).map(([field, error]) => (
                      <li key={field} className="text-sm">
                        <strong className="capitalize">{field}:</strong>{" "}
                        {(error as any)?.message || String(error)}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
              {/* Basic Information */}
              <div className="lg:col-span-2 space-y-4 md:space-y-6">
                <Card className="shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">Basic Information</CardTitle>
                    <CardDescription className="text-sm">
                      Essential lead details and contact information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Name *</Label>
                        <Controller
                          name="name"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              value={field.value || ""}
                              id="name"
                              placeholder="Enter lead name"
                              className={
                                getErrorMessage("name") ? "border-red-500" : ""
                              }
                            />
                          )}
                        />
                        {getErrorMessage("name") && (
                          <p className="text-sm text-red-500 mt-1">
                            {getErrorMessage("name")}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="company">Company</Label>
                        <Controller
                          name="company"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              value={field.value || ""}
                              id="company"
                              placeholder="Company name"
                              className={
                                getErrorMessage("company")
                                  ? "border-red-500"
                                  : ""
                              }
                            />
                          )}
                        />
                        {getErrorMessage("company") && (
                          <p className="text-sm text-red-500 mt-1">
                            {getErrorMessage("company")}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Controller
                          name="email"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              value={field.value || ""}
                              id="email"
                              type="email"
                              placeholder="email@example.com"
                              className={
                                getErrorMessage("email") ? "border-red-500" : ""
                              }
                            />
                          )}
                        />
                        {getErrorMessage("email") && (
                          <p className="text-sm text-red-500 mt-1">
                            {getErrorMessage("email")}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="phone">Phone</Label>
                        <Controller
                          name="phone"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              value={field.value || ""}
                              id="phone"
                              placeholder="+1 (555) 123-4567"
                              className={
                                getErrorMessage("phone") ? "border-red-500" : ""
                              }
                            />
                          )}
                        />
                        {getErrorMessage("phone") && (
                          <p className="text-sm text-red-500 mt-1">
                            {getErrorMessage("phone")}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="alternatePhone">Alternate Phone</Label>
                        <Controller
                          name="alternatePhone"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              value={field.value || ""}
                              id="alternatePhone"
                              placeholder="Alternate phone number"
                              className={
                                getErrorMessage("alternatePhone")
                                  ? "border-red-500"
                                  : ""
                              }
                            />
                          )}
                        />
                        {getErrorMessage("alternatePhone") && (
                          <p className="text-sm text-red-500 mt-1">
                            {getErrorMessage("alternatePhone")}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="designation">Designation</Label>
                        <Controller
                          name="designation"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              value={field.value || ""}
                              id="designation"
                              placeholder="Job title"
                              className={
                                getErrorMessage("designation")
                                  ? "border-red-500"
                                  : ""
                              }
                            />
                          )}
                        />
                        {getErrorMessage("designation") && (
                          <p className="text-sm text-red-500 mt-1">
                            {getErrorMessage("designation")}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="website">Website</Label>
                      <Controller
                        name="website"
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            value={field.value || ""}
                            id="website"
                            placeholder="https://company.com"
                            className={
                              getErrorMessage("website") ? "border-red-500" : ""
                            }
                          />
                        )}
                      />
                      {getErrorMessage("website") && (
                        <p className="text-sm text-red-500 mt-1">
                          {getErrorMessage("website")}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Business Information */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">
                      Business Information
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Industry and business details
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="businessCategory">
                          Business Category
                        </Label>
                        <Controller
                          name="businessCategory"
                          control={control}
                          render={({ field }) => (
                            <Select
                              value={field.value || ""}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger
                                className={
                                  getErrorMessage("businessCategory")
                                    ? "border-red-500"
                                    : ""
                                }
                              >
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                {BUSINESS_CATEGORIES.map((category) => (
                                  <SelectItem key={category} value={category}>
                                    {category}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {getErrorMessage("businessCategory") && (
                          <p className="text-sm text-red-500 mt-1">
                            {getErrorMessage("businessCategory")}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="businessIndustry">
                          Business Industry
                        </Label>
                        <Controller
                          name="businessIndustry"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              value={field.value || ""}
                              id="businessIndustry"
                              placeholder="Specific industry"
                              className={
                                getErrorMessage("businessIndustry")
                                  ? "border-red-500"
                                  : ""
                              }
                            />
                          )}
                        />
                        {getErrorMessage("businessIndustry") && (
                          <p className="text-sm text-red-500 mt-1">
                            {getErrorMessage("businessIndustry")}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="annualRevenue">Annual Revenue</Label>
                        <Controller
                          name="annualRevenue"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              value={field.value || ""}
                              id="annualRevenue"
                              placeholder="Annual revenue (e.g. $500,000)"
                              className={
                                getErrorMessage("annualRevenue")
                                  ? "border-red-500"
                                  : ""
                              }
                            />
                          )}
                        />
                        {getErrorMessage("annualRevenue") && (
                          <p className="text-sm text-red-500 mt-1">
                            {getErrorMessage("annualRevenue")}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="investmentLimit">
                          Investment Limit
                        </Label>
                        <Controller
                          name="investmentLimit"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              value={field.value || ""}
                              id="investmentLimit"
                              placeholder="Investment budget (e.g. $50,000)"
                              className={
                                getErrorMessage("investmentLimit")
                                  ? "border-red-500"
                                  : ""
                              }
                            />
                          )}
                        />
                        {getErrorMessage("investmentLimit") && (
                          <p className="text-sm text-red-500 mt-1">
                            {getErrorMessage("investmentLimit")}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Location Information */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">
                      Location Information
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Address and location details
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="address">Address</Label>
                      <Controller
                        name="address"
                        control={control}
                        render={({ field }) => (
                          <Textarea
                            {...field}
                            value={field.value || ""}
                            id="address"
                            placeholder="Street address"
                            rows={2}
                            className={
                              getErrorMessage("address") ? "border-red-500" : ""
                            }
                          />
                        )}
                      />
                      {getErrorMessage("address") && (
                        <p className="text-sm text-red-500 mt-1">
                          {getErrorMessage("address")}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="city">City</Label>
                        <Controller
                          name="city"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              value={field.value || ""}
                              id="city"
                              placeholder="City"
                              className={
                                getErrorMessage("city") ? "border-red-500" : ""
                              }
                            />
                          )}
                        />
                        {getErrorMessage("city") && (
                          <p className="text-sm text-red-500 mt-1">
                            {getErrorMessage("city")}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="state">State</Label>
                        <Controller
                          name="state"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              value={field.value || ""}
                              id="state"
                              placeholder="State"
                              className={
                                getErrorMessage("state") ? "border-red-500" : ""
                              }
                            />
                          )}
                        />
                        {getErrorMessage("state") && (
                          <p className="text-sm text-red-500 mt-1">
                            {getErrorMessage("state")}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="pincode">Pincode</Label>
                        <Controller
                          name="pincode"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              value={field.value || ""}
                              id="pincode"
                              placeholder="ZIP/Postal code"
                              className={
                                getErrorMessage("pincode")
                                  ? "border-red-500"
                                  : ""
                              }
                            />
                          )}
                        />
                        {getErrorMessage("pincode") && (
                          <p className="text-sm text-red-500 mt-1">
                            {getErrorMessage("pincode")}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Contact & Follow-up Information */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">
                      Contact & Follow-up
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Contact history and scheduled follow-ups
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="lastContactDate">
                          Last Contact Date
                        </Label>
                        <Controller
                          name="lastContactDate"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              value={field.value || ""}
                              id="lastContactDate"
                              type="date"
                              className={
                                getErrorMessage("lastContactDate")
                                  ? "border-red-500"
                                  : ""
                              }
                            />
                          )}
                        />
                        {getErrorMessage("lastContactDate") && (
                          <p className="text-sm text-red-500 mt-1">
                            {getErrorMessage("lastContactDate")}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="nextFollowUpDate">
                          Next Follow-up Date
                        </Label>
                        <Controller
                          name="nextFollowUpDate"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              value={field.value || ""}
                              id="nextFollowUpDate"
                              type="date"
                              className={
                                getErrorMessage("nextFollowUpDate")
                                  ? "border-red-500"
                                  : ""
                              }
                            />
                          )}
                        />
                        {getErrorMessage("nextFollowUpDate") && (
                          <p className="text-sm text-red-500 mt-1">
                            {getErrorMessage("nextFollowUpDate")}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Social Media Information */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">
                      Social Media Links
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Social media profiles and online presence
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="linkedin">LinkedIn</Label>
                        <Controller
                          name="socialMedia.linkedin"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              value={field.value || ""}
                              id="linkedin"
                              placeholder="https://linkedin.com/in/username"
                              className={
                                getErrorMessage("socialMedia.linkedin")
                                  ? "border-red-500"
                                  : ""
                              }
                            />
                          )}
                        />
                        {getErrorMessage("socialMedia.linkedin") && (
                          <p className="text-sm text-red-500 mt-1">
                            {getErrorMessage("socialMedia.linkedin")}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="twitter">Twitter</Label>
                        <Controller
                          name="socialMedia.twitter"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              value={field.value || ""}
                              id="twitter"
                              placeholder="https://twitter.com/username"
                              className={
                                getErrorMessage("socialMedia.twitter")
                                  ? "border-red-500"
                                  : ""
                              }
                            />
                          )}
                        />
                        {getErrorMessage("socialMedia.twitter") && (
                          <p className="text-sm text-red-500 mt-1">
                            {getErrorMessage("socialMedia.twitter")}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="facebook">Facebook</Label>
                        <Controller
                          name="socialMedia.facebook"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              value={field.value || ""}
                              id="facebook"
                              placeholder="https://facebook.com/username"
                              className={
                                getErrorMessage("socialMedia.facebook")
                                  ? "border-red-500"
                                  : ""
                              }
                            />
                          )}
                        />
                        {getErrorMessage("socialMedia.facebook") && (
                          <p className="text-sm text-red-500 mt-1">
                            {getErrorMessage("socialMedia.facebook")}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="instagram">Instagram</Label>
                        <Controller
                          name="socialMedia.instagram"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              value={field.value || ""}
                              id="instagram"
                              placeholder="https://instagram.com/username"
                              className={
                                getErrorMessage("socialMedia.instagram")
                                  ? "border-red-500"
                                  : ""
                              }
                            />
                          )}
                        />
                        {getErrorMessage("socialMedia.instagram") && (
                          <p className="text-sm text-red-500 mt-1">
                            {getErrorMessage("socialMedia.instagram")}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Additional Information */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">
                      Additional Information
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Notes and additional details about the lead
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Controller
                        name="description"
                        control={control}
                        render={({ field }) => (
                          <Textarea
                            {...field}
                            value={field.value || ""}
                            id="description"
                            placeholder="Additional notes about the lead..."
                            rows={4}
                            className={
                              getErrorMessage("description")
                                ? "border-red-500"
                                : ""
                            }
                          />
                        )}
                      />
                      {getErrorMessage("description") && (
                        <p className="text-sm text-red-500 mt-1">
                          {getErrorMessage("description")}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="tags">Tags</Label>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Add a tag"
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            onClick={handleAddTag}
                            disabled={!newTag.trim()}
                          >
                            Add
                          </Button>
                        </div>
                        {watchedTags && watchedTags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {watchedTags.map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="flex items-center gap-1"
                              >
                                {tag}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTag(tag)}
                                  className="ml-1 hover:text-red-500"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                        {getErrorMessage("tags") && (
                          <p className="text-sm text-red-500 mt-1">
                            {getErrorMessage("tags")}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Dealer Information */}
                <div>
                  <Controller
                    name="dealer"
                    control={control}
                    render={({ field }) => (
                      <DealerForm
                        initialData={field.value || {}}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </div>
              </div>

              {/* Settings Sidebar */}
              <div className="space-y-4 md:space-y-6">
                <Card className="shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">Lead Settings</CardTitle>
                    <CardDescription className="text-sm">
                      Status and priority settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="status">Status *</Label>
                      <Controller
                        name="status"
                        control={control}
                        render={({ field }) => (
                          <Select
                            value={field.value || ""}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger
                              className={
                                getErrorMessage("status")
                                  ? "border-red-500"
                                  : ""
                              }
                            >
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              {LEAD_STATUSES.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {getErrorMessage("status") && (
                        <p className="text-sm text-red-500 mt-1">
                          {getErrorMessage("status")}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="priority">Priority *</Label>
                      <Controller
                        name="priority"
                        control={control}
                        render={({ field }) => (
                          <Select
                            value={field.value || ""}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger
                              className={
                                getErrorMessage("priority")
                                  ? "border-red-500"
                                  : ""
                              }
                            >
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                            <SelectContent>
                              {PRIORITIES.map((priority) => (
                                <SelectItem key={priority} value={priority}>
                                  {priority}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {getErrorMessage("priority") && (
                        <p className="text-sm text-red-500 mt-1">
                          {getErrorMessage("priority")}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="source">Lead Source</Label>
                      <Controller
                        name="source"
                        control={control}
                        render={({ field }) => (
                          <Select
                            value={field.value || ""}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger
                              className={
                                getErrorMessage("source")
                                  ? "border-red-500"
                                  : ""
                              }
                            >
                              <SelectValue placeholder="Select source" />
                            </SelectTrigger>
                            <SelectContent>
                              {LEAD_SOURCES.map((source) => (
                                <SelectItem key={source} value={source}>
                                  {source}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {getErrorMessage("source") && (
                        <p className="text-sm text-red-500 mt-1">
                          {getErrorMessage("source")}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="subStatus">Sub Status</Label>
                      <Controller
                        name="subStatus"
                        control={control}
                        render={({ field }) => (
                          <Select
                            value={field.value || ""}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger
                              className={
                                getErrorMessage("subStatus")
                                  ? "border-red-500"
                                  : ""
                              }
                            >
                              <SelectValue placeholder="Select sub status" />
                            </SelectTrigger>
                            <SelectContent>
                              {SUB_STATUSES.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {getErrorMessage("subStatus") && (
                        <p className="text-sm text-red-500 mt-1">
                          {getErrorMessage("subStatus")}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="convertedStatus">Converted Status</Label>
                      <Controller
                        name="convertedStatus"
                        control={control}
                        render={({ field }) => (
                          <Select
                            value={field.value || ""}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger
                              className={
                                getErrorMessage("convertedStatus")
                                  ? "border-red-500"
                                  : ""
                              }
                            >
                              <SelectValue placeholder="Select converted status" />
                            </SelectTrigger>
                            <SelectContent>
                              {CONVERTED_STATUSES.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {getErrorMessage("convertedStatus") && (
                        <p className="text-sm text-red-500 mt-1">
                          {getErrorMessage("convertedStatus")}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="leadScore">Lead Score (0-100)</Label>
                      <Controller
                        name="leadScore"
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            value={field.value || ""}
                            id="leadScore"
                            type="number"
                            min="0"
                            max="100"
                            placeholder="Enter lead score"
                            className={
                              getErrorMessage("leadScore")
                                ? "border-red-500"
                                : ""
                            }
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value) || 0)
                            }
                          />
                        )}
                      />
                      {getErrorMessage("leadScore") && (
                        <p className="text-sm text-red-500 mt-1">
                          {getErrorMessage("leadScore")}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Form Actions - Desktop Only (Mobile has fixed save button) */}
                <Card className="shadow-sm hidden md:block">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <Button
                        type="submit"
                        className="w-full h-10"
                        disabled={isLoading || Object.keys(errors).length > 0}
                      >
                        {isLoading
                          ? "Saving..."
                          : mode === "create"
                          ? "Create Lead"
                          : "Update Lead"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        className="w-full h-10"
                        disabled={isLoading}
                      >
                        Cancel
                      </Button>
                      {/* Form Status Indicator */}
                      <div className="text-center text-xs text-gray-500 mt-3">
                        {Object.keys(errors).length > 0 ? (
                          <span className="text-red-500">
                            {Object.keys(errors).length} error
                            {Object.keys(errors).length > 1 ? "s" : ""} found
                          </span>
                        ) : isDirty ? (
                          <span className="text-green-500">
                            Form is valid and ready to submit
                          </span>
                        ) : (
                          <span>Fill out the form to continue</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Mobile Bottom Padding to account for fixed save button */}
            <div className="h-20 md:hidden" />
          </form>
        </div>
      </div>
    </div>
  );
}
