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
