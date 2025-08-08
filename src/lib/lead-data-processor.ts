/**
 * Processes lead form data to ensure compatibility with Prisma schema
 * Converts empty strings to null for date fields and handles numeric fields
 * Filters out read-only and relation fields that cannot be updated
 */
export function processLeadData(
  data: Record<string, any>
): Record<string, any> {
  // Define fields that are allowed to be updated
  const allowedFields = [
    "name",
    "email",
    "phone",
    "alternatePhone",
    "company",
    "businessCategory",
    "businessIndustry",
    "status",
    "subStatus",
    "convertedStatus",
    "priority",
    "state",
    "city",
    "address",
    "pincode",
    "website",
    "description",
    "designation",
    "annualRevenue",
    "investmentLimit",
    "source",
    "tags",
    "dealer",
    "socialMedia",
    "lastContactDate",
    "nextFollowUpDate",
    "leadScore",
    "assign", // Can be updated (assignee relationship)
    "isArchived",
    "customFields",
  ];

  // Filter data to only include allowed fields
  const processedData: Record<string, any> = {};
  allowedFields.forEach((field) => {
    if (data.hasOwnProperty(field)) {
      processedData[field] = data[field];
    }
  });

  // Handle date fields that might be empty strings
  const dateFields = ["lastContactDate", "nextFollowUpDate"];
  dateFields.forEach((field) => {
    if (processedData[field] === "" || processedData[field] === undefined) {
      processedData[field] = null;
    } else if (
      processedData[field] &&
      typeof processedData[field] === "string"
    ) {
      // Validate and convert to proper date format if it's a string
      const date = new Date(processedData[field]);
      if (isNaN(date.getTime())) {
        processedData[field] = null;
      } else {
        processedData[field] = date.toISOString();
      }
    }
  });

  // Handle numeric fields that might be empty strings
  const numericFields = ["leadScore"];
  numericFields.forEach((field) => {
    if (processedData[field] === "" || processedData[field] === undefined) {
      processedData[field] = 0;
    } else if (typeof processedData[field] === "string") {
      const num = parseFloat(processedData[field]);
      processedData[field] = isNaN(num) ? 0 : num;
    }
  });

  // Handle decimal fields that might be empty strings (stored as Decimal in DB)
  const decimalFields = ["annualRevenue", "investmentLimit"];
  decimalFields.forEach((field) => {
    if (processedData[field] === "" || processedData[field] === undefined) {
      processedData[field] = null; // Use null for empty decimal fields
    } else if (typeof processedData[field] === "string") {
      // Remove currency symbols and commas for processing
      const cleanValue = processedData[field].replace(/[\$₹€£¥,\s]/g, "");
      if (cleanValue === "") {
        processedData[field] = null;
      } else {
        const num = parseFloat(cleanValue);
        processedData[field] = isNaN(num) ? null : num;
      }
    }
  });

  // Handle string fields that should be null when empty (for database storage)
  const stringFields = [
    "email",
    "phone",
    "alternatePhone",
    "company",
    "businessCategory",
    "businessIndustry",
    "subStatus",
    "convertedStatus",
    "state",
    "city",
    "address",
    "pincode",
    "website",
    "description",
    "designation",
    "source",
  ];
  stringFields.forEach((field) => {
    if (processedData[field] === "" || processedData[field] === undefined) {
      processedData[field] = null;
    }
  });

  return processedData;
}

/**
 * Processes lead data for partial updates (PATCH requests)
 * Only processes fields that are actually present in the input data
 * Does not set missing fields to null
 */
export function processLeadDataPartial(
  data: Record<string, any>
): Record<string, any> {
  // Define fields that are allowed to be updated
  const allowedFields = [
    "name",
    "email",
    "phone",
    "alternatePhone",
    "company",
    "businessCategory",
    "businessIndustry",
    "status",
    "subStatus",
    "convertedStatus",
    "priority",
    "state",
    "city",
    "address",
    "pincode",
    "website",
    "description",
    "designation",
    "annualRevenue",
    "investmentLimit",
    "source",
    "tags",
    "dealer",
    "socialMedia",
    "lastContactDate",
    "nextFollowUpDate",
    "leadScore",
    "assign", // Can be updated (assignee relationship)
    "isArchived",
    "customFields",
  ];

  // Only process fields that are actually present in the input data
  const processedData: Record<string, any> = {};

  Object.keys(data).forEach((field) => {
    if (allowedFields.includes(field)) {
      processedData[field] = data[field];
    }
  });

  // Handle date fields that might be empty strings (only if present)
  const dateFields = ["lastContactDate", "nextFollowUpDate"];
  dateFields.forEach((field) => {
    if (processedData.hasOwnProperty(field)) {
      if (processedData[field] === "" || processedData[field] === undefined) {
        processedData[field] = null;
      } else if (
        processedData[field] &&
        typeof processedData[field] === "string"
      ) {
        // Validate and convert to proper date format if it's a string
        const date = new Date(processedData[field]);
        if (isNaN(date.getTime())) {
          processedData[field] = null;
        } else {
          processedData[field] = date.toISOString();
        }
      }
    }
  });

  // Handle numeric fields that might be empty strings (only if present)
  const numericFields = ["leadScore"];
  numericFields.forEach((field) => {
    if (processedData.hasOwnProperty(field)) {
      if (processedData[field] === "" || processedData[field] === undefined) {
        processedData[field] = 0;
      } else if (typeof processedData[field] === "string") {
        const num = parseFloat(processedData[field]);
        processedData[field] = isNaN(num) ? 0 : num;
      }
    }
  });

  // Handle decimal fields that might be empty strings (only if present)
  const decimalFields = ["annualRevenue", "investmentLimit"];
  decimalFields.forEach((field) => {
    if (processedData.hasOwnProperty(field)) {
      if (processedData[field] === "" || processedData[field] === undefined) {
        processedData[field] = null;
      } else if (typeof processedData[field] === "string") {
        // Remove currency symbols and commas for processing
        const cleanValue = processedData[field].replace(/[\$₹€£¥,\s]/g, "");
        if (cleanValue === "") {
          processedData[field] = null;
        } else {
          const num = parseFloat(cleanValue);
          processedData[field] = isNaN(num) ? null : num;
        }
      }
    }
  });

  // Handle string fields that should be null when empty (only if present)
  const stringFields = [
    "email",
    "phone",
    "alternatePhone",
    "company",
    "businessCategory",
    "businessIndustry",
    "subStatus",
    "convertedStatus",
    "state",
    "city",
    "address",
    "pincode",
    "website",
    "description",
    "designation",
    "source",
  ];
  stringFields.forEach((field) => {
    if (processedData.hasOwnProperty(field)) {
      if (processedData[field] === "" || processedData[field] === undefined) {
        processedData[field] = null;
      }
    }
  });

  return processedData;
}

/**
 * Processes single field updates (PATCH requests with one field)
 * Returns only the field being updated without any transforms
 */
export function processSingleFieldUpdate(
  field: string,
  value: any
): Record<string, any> {
  const processedData: Record<string, any> = {};

  // Handle specific field transformations only if needed
  if (field === "leadScore") {
    // Convert string to number for leadScore
    processedData[field] =
      typeof value === "string" ? parseFloat(value) : value;
  } else if (field === "lastContactDate" || field === "nextFollowUpDate") {
    // Handle date fields
    if (value === "" || value === undefined || value === null) {
      processedData[field] = null;
    } else if (typeof value === "string") {
      const date = new Date(value);
      processedData[field] = isNaN(date.getTime()) ? null : date.toISOString();
    } else {
      processedData[field] = value;
    }
  } else if (["annualRevenue", "investmentLimit"].includes(field)) {
    // Handle decimal fields
    if (value === "" || value === undefined || value === null) {
      processedData[field] = null;
    } else if (typeof value === "string") {
      const cleanValue = value.replace(/[\$₹€£¥,\s]/g, "");
      if (cleanValue === "") {
        processedData[field] = null;
      } else {
        const num = parseFloat(cleanValue);
        processedData[field] = isNaN(num) ? null : num;
      }
    } else {
      processedData[field] = value;
    }
  } else {
    // For all other fields, use the value as-is
    processedData[field] = value;
  }

  return processedData;
}
