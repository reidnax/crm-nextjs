import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Status color utility functions
export function getStatusColor(status?: string) {
  switch (status?.toLowerCase()) {
    case "new":
      return "bg-blue-100 text-blue-800";
    case "unassigned":
      return "bg-gray-100 text-gray-800";
    case "to be contacted":
      return "bg-yellow-100 text-yellow-800";
    case "attempted to contact":
      return "bg-orange-100 text-orange-800";
    case "contacted":
      return "bg-indigo-100 text-indigo-800";
    case "contact in future":
      return "bg-purple-100 text-purple-800";
    case "qualified":
      return "bg-green-100 text-green-800";
    case "not qualified":
      return "bg-red-100 text-red-800";
    case "meeting":
      return "bg-blue-100 text-blue-800";
    case "product/plant visit":
      return "bg-teal-100 text-teal-800";
    case "converted":
      return "bg-emerald-100 text-emerald-800";
    case "not converted":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export function getSubStatusColor(subStatus?: string) {
  switch (subStatus?.toLowerCase()) {
    case "hot":
      return "bg-red-100 text-red-800";
    case "warm":
      return "bg-orange-100 text-orange-800";
    case "cold":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export function getPriorityColor(priority?: string) {
  switch (priority?.toLowerCase()) {
    case "high":
      return "bg-red-100 text-red-700";
    case "medium":
      return "bg-yellow-100 text-yellow-700";
    case "low":
      return "bg-green-100 text-green-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export function getTaskStatusColor(status?: string) {
  switch (status?.toLowerCase()) {
    case "pending":
      return "bg-yellow-100 text-yellow-700";
    case "in progress":
      return "bg-blue-100 text-blue-700";
    case "completed":
      return "bg-green-100 text-green-700";
    case "cancelled":
      return "bg-red-100 text-red-700";
    case "on hold":
      return "bg-gray-100 text-gray-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}
