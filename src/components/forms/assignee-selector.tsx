"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronsUpDown, X, Loader2 } from "lucide-react";

interface Assignee {
  id: number;
  name: string;
  username?: string;
  email?: string;
  active?: boolean;
  role?: string;
  _count?: {
    assignedLeads: number;
  };
}

interface AssigneeSelectorProps {
  selectedAssignees: string[];
  onAssigneesChange: (assignees: string[]) => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export const AssigneeSelector = React.memo(
  ({
    selectedAssignees,
    onAssigneesChange,
    isLoading: parentLoading = false,
    placeholder = "Select assignees...",
    disabled = false,
  }: AssigneeSelectorProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
    const [assignees, setAssignees] = useState<Assignee[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);
    const isSearchingRef = useRef(false);

    // Debounce search term
    useEffect(() => {
      const timer = setTimeout(() => {
        setDebouncedSearchTerm(searchTerm);
        setPage(1); // Reset page when search changes
      }, 300);

      return () => clearTimeout(timer);
    }, [searchTerm]);

    // Fetch assignees from API
    const fetchAssignees = useCallback(
      async (searchQuery: string, pageNum: number, reset = false) => {
        if (isSearchingRef.current && !reset) return;

        isSearchingRef.current = true;
        setIsSearching(true);
        try {
          const params = new URLSearchParams({
            page: pageNum.toString(),
            pageSize: "20",
          });

          if (searchQuery.trim() !== "") {
            params.append("search", searchQuery);
          }

          const response = await fetch(`/api/assignees?${params}`);
          const result = await response.json();

          if (result.success) {
            // Filter to only include active users
            const newAssignees = result.data.assignees.filter(
              (assignee: Assignee) => assignee.active !== false
            );

            if (reset || pageNum === 1) {
              setAssignees(newAssignees);
            } else {
              setAssignees((prev) => [...prev, ...newAssignees]);
            }

            setHasMore(pageNum < result.data.pagination.totalPages);
          } else {
            console.error("Failed to fetch assignees:", result.error);
          }
        } catch (error) {
          console.error("Error fetching assignees:", error);
        } finally {
          isSearchingRef.current = false;
          setIsSearching(false);
        }
      },
      [] // No dependencies to prevent recreation
    );

    // Load assignees when component opens or search changes
    useEffect(() => {
      if (isOpen) {
        fetchAssignees(debouncedSearchTerm, 1, true);
      }
    }, [isOpen, debouncedSearchTerm, fetchAssignees]);

    // Load more assignees
    const loadMore = useCallback(() => {
      if (hasMore && !isSearchingRef.current) {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchAssignees(debouncedSearchTerm, nextPage, false);
      }
    }, [hasMore, page, debouncedSearchTerm, fetchAssignees]);

    const handleAssigneeToggle = useCallback(
      (assigneeName: string) => {
        const isSelected = selectedAssignees.includes(assigneeName);
        if (isSelected) {
          onAssigneesChange(
            selectedAssignees.filter((name) => name !== assigneeName)
          );
        } else {
          onAssigneesChange([...selectedAssignees, assigneeName]);
        }
      },
      [selectedAssignees, onAssigneesChange]
    );

    const handleOpenChange = useCallback((open: boolean) => {
      setIsOpen(open);
      if (!open) {
        setSearchTerm("");
        setPage(1);
      }
    }, []);

    const handleRemoveAssignee = useCallback(
      (assigneeName: string) => {
        onAssigneesChange(
          selectedAssignees.filter((name) => name !== assigneeName)
        );
      },
      [selectedAssignees, onAssigneesChange]
    );

    return (
      <div className="space-y-3">
        <Label className="text-sm font-medium text-gray-900">Assigned To</Label>

        <Popover open={isOpen} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={isOpen}
              className="w-full justify-between text-sm h-9"
              disabled={disabled || parentLoading}
            >
              {selectedAssignees.length > 0
                ? `${selectedAssignees.length} selected`
                : placeholder}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>

          <PopoverContent
            className="w-full p-0"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Search assignees..."
                value={searchTerm}
                onValueChange={setSearchTerm}
                className="h-9"
              />

              <CommandEmpty>
                {isSearching ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Searching...
                  </div>
                ) : searchTerm ? (
                  "No assignee found."
                ) : (
                  "No assignees available."
                )}
              </CommandEmpty>

              <CommandGroup>
                <CommandList className="max-h-48">
                  {assignees.map((assignee) => (
                    <CommandItem
                      key={assignee.id}
                      value={assignee.name}
                      onSelect={() => {
                        handleAssigneeToggle(assignee.name);
                      }}
                      className="cursor-pointer"
                    >
                      <div
                        className="flex items-center space-x-2 w-full"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={selectedAssignees.includes(assignee.name)}
                          onCheckedChange={() =>
                            handleAssigneeToggle(assignee.name)
                          }
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1">
                          <span className="font-medium">{assignee.name}</span>
                          {assignee._count && (
                            <span className="text-xs text-gray-500 ml-1">
                              ({assignee._count.assignedLeads} leads)
                            </span>
                          )}
                        </div>
                      </div>
                    </CommandItem>
                  ))}

                  {/* Load more button */}
                  {hasMore && !isSearching && assignees.length > 0 && (
                    <CommandItem
                      onSelect={loadMore}
                      className="cursor-pointer justify-center text-blue-600 hover:text-blue-800"
                    >
                      Load more...
                    </CommandItem>
                  )}

                  {/* Loading indicator */}
                  {isSearching && assignees.length > 0 && (
                    <CommandItem className="justify-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Loading...
                    </CommandItem>
                  )}
                </CommandList>
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Selected Assignees */}
        {selectedAssignees.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {selectedAssignees.map((assigneeName) => (
              <Badge
                key={assigneeName}
                variant="secondary"
                className="text-xs gap-1 pl-2 pr-1 flex items-center"
              >
                <span>{assigneeName}</span>
                <button
                  type="button"
                  className="ml-1 p-0.5 hover:bg-red-100 rounded-sm transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRemoveAssignee(assigneeName);
                  }}
                >
                  <X className="h-3 w-3 text-gray-500 hover:text-red-600" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  }
);

AssigneeSelector.displayName = "AssigneeSelector";
