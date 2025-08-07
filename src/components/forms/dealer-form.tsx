"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

interface DealerField {
  key: string;
  label: string;
  hindi: string;
  type: string;
  required: boolean;
  options?: string[];
}

const DEALER_FORM_FIELDS: DealerField[] = [
  {
    key: "evBusiness",
    label: "What are you doing in EV Business right now?",
    hindi: "आप अभी ईवी बिजनेस में क्या कर रहे हैं?",
    type: "text",
    required: true,
  },
  {
    key: "evBusinessStatus",
    label: "How is EV business working for you?",
    hindi: "ईवी व्यवसाय आपके लिए कैसे काम कर रहा है?",
    type: "text",
    required: true,
  },
  {
    key: "longTermGoals",
    label: "What are your long-term goals in this area?",
    hindi: "इस क्षेत्र में आपके दीर्घकालिक लक्ष्य क्या हैं?",
    type: "text",
    required: true,
  },
  {
    key: "achieveAvoid",
    label: "What are you trying to achieve / avoid in this area?",
    hindi: "आप इस क्षेत्र में क्या हासिल करने / बचने की कोशिश कर रहे हैं?",
    type: "text",
    required: true,
  },
  {
    key: "goalBarrier",
    label: "What is stopping you from completing your goal?",
    hindi: "आपको अपना लक्ष्य पूरा करने से कौन रोक रहा है?",
    type: "text",
    required: true,
  },
  {
    key: "problems",
    label:
      "What sort of problems/frustrations are you experiencing in this area?",
    hindi:
      "आप इस क्षेत्र में किस प्रकार की समस्याओं/निराशाओं का सामना कर रहे हैं?",
    type: "checkbox",
    required: true,
    options: [
      "FINANCE",
      "SERVICE",
      "RESPONSE",
      "PRODUCT QUALITY",
      "PRODUCT COST",
      "KNOWLEDGE",
      "MONEY",
    ],
  },
  {
    key: "improvementInterest",
    label:
      "If I could show you a way to greatly improve your activities in this area, would you be interested?",
    hindi:
      "अगर मैं आपको इस क्षेत्र में अपनी गतिविधियों को बेहतर बनाने का कोई रास्ता दिखा सकूं, तो क्या आप इसे देखने में रुचि लेंगे?",
    type: "text",
    required: true,
  },
];

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

interface DealerFormProps {
  initialData?: DealerFormData;
  onChange: (data: DealerFormData) => void;
}

export default function DealerForm({
  initialData = {},
  onChange,
}: DealerFormProps) {
  const getFormattedDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0]; // yyyy-mm-dd format
  };

  const [formData, setFormData] = useState<DealerFormData>({
    date: getFormattedDate(),
    ...initialData,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (key: string, value: string) => {
    const updatedData = { ...formData, [key]: value };
    setFormData(updatedData);
    onChange(updatedData);

    // Clear error when user starts typing
    if (errors[key]) {
      setErrors({ ...errors, [key]: "" });
    }
  };

  const handleCheckboxChange = (
    key: string,
    option: string,
    checked: boolean
  ) => {
    const currentValues = (formData[key] as string[]) || [];
    const newValues = checked
      ? [...currentValues, option]
      : currentValues.filter((v) => v !== option);

    const updatedData = { ...formData, [key]: newValues };
    setFormData(updatedData);
    onChange(updatedData);

    // Validate that required checkbox fields have at least one selection
    const field = DEALER_FORM_FIELDS.find((f) => f.key === key);
    if (field?.required) {
      setErrors({
        ...errors,
        [key]: newValues.length ? "" : "Please select at least one option",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dealer Information</CardTitle>
        <p className="text-sm text-gray-600">
          Business-specific details for EV dealer assessment
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {DEALER_FORM_FIELDS.map((field) => (
          <div key={field.key}>
            {field.type === "checkbox" ? (
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  {field.label}
                  {field.required && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </Label>
                <p className="text-xs text-gray-500">{field.hindi}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {field.options?.map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <Checkbox
                        id={`${field.key}-${option}`}
                        checked={(
                          (formData[
                            field.key as keyof DealerFormData
                          ] as string[]) || []
                        ).includes(option)}
                        onCheckedChange={(checked) =>
                          handleCheckboxChange(
                            field.key,
                            option,
                            checked as boolean
                          )
                        }
                      />
                      <Label
                        htmlFor={`${field.key}-${option}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {option}
                      </Label>
                    </div>
                  ))}
                </div>
                {errors[field.key] && (
                  <p className="text-sm text-red-500">{errors[field.key]}</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor={field.key} className="text-sm font-medium">
                  {field.label}
                  {field.required && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </Label>
                <p className="text-xs text-gray-500">{field.hindi}</p>
                <Textarea
                  id={field.key}
                  value={
                    (formData[field.key as keyof DealerFormData] as string) ||
                    ""
                  }
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  placeholder="Enter your response..."
                  rows={3}
                  className={errors[field.key] ? "border-red-500" : ""}
                />
                {errors[field.key] && (
                  <p className="text-sm text-red-500">{errors[field.key]}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
