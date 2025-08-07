"use client";

import React, { useState, memo } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import {
  getStatusColor,
  getSubStatusColor,
  getPriorityColor,
} from "@/lib/utils";

interface Assignee {
  id: number;
  name: string;
  username?: string;
  email?: string;
  active?: boolean;
  role?: string;
}

// Status Dropdown Component
export const StatusDropdown = memo(
  ({
    currentStatus,
    onStatusChange,
    className = "",
    isUpdating = false,
  }: {
    currentStatus?: string;
    onStatusChange: (status: string) => void;
    className?: string;
    isUpdating?: boolean;
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Status options from lead-form.tsx
    const statusOptions = [
      "New",
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

    const handleStatusChange = async (status: string) => {
      setIsLoading(true);
      try {
        await onStatusChange(status);
      } catch (error) {
        console.error("Error updating status:", error);
      } finally {
        setIsLoading(false);
        setIsOpen(false);
      }
    };

    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 px-2 justify-between w-full max-w-[180px] ${className}`}
          >
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium truncate ${getStatusColor(
                currentStatus
              )}`}
            >
              {isLoading || isUpdating ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin inline" />
              ) : null}
              {currentStatus || "New"}
            </span>
            <ChevronsUpDown className="h-3 w-3 opacity-50 ml-1" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-0">
          <Command>
            <CommandList>
              <CommandGroup>
                {statusOptions.map((status) => (
                  <CommandItem
                    key={status}
                    onSelect={() => handleStatusChange(status)}
                    className="cursor-pointer"
                  >
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                        status
                      )}`}
                    >
                      {status}
                    </span>
                    {currentStatus === status && (
                      <Check className="h-4 w-4 ml-auto" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }
);

StatusDropdown.displayName = "StatusDropdown";

// SubStatus Dropdown Component
export const SubStatusDropdown = memo(
  ({
    currentSubStatus,
    onSubStatusChange,
    className = "",
    isUpdating = false,
  }: {
    currentSubStatus?: string;
    onSubStatusChange: (subStatus: string | undefined) => void;
    className?: string;
    isUpdating?: boolean;
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const subStatusOptions = ["Hot", "Warm", "Cold"];

    const handleSubStatusChange = async (subStatus: string | undefined) => {
      setIsLoading(true);
      try {
        await onSubStatusChange(subStatus);
      } catch (error) {
        console.error("Error updating sub status:", error);
      } finally {
        setIsLoading(false);
        setIsOpen(false);
      }
    };

    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 px-2 justify-between w-full max-w-[180px] ${className}`}
          >
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium truncate ${getSubStatusColor(
                currentSubStatus
              )}`}
            >
              {isLoading || isUpdating ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin inline" />
              ) : null}
              {currentSubStatus || "None"}
            </span>
            <ChevronsUpDown className="h-3 w-3 opacity-50 ml-1" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[180px] p-0">
          <Command>
            <CommandList>
              <CommandGroup>
                {subStatusOptions.map((subStatus) => (
                  <CommandItem
                    key={subStatus}
                    onSelect={() => handleSubStatusChange(subStatus)}
                    className="cursor-pointer"
                  >
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSubStatusColor(
                        subStatus
                      )}`}
                    >
                      {subStatus}
                    </span>
                    {currentSubStatus === subStatus && (
                      <Check className="h-4 w-4 ml-auto" />
                    )}
                  </CommandItem>
                ))}
                <CommandItem
                  onSelect={() => handleSubStatusChange(undefined)}
                  className="cursor-pointer text-gray-500"
                >
                  <span>None</span>
                  {!currentSubStatus && <Check className="h-4 w-4 ml-auto" />}
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }
);

SubStatusDropdown.displayName = "SubStatusDropdown";

// Priority Dropdown Component
export const PriorityDropdown = memo(
  ({
    currentPriority,
    onPriorityChange,
    className = "",
    isUpdating = false,
  }: {
    currentPriority?: string;
    onPriorityChange: (priority: string) => void;
    className?: string;
    isUpdating?: boolean;
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const priorityOptions = ["High", "Medium", "Low"];

    const handlePriorityChange = async (priority: string) => {
      setIsLoading(true);
      try {
        await onPriorityChange(priority);
      } catch (error) {
        console.error("Error updating priority:", error);
      } finally {
        setIsLoading(false);
        setIsOpen(false);
      }
    };

    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 px-2 justify-between w-full max-w-[180px] ${className}`}
          >
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium truncate ${getPriorityColor(
                currentPriority
              )}`}
            >
              {isLoading || isUpdating ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin inline" />
              ) : null}
              {currentPriority || "Medium"}
            </span>
            <ChevronsUpDown className="h-3 w-3 opacity-50 ml-1" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[180px] p-0">
          <Command>
            <CommandList>
              <CommandGroup>
                {priorityOptions.map((priority) => (
                  <CommandItem
                    key={priority}
                    onSelect={() => handlePriorityChange(priority)}
                    className="cursor-pointer"
                  >
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(
                        priority
                      )}`}
                    >
                      {priority}
                    </span>
                    {currentPriority === priority && (
                      <Check className="h-4 w-4 ml-auto" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }
);

PriorityDropdown.displayName = "PriorityDropdown";

// Lead Score Input Component
export const LeadScoreInput = memo(
  ({
    currentScore,
    onScoreChange,
    className = "",
    isUpdating = false,
  }: {
    currentScore?: number;
    onScoreChange: (score: number) => void;
    className?: string;
    isUpdating?: boolean;
  }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [score, setScore] = useState<string>(currentScore?.toString() || "0");
    const [isLoading, setIsLoading] = useState(false);

    const handleScoreChange = async () => {
      const parsedScore = parseInt(score);
      if (isNaN(parsedScore) || parsedScore < 0 || parsedScore > 100) {
        setScore(currentScore?.toString() || "0");
        setIsEditing(false);
        return;
      }

      setIsLoading(true);
      try {
        await onScoreChange(parsedScore);
      } catch (error) {
        console.error("Error updating lead score:", error);
        setScore(currentScore?.toString() || "0");
      } finally {
        setIsLoading(false);
        setIsEditing(false);
      }
    };

    return (
      <div className={`relative ${className}`}>
        {isEditing ? (
          <div className="flex items-center">
            <Input
              type="number"
              min="0"
              max="100"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              className="h-8 w-20 text-sm"
              onBlur={handleScoreChange}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleScoreChange();
                } else if (e.key === "Escape") {
                  setScore(currentScore?.toString() || "0");
                  setIsEditing(false);
                }
              }}
              autoFocus
            />
            <span className="ml-1 text-sm text-gray-500">/100</span>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 justify-between text-left"
            onClick={() => setIsEditing(true)}
          >
            {isLoading || isUpdating ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin inline" />
            ) : null}
            <span className="font-medium">{currentScore || 0}</span>
            <span className="text-gray-500">/100</span>
          </Button>
        )}
      </div>
    );
  }
);

LeadScoreInput.displayName = "LeadScoreInput";

// Assignee Dropdown Component
export const AssigneeDropdown = memo(
  ({
    currentAssigneeId,
    currentAssigneeName,
    onAssigneeChange,
    className = "",
    isUpdating = false,
  }: {
    currentAssigneeId?: number;
    currentAssigneeName?: string;
    onAssigneeChange: (assigneeId: number | undefined) => void;
    className?: string;
    isUpdating?: boolean;
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [assignees, setAssignees] = useState<Assignee[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isSearching, setIsSearching] = useState(false);

    // Fetch assignees when dropdown opens
    React.useEffect(() => {
      if (isOpen) {
        fetchAssignees();
      }
    }, [isOpen]);

    const fetchAssignees = async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`/api/assignees?pageSize=50`);
        const result = await response.json();

        if (result.success) {
          setAssignees(result.data.assignees);
        } else {
          console.error("Failed to fetch assignees:", result.error);
        }
      } catch (error) {
        console.error("Error fetching assignees:", error);
      } finally {
        setIsSearching(false);
      }
    };

    const handleAssigneeChange = async (assigneeId: number | undefined) => {
      setIsLoading(true);
      try {
        await onAssigneeChange(assigneeId);
      } catch (error) {
        console.error("Error updating assignee:", error);
      } finally {
        setIsLoading(false);
        setIsOpen(false);
      }
    };

    // Filter by active status and search term
    const filteredAssignees = assignees.filter(
      (a) =>
        // Only include active users
        a.active !== false &&
        // Apply search filter if search term exists
        (!searchTerm ||
          a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (a.username &&
            a.username.toLowerCase().includes(searchTerm.toLowerCase())))
    );

    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 px-2 justify-between w-full max-w-[180px] ${className}`}
          >
            <span className="truncate text-gray-600">
              {isLoading || isUpdating ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin inline" />
              ) : null}
              {currentAssigneeName || "-"}
            </span>
            <ChevronsUpDown className="h-3 w-3 opacity-50 ml-1" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-0">
          <Command>
            <CommandInput
              placeholder="Search assignees..."
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <CommandList>
              {isSearching ? (
                <CommandEmpty>
                  <Loader2 className="h-4 w-4 animate-spin mx-auto my-2" />
                  Loading...
                </CommandEmpty>
              ) : filteredAssignees.length === 0 ? (
                <CommandEmpty>No assignees found</CommandEmpty>
              ) : (
                <CommandGroup>
                  {filteredAssignees.map((assignee) => (
                    <CommandItem
                      key={assignee.id}
                      onSelect={() => handleAssigneeChange(assignee.id)}
                      className="cursor-pointer"
                    >
                      <span className="truncate">{assignee.name}</span>
                      {currentAssigneeId === assignee.id && (
                        <Check className="h-4 w-4 ml-auto" />
                      )}
                    </CommandItem>
                  ))}
                  <CommandItem
                    onSelect={() => handleAssigneeChange(undefined)}
                    className="cursor-pointer text-gray-500"
                  >
                    <span>Unassigned</span>
                    {!currentAssigneeId && (
                      <Check className="h-4 w-4 ml-auto" />
                    )}
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }
);

AssigneeDropdown.displayName = "AssigneeDropdown";
