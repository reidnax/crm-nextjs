"use client";

import { useState } from "react";
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
import { X, Calendar } from "lucide-react";
import DealerForm from "./dealer-form";

interface DealerFormData {
  date?: string;
  evBusiness?: string;
  evBusinessStatus?: string;
  longTermGoals?: string;
  achieveAvoid?: string;
  goalBarrier?: string;
  problems?: string[];
  improvementInterest?: string;
  [key: string]: string | string[] | undefined; // Add index signature
}

interface SocialMediaData {
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
  website?: string;
}

interface LeadFormData {
  name: string;
  email: string;
  phone: string;
  alternatePhone: string;
  company: string;
  businessCategory: string;
  businessIndustry: string;
  status: string;
  subStatus: string;
  convertedStatus: string;
  priority: string;
  state: string;
  city: string;
  address: string;
  pincode: string;
  website: string;
  description: string;
  designation: string;
  annualRevenue: string;
  investmentLimit: string;
  source: string;
  tags: string[];
  dealer: DealerFormData;
  socialMedia: SocialMediaData;
  lastContactDate: string;
  nextFollowUpDate: string;
  leadScore: number;
}

interface LeadFormProps {
  initialData?: Partial<LeadFormData> & {
    // Allow these to be null from database but we'll handle them safely
    socialMedia?: SocialMediaData | null;
    dealer?: DealerFormData | null;
    tags?: string[] | null;
    lastContactDate?: string | null;
    nextFollowUpDate?: string | null;
  };
  onSubmit: (data: LeadFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  mode?: "create" | "edit";
}

const LEAD_STATUSES = [
  "Unassigned",
  "To be contacted",
  "Attempted to contact",
  "Contacted",
  "Contact in future",
  "Qualified",
  "Not Qualified",
  "Meeting",
  "Product/Plant Visit",
  "Converted",
  "Not Converted",
];

const SUB_STATUSES = ["Hot", "Warm", "Cold"];

const CONVERTED_STATUSES = ["Won", "Lost", "Pending", "On Hold"];

const PRIORITIES = ["Low", "Medium", "High"];

const BUSINESS_CATEGORIES = [
  "Manufacturing",
  "Trading",
  "Service",
  "Retail",
  "Technology",
  "Healthcare",
  "Education",
  "Other",
];

const LEAD_SOURCES = [
  "Website",
  "Social Media",
  "Referral",
  "Cold Call",
  "Email Campaign",
  "Trade Show",
  "Advertisement",
  "Other",
];

export default function LeadForm({
  initialData = {},
  onSubmit,
  onCancel,
  isLoading = false,
  mode = "create",
}: LeadFormProps) {
  const [formData, setFormData] = useState<LeadFormData>(() => {
    const defaults: LeadFormData = {
      name: "",
      email: "",
      phone: "",
      alternatePhone: "",
      company: "",
      businessCategory: "",
      businessIndustry: "",
      status: "New",
      subStatus: "",
      convertedStatus: "",
      priority: "Medium",
      state: "",
      city: "",
      address: "",
      pincode: "",
      website: "",
      description: "",
      designation: "",
      annualRevenue: "",
      investmentLimit: "",
      source: "",
      tags: [],
      dealer: {},
      socialMedia: {},
      lastContactDate: "",
      nextFollowUpDate: "",
      leadScore: 0,
    };

    return {
      ...defaults,
      ...initialData,
      // Ensure socialMedia and dealer are always objects, not null
      socialMedia: initialData?.socialMedia || {},
      dealer: initialData?.dealer || {},
      tags: initialData?.tags || [],
      // Ensure date fields are always strings, not null
      lastContactDate: initialData?.lastContactDate || "",
      nextFollowUpDate: initialData?.nextFollowUpDate || "",
    };
  });

  const [newTag, setNewTag] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: keyof LeadFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (formData.email && !formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.email = "Invalid email format";
    }

    if (formData.phone && !formData.phone.match(/^[\d\s\-\+\(\)]+$/)) {
      newErrors.phone = "Invalid phone format";
    }

    if (formData.website && !formData.website.match(/^https?:\/\/.+/)) {
      newErrors.website = "Website must start with http:// or https://";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {mode === "create" ? "Create New Lead" : "Edit Lead"}
            </h1>
            <p className="text-gray-600">
              {mode === "create"
                ? "Add a new lead to your sales pipeline"
                : "Update lead information and details"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Basic Information */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Essential lead details and contact information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
                      placeholder="Enter lead name"
                      className={errors.name ? "border-red-500" : ""}
                    />
                    {errors.name && (
                      <p className="text-sm text-red-500 mt-1">{errors.name}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={formData.company}
                      onChange={(e) =>
                        handleInputChange("company", e.target.value)
                      }
                      placeholder="Company name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        handleInputChange("email", e.target.value)
                      }
                      placeholder="email@example.com"
                      className={errors.email ? "border-red-500" : ""}
                    />
                    {errors.email && (
                      <p className="text-sm text-red-500 mt-1">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) =>
                        handleInputChange("phone", e.target.value)
                      }
                      placeholder="+1 (555) 123-4567"
                      className={errors.phone ? "border-red-500" : ""}
                    />
                    {errors.phone && (
                      <p className="text-sm text-red-500 mt-1">
                        {errors.phone}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="alternatePhone">Alternate Phone</Label>
                    <Input
                      id="alternatePhone"
                      value={formData.alternatePhone}
                      onChange={(e) =>
                        handleInputChange("alternatePhone", e.target.value)
                      }
                      placeholder="Alternate phone number"
                    />
                  </div>

                  <div>
                    <Label htmlFor="designation">Designation</Label>
                    <Input
                      id="designation"
                      value={formData.designation}
                      onChange={(e) =>
                        handleInputChange("designation", e.target.value)
                      }
                      placeholder="Job title"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) =>
                      handleInputChange("website", e.target.value)
                    }
                    placeholder="https://company.com"
                    className={errors.website ? "border-red-500" : ""}
                  />
                  {errors.website && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.website}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Business Information */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Business Information</CardTitle>
                <CardDescription>Industry and business details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="businessCategory">Business Category</Label>
                    <Select
                      value={formData.businessCategory}
                      onValueChange={(value) =>
                        handleInputChange("businessCategory", value)
                      }
                    >
                      <SelectTrigger>
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
                  </div>

                  <div>
                    <Label htmlFor="businessIndustry">Business Industry</Label>
                    <Input
                      id="businessIndustry"
                      value={formData.businessIndustry}
                      onChange={(e) =>
                        handleInputChange("businessIndustry", e.target.value)
                      }
                      placeholder="Specific industry"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="annualRevenue">Annual Revenue</Label>
                    <Input
                      id="annualRevenue"
                      value={formData.annualRevenue}
                      onChange={(e) =>
                        handleInputChange("annualRevenue", e.target.value)
                      }
                      placeholder="Annual revenue"
                    />
                  </div>

                  <div>
                    <Label htmlFor="investmentLimit">Investment Limit</Label>
                    <Input
                      id="investmentLimit"
                      value={formData.investmentLimit}
                      onChange={(e) =>
                        handleInputChange("investmentLimit", e.target.value)
                      }
                      placeholder="Investment budget"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Location Information */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Location Information</CardTitle>
                <CardDescription>Address and location details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) =>
                      handleInputChange("address", e.target.value)
                    }
                    placeholder="Street address"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) =>
                        handleInputChange("city", e.target.value)
                      }
                      placeholder="City"
                    />
                  </div>

                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) =>
                        handleInputChange("state", e.target.value)
                      }
                      placeholder="State"
                    />
                  </div>

                  <div>
                    <Label htmlFor="pincode">Pincode</Label>
                    <Input
                      id="pincode"
                      value={formData.pincode}
                      onChange={(e) =>
                        handleInputChange("pincode", e.target.value)
                      }
                      placeholder="ZIP/Postal code"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact & Follow-up Information */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Contact & Follow-up</CardTitle>
                <CardDescription>
                  Contact history and scheduled follow-ups
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="lastContactDate">Last Contact Date</Label>
                    <Input
                      id="lastContactDate"
                      type="date"
                      value={formData.lastContactDate}
                      onChange={(e) =>
                        handleInputChange("lastContactDate", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="nextFollowUpDate">
                      Next Follow-up Date
                    </Label>
                    <Input
                      id="nextFollowUpDate"
                      type="date"
                      value={formData.nextFollowUpDate}
                      onChange={(e) =>
                        handleInputChange("nextFollowUpDate", e.target.value)
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Social Media Information */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Social Media Links</CardTitle>
                <CardDescription>
                  Social media profiles and online presence
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="linkedin">LinkedIn</Label>
                    <Input
                      id="linkedin"
                      value={formData.socialMedia?.linkedin || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          socialMedia: {
                            ...(prev.socialMedia || {}),
                            linkedin: e.target.value,
                          },
                        }))
                      }
                      placeholder="https://linkedin.com/in/username"
                    />
                  </div>
                  <div>
                    <Label htmlFor="twitter">Twitter</Label>
                    <Input
                      id="twitter"
                      value={formData.socialMedia?.twitter || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          socialMedia: {
                            ...(prev.socialMedia || {}),
                            twitter: e.target.value,
                          },
                        }))
                      }
                      placeholder="https://twitter.com/username"
                    />
                  </div>
                  <div>
                    <Label htmlFor="facebook">Facebook</Label>
                    <Input
                      id="facebook"
                      value={formData.socialMedia?.facebook || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          socialMedia: {
                            ...(prev.socialMedia || {}),
                            facebook: e.target.value,
                          },
                        }))
                      }
                      placeholder="https://facebook.com/username"
                    />
                  </div>
                  <div>
                    <Label htmlFor="instagram">Instagram</Label>
                    <Input
                      id="instagram"
                      value={formData.socialMedia?.instagram || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          socialMedia: {
                            ...(prev.socialMedia || {}),
                            instagram: e.target.value,
                          },
                        }))
                      }
                      placeholder="https://instagram.com/username"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Additional Information */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
                <CardDescription>
                  Notes and additional details about the lead
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      handleInputChange("description", e.target.value)
                    }
                    placeholder="Additional notes about the lead..."
                    rows={4}
                  />
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
                    {formData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.tags.map((tag) => (
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
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dealer Information */}
            <div className="mt-6">
              <DealerForm
                initialData={formData.dealer || {}}
                onChange={(dealerData) =>
                  setFormData((prev) => ({ ...prev, dealer: dealerData }))
                }
              />
            </div>
          </div>

          {/* Settings Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Lead Settings</CardTitle>
                <CardDescription>Status and priority settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      handleInputChange("status", value)
                    }
                  >
                    <SelectTrigger>
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
                </div>

                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) =>
                      handleInputChange("priority", value)
                    }
                  >
                    <SelectTrigger>
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
                </div>

                <div>
                  <Label htmlFor="source">Lead Source</Label>
                  <Select
                    value={formData.source}
                    onValueChange={(value) =>
                      handleInputChange("source", value)
                    }
                  >
                    <SelectTrigger>
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
                </div>

                <div>
                  <Label htmlFor="subStatus">Sub Status</Label>
                  <Select
                    value={formData.subStatus}
                    onValueChange={(value) =>
                      handleInputChange("subStatus", value)
                    }
                  >
                    <SelectTrigger>
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
                </div>

                <div>
                  <Label htmlFor="convertedStatus">Converted Status</Label>
                  <Select
                    value={formData.convertedStatus}
                    onValueChange={(value) =>
                      handleInputChange("convertedStatus", value)
                    }
                  >
                    <SelectTrigger>
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
                </div>

                <div>
                  <Label htmlFor="leadScore">Lead Score (0-100)</Label>
                  <Input
                    id="leadScore"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.leadScore.toString()}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        leadScore: parseInt(e.target.value) || 0,
                      }))
                    }
                    placeholder="Enter lead score"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Form Actions */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <Button type="submit" className="w-full" disabled={isLoading}>
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
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
