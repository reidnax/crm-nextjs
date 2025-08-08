"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Check, ChevronsUpDown, Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";

interface Lead {
  id: number;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
}

interface LeadSelectorProps {
  selectedLeadId?: number;
  onLeadSelect: (leadId: number | undefined) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export default function LeadSelector({
  selectedLeadId,
  onLeadSelect,
  placeholder = "Select a lead",
  label = "Lead",
  required = false,
  error,
  disabled = false,
  className = "",
}: LeadSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Loading states
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const PAGE_SIZE = 25;
  const SEARCH_DELAY = 300;

  // Debounced search term
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, SEARCH_DELAY);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch leads function
  const fetchLeads = useCallback(
    async (page: number, search: string = "", append: boolean = false) => {
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          pageSize: PAGE_SIZE.toString(),
          ...(search && { search }),
        });

        const response = await fetch(`/api/leads?${params.toString()}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
          const newLeads = Array.isArray(result.data?.leads)
            ? result.data.leads
            : Array.isArray(result.data)
            ? result.data
            : [];

          const pagination = result.data?.pagination;

          setLeads((prev) => (append ? [...prev, ...newLeads] : newLeads));
          setCurrentPage(page);
          setTotalPages(pagination?.totalPages || 1);
          setHasMore(page < (pagination?.totalPages || 1));

          return newLeads;
        } else {
          throw new Error(result.error || "Failed to fetch leads");
        }
      } catch (error) {
        console.error("Error fetching leads:", error);
        if (!append) {
          setLeads([]);
          setHasMore(false);
        }
        return [];
      }
    },
    []
  );

  // Load selected lead details if selectedLeadId is provided
  useEffect(() => {
    if (selectedLeadId && !selectedLead) {
      const loadSelectedLead = async () => {
        try {
          const response = await fetch(`/api/leads/${selectedLeadId}`, {
            cache: "no-store",
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
              setSelectedLead({
                id: result.data.id,
                name: result.data.name,
                company: result.data.company,
                email: result.data.email,
                phone: result.data.phone,
              });
            }
          }
        } catch (error) {
          console.error("Error loading selected lead:", error);
        }
      };

      loadSelectedLead();
    }
  }, [selectedLeadId, selectedLead]);

  // Initial load when popover opens
  useEffect(() => {
    if (isOpen && leads.length === 0) {
      setIsInitialLoading(true);
      fetchLeads(1).finally(() => setIsInitialLoading(false));
    }
  }, [isOpen, leads.length, fetchLeads]);

  // Search effect
  useEffect(() => {
    if (!isOpen) return;

    setIsSearching(true);
    setCurrentPage(1);
    fetchLeads(1, debouncedSearch).finally(() => setIsSearching(false));
  }, [debouncedSearch, isOpen, fetchLeads]);

  // Load more function
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      await fetchLeads(currentPage + 1, debouncedSearch, true);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, currentPage, debouncedSearch, fetchLeads]);

  // Handle lead selection
  const handleSelectLead = useCallback(
    (lead: Lead) => {
      setSelectedLead(lead);
      onLeadSelect(lead.id);
      setIsOpen(false);
      setSearchTerm("");
    },
    [onLeadSelect]
  );

  // Handle clear selection
  const handleClearSelection = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedLead(null);
      onLeadSelect(undefined);
    },
    [onLeadSelect]
  );

  // Reset state when popover closes
  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSearchTerm("");
      setDebouncedSearch("");
    }
  }, []);

  // Format display text for selected lead
  const selectedDisplayText = useMemo(() => {
    if (!selectedLead) return placeholder;

    const parts = [selectedLead.name];
    if (selectedLead.company) {
      parts.push(`(${selectedLead.company})`);
    }
    return parts.join(" ");
  }, [selectedLead, placeholder]);

  // Determine loading state
  const isLoading = isInitialLoading || isSearching;

  return (
    <div className={className}>
      {label && (
        <Label htmlFor="lead-selector" className="mb-2 block">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}

      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            id="lead-selector"
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            disabled={disabled}
            className={`w-full justify-between ${
              error ? "border-red-500 focus:border-red-500" : ""
            }`}
          >
            <span className="truncate text-left">{selectedDisplayText}</span>
            <div className="flex items-center gap-1">
              {selectedLead && !disabled && (
                <X
                  className="h-4 w-4 opacity-50 hover:opacity-100"
                  onClick={handleClearSelection}
                />
              )}
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[420px] p-0" align="start">
          <Command shouldFilter={false}>
            <div className="flex items-center border-b px-3">
              <Search className="h-4 w-4 shrink-0 opacity-50" />
              <CommandInput
                placeholder="Search leads by name, company, email..."
                value={searchTerm}
                onValueChange={setSearchTerm}
                className="border-0 focus:ring-0"
              />
            </div>

            <CommandList className="max-h-[300px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="ml-2 text-sm text-muted-foreground">
                    {isInitialLoading ? "Loading leads..." : "Searching..."}
                  </span>
                </div>
              ) : leads.length === 0 ? (
                <CommandEmpty className="py-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      No leads found
                    </p>
                    {debouncedSearch && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Try adjusting your search terms
                      </p>
                    )}
                  </div>
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  {leads.map((lead) => (
                    <CommandItem
                      key={lead.id}
                      value={lead.id.toString()}
                      onSelect={() => handleSelectLead(lead)}
                      className="cursor-pointer px-3 py-2"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">
                              {lead.name}
                            </span>
                            {selectedLeadId === lead.id && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </div>

                          <div className="flex flex-wrap gap-1 mt-1">
                            {lead.company && (
                              <Badge variant="secondary" className="text-xs">
                                {lead.company}
                              </Badge>
                            )}
                            {lead.email && (
                              <span className="text-xs text-muted-foreground truncate">
                                {lead.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CommandItem>
                  ))}

                  {hasMore && (
                    <div className="border-t p-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={loadMore}
                        disabled={isLoadingMore}
                      >
                        {isLoadingMore ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Loading more...
                          </>
                        ) : (
                          `Load more (${leads.length} of many)`
                        )}
                      </Button>
                    </div>
                  )}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}
