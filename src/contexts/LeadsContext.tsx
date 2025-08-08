"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { FilterValues } from "@/components/leads/leads-filters";

export interface LeadsState {
  filters: FilterValues;
  pagination: {
    currentPage: number;
    pageSize: number;
  };
  isLoading: boolean;
}

export type LeadsAction =
  | { type: "SET_FILTERS"; payload: FilterValues }
  | { type: "CLEAR_FILTERS" }
  | { type: "SET_PAGE"; payload: number }
  | { type: "SET_PAGE_SIZE"; payload: number }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "RESET_PAGINATION" }
  | {
      type: "INIT_FROM_URL";
      payload: {
        filters: FilterValues;
        pagination: { currentPage: number; pageSize: number };
      };
    };

const initialState: LeadsState = {
  filters: {
    search: "",
    status: [],
    subStatus: [],
    priority: [],
    assignee: [],
    businessCategory: [],
    businessIndustry: [],
    city: [],
    state: [],
  },
  pagination: {
    currentPage: 1,
    pageSize: 15,
  },
  isLoading: false,
};

function leadsReducer(state: LeadsState, action: LeadsAction): LeadsState {
  switch (action.type) {
    case "SET_FILTERS":
      return {
        ...state,
        filters: action.payload,
        pagination: { ...state.pagination, currentPage: 1 }, // Reset to page 1 on filter change
      };
    case "CLEAR_FILTERS":
      return {
        ...state,
        filters: initialState.filters,
        pagination: { ...state.pagination, currentPage: 1 },
      };
    case "SET_PAGE":
      return {
        ...state,
        pagination: { ...state.pagination, currentPage: action.payload },
      };
    case "SET_PAGE_SIZE":
      return {
        ...state,
        pagination: { currentPage: 1, pageSize: action.payload },
      };
    case "SET_LOADING":
      return {
        ...state,
        isLoading: action.payload,
      };
    case "RESET_PAGINATION":
      return {
        ...state,
        pagination: { ...state.pagination, currentPage: 1 },
      };
    case "INIT_FROM_URL":
      return {
        ...state,
        filters: action.payload.filters,
        pagination: action.payload.pagination,
      };
    default:
      return state;
  }
}

interface LeadsContextType {
  state: LeadsState;
  isInitialized: boolean;
  setFilters: (filters: FilterValues) => void;
  clearFilters: () => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setLoading: (loading: boolean) => void;
  resetPagination: () => void;
}

const LeadsContext = createContext<LeadsContextType | undefined>(undefined);

// URL synchronization utilities
function serializeStateToURL(
  filters: FilterValues,
  pagination: { currentPage: number; pageSize: number }
): string {
  const params = new URLSearchParams();

  // Add filters
  if (filters.search.trim()) {
    params.set("search", filters.search.trim());
  }
  filters.status.forEach((status) => params.append("status", status));
  filters.subStatus.forEach((subStatus) =>
    params.append("subStatus", subStatus)
  );
  filters.priority.forEach((priority) => params.append("priority", priority));
  filters.assignee.forEach((assignee) => params.append("assignee", assignee));
  filters.businessCategory.forEach((category) =>
    params.append("businessCategory", category)
  );
  filters.businessIndustry.forEach((industry) =>
    params.append("businessIndustry", industry)
  );
  filters.city.forEach((city) => params.append("city", city));
  filters.state.forEach((state) => params.append("state", state));

  // Add pagination
  if (pagination.currentPage !== 1) {
    params.set("page", pagination.currentPage.toString());
  }
  if (pagination.pageSize !== 15) {
    params.set("pageSize", pagination.pageSize.toString());
  }

  return params.toString();
}

function parseURLToState(searchParams: URLSearchParams): {
  filters: FilterValues;
  pagination: { currentPage: number; pageSize: number };
} {
  const filters: FilterValues = {
    search: searchParams.get("search") || "",
    status: searchParams.getAll("status"),
    subStatus: searchParams.getAll("subStatus"),
    priority: searchParams.getAll("priority"),
    assignee: searchParams.getAll("assignee"),
    businessCategory: searchParams.getAll("businessCategory"),
    businessIndustry: searchParams.getAll("businessIndustry"),
    city: searchParams.getAll("city"),
    state: searchParams.getAll("state"),
  };

  const pagination = {
    currentPage: parseInt(searchParams.get("page") || "1", 10),
    pageSize: parseInt(searchParams.get("pageSize") || "15", 10),
  };

  return { filters, pagination };
}

export function LeadsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(leadsReducer, initialState);
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize state from URL on mount
  useEffect(() => {
    const urlState = parseURLToState(searchParams);
    dispatch({ type: "INIT_FROM_URL", payload: urlState });
    setIsInitialized(true);
  }, [searchParams]);

  // Update URL when state changes (but only after initialization)
  useEffect(() => {
    if (!isInitialized) return;

    const urlString = serializeStateToURL(state.filters, state.pagination);
    const currentSearchParams = new URLSearchParams(window.location.search);
    const currentUrlString = currentSearchParams.toString();

    // Normalize both strings for comparison (handle empty vs undefined params)
    const normalizeUrlString = (str: string) => {
      if (!str) return "";
      const params = new URLSearchParams(str);
      // Remove empty parameters
      for (const [key, value] of Array.from(params.entries())) {
        if (!value) params.delete(key);
      }
      return params.toString();
    };

    const normalizedNew = normalizeUrlString(urlString);
    const normalizedCurrent = normalizeUrlString(currentUrlString);

    // Only update URL if the state has actually changed
    if (normalizedNew !== normalizedCurrent) {
      const newUrl = `/leads${normalizedNew ? `?${normalizedNew}` : ""}`;
      router.replace(newUrl, { scroll: false });
    }
  }, [state.filters, state.pagination, router, isInitialized]);

  const setFilters = useCallback((filters: FilterValues) => {
    dispatch({ type: "SET_FILTERS", payload: filters });
  }, []);

  const clearFilters = useCallback(() => {
    dispatch({ type: "CLEAR_FILTERS" });
  }, []);

  const setPage = useCallback((page: number) => {
    dispatch({ type: "SET_PAGE", payload: page });
  }, []);

  const setPageSize = useCallback((pageSize: number) => {
    dispatch({ type: "SET_PAGE_SIZE", payload: pageSize });
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: "SET_LOADING", payload: loading });
  }, []);

  const resetPagination = useCallback(() => {
    dispatch({ type: "RESET_PAGINATION" });
  }, []);

  return (
    <LeadsContext.Provider
      value={{
        state,
        isInitialized,
        setFilters,
        clearFilters,
        setPage,
        setPageSize,
        setLoading,
        resetPagination,
      }}
    >
      {children}
    </LeadsContext.Provider>
  );
}

export function useLeads() {
  const context = useContext(LeadsContext);
  if (context === undefined) {
    throw new Error("useLeads must be used within a LeadsProvider");
  }
  return context;
}
