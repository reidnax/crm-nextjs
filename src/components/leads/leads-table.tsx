"use client";

import { memo, useEffect, useState, useRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Eye,
  Edit3,
  Phone,
  Mail,
  Check,
  ChevronsUpDown,
  Loader2,
} from "lucide-react";
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
import {
  getStatusColor,
  getSubStatusColor,
  getPriorityColor,
} from "@/lib/utils";
import Link from "next/link";

interface Lead {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  city?: string;
  state?: string;
  businessCategory?: string;
  businessIndustry?: string;
  status?: string;
  subStatus?: string;
  priority?: string;
  createdAt: string;
  creator?: {
    name: string;
    username: string;
  };
  assignee?: {
    id: number;
    name: string;
    username: string;
  };
  assign?: number;
}

interface LeadsTableProps {
  leads: Lead[];
  loading: boolean;
  onLeadUpdate?: (leadId: number, data: Partial<Lead>) => Promise<void>;
  updatingLeadIds?: number[];
}

interface Assignee {
  id: number;
  name: string;
  username?: string;
  email?: string;
  active?: boolean;
  role?: string;
}

// Memoized table component - only re-renders when leads or loading actually change
const LeadsTable = memo(
  ({ leads, loading, onLeadUpdate, updatingLeadIds = [] }: LeadsTableProps) => {
    const [tableHeight, setTableHeight] = useState<number>(400);
    const containerRef = useRef<HTMLDivElement>(null);

    // Calculate available height for the table
    useEffect(() => {
      const calculateTableHeight = () => {
        if (containerRef.current) {
          const container = containerRef.current;
          const rect = container.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const containerTop = rect.top;

          // Calculate available height: viewport height - container top - padding
          const availableHeight = viewportHeight - containerTop - 150; // 100px for padding and other elements

          // Set minimum and maximum heights
          const minHeight = 300;
          const maxHeight = 600;
          const calculatedHeight = Math.max(
            minHeight,
            Math.min(maxHeight, availableHeight)
          );

          setTableHeight(calculatedHeight);
        }
      };

      // Calculate on mount and resize
      calculateTableHeight();
      window.addEventListener("resize", calculateTableHeight);

      // Recalculate when leads change (might affect layout)
      if (leads.length > 0) {
        calculateTableHeight();
      }

      return () => {
        window.removeEventListener("resize", calculateTableHeight);
      };
    }, [leads.length]);

    if (loading && leads.length === 0) {
      return (
        <div className="p-8 text-center">
          <div className="animate-pulse">
            <div className="h-12 bg-gray-200 rounded mb-4"></div>
            <div className="h-12 bg-gray-200 rounded mb-4"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </div>
      );
    }

    if (leads.length === 0) {
      return (
        <div className="text-center py-16 px-4">
          <div className="h-12 w-12 mx-auto mb-4 text-gray-300">
            <svg
              className="w-full h-full"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No leads found
          </h3>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            Try adjusting your search or filters to find what you&apos;re
            looking for.
          </p>
        </div>
      );
    }

    return (
      <>
        {/* Desktop Table */}
        <div className="hidden md:block" ref={containerRef}>
          <div
            className="relative overflow-x-auto overflow-y-auto"
            style={{ height: `${tableHeight}px` }}
          >
            <Table className="relative">
              <TableHeader className="sticky top-0 bg-white z-20">
                <TableRow>
                  <TableHead className="sticky left-0 bg-white z-30 border-r shadow-sm min-w-[200px]">
                    Name
                  </TableHead>
                  <TableHead className="min-w-[150px]">Company</TableHead>
                  <TableHead className="hidden lg:table-cell min-w-[100px]">
                    City
                  </TableHead>
                  <TableHead className="hidden lg:table-cell min-w-[100px]">
                    State
                  </TableHead>
                  <TableHead className="hidden md:table-cell min-w-[120px]">
                    Phone
                  </TableHead>
                  <TableHead className="min-w-[100px]">Status</TableHead>
                  <TableHead className="min-w-[100px]">Sub Status</TableHead>
                  <TableHead className="min-w-[100px]">Priority</TableHead>
                  <TableHead className="hidden xl:table-cell min-w-[120px]">
                    Assigned to
                  </TableHead>
                  <TableHead className="hidden xl:table-cell min-w-[140px]">
                    Business Category
                  </TableHead>
                  <TableHead className="hidden 2xl:table-cell min-w-[140px]">
                    Business Industry
                  </TableHead>
                  <TableHead className="hidden lg:table-cell min-w-[180px]">
                    Email
                  </TableHead>
                  <TableHead className="sticky right-0 bg-white z-30 border-l shadow-sm min-w-[140px]">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium sticky left-0 bg-white z-10 border-r shadow-sm">
                      <div className="flex items-center space-x-3">
                        <div className="bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium">
                          {lead.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="font-medium text-gray-900">
                          {lead.name}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-900">
                      {lead.company || "-"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-gray-600">
                      {lead.city || "-"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-gray-600">
                      {lead.state || "-"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-gray-600">
                      {lead.phone || "-"}
                    </TableCell>
                    <TableCell>
                      <StatusDropdown
                        leadId={lead.id}
                        currentStatus={lead.status || "New"}
                        onStatusChange={(newStatus) =>
                          onLeadUpdate?.(lead.id, { status: newStatus })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <SubStatusDropdown
                        leadId={lead.id}
                        currentSubStatus={lead.subStatus}
                        onSubStatusChange={(newSubStatus) =>
                          onLeadUpdate?.(lead.id, { subStatus: newSubStatus })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <PriorityDropdown
                        leadId={lead.id}
                        currentPriority={lead.priority}
                        onPriorityChange={(newPriority) =>
                          onLeadUpdate?.(lead.id, { priority: newPriority })
                        }
                      />
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-gray-600">
                      <AssigneeDropdown
                        leadId={lead.id}
                        currentAssigneeId={lead.assign}
                        currentAssigneeName={lead.assignee?.name}
                        isUpdating={updatingLeadIds.includes(lead.id)}
                        onAssigneeChange={(assigneeId) =>
                          onLeadUpdate?.(lead.id, { assign: assigneeId })
                        }
                      />
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-gray-600">
                      {lead.businessCategory || "-"}
                    </TableCell>
                    <TableCell className="hidden 2xl:table-cell text-gray-600">
                      {lead.businessIndustry || "-"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-gray-600">
                      {lead.email || "-"}
                    </TableCell>
                    <TableCell className="sticky right-0 bg-white z-10 border-l shadow-sm">
                      <div className="flex gap-1 items-center">
                        {/* Quick action buttons for common actions */}
                        <Link href={`/leads/${lead.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">View lead</span>
                          </Button>
                        </Link>
                        <Link href={`/leads/${lead.id}/edit`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <Edit3 className="h-4 w-4" />
                            <span className="sr-only">Edit lead</span>
                          </Button>
                        </Link>

                        {/* More actions dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">More actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            {lead.phone && (
                              <DropdownMenuItem asChild>
                                <a
                                  href={`tel:${lead.phone}`}
                                  className="flex items-center"
                                >
                                  <Phone className="mr-2 h-4 w-4" />
                                  Call
                                </a>
                              </DropdownMenuItem>
                            )}
                            {lead.email && (
                              <DropdownMenuItem asChild>
                                <a
                                  href={`mailto:${lead.email}`}
                                  className="flex items-center"
                                >
                                  <Mail className="mr-2 h-4 w-4" />
                                  Email
                                </a>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/leads/${lead.id}`}
                                className="flex items-center"
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/leads/${lead.id}/edit`}
                                className="flex items-center"
                              >
                                <Edit3 className="mr-2 h-4 w-4" />
                                Edit Lead
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-4 p-4">
          {leads.map((lead) => (
            <Card key={lead.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-500 text-white w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium">
                    {lead.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{lead.name}</h3>
                    <p className="text-sm text-gray-500">
                      {lead.company || "No company"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <StatusDropdown
                    leadId={lead.id}
                    currentStatus={lead.status || "New"}
                    onStatusChange={(newStatus) =>
                      onLeadUpdate?.(lead.id, { status: newStatus })
                    }
                  />
                  <SubStatusDropdown
                    leadId={lead.id}
                    currentSubStatus={lead.subStatus}
                    onSubStatusChange={(newSubStatus) =>
                      onLeadUpdate?.(lead.id, { subStatus: newSubStatus })
                    }
                  />
                </div>
              </div>

              <div className="mt-3 space-y-1">
                {lead.email && (
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="font-medium w-20">Email:</span>
                    <span>{lead.email}</span>
                  </div>
                )}
                {lead.phone && (
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="font-medium w-20">Phone:</span>
                    <span>{lead.phone}</span>
                  </div>
                )}
                {(lead.city || lead.state) && (
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="font-medium w-20">Location:</span>
                    <span>
                      {[lead.city, lead.state].filter(Boolean).join(", ") ||
                        "-"}
                    </span>
                  </div>
                )}
                <div className="flex items-center text-sm text-gray-600">
                  <span className="font-medium w-20">Assigned:</span>
                  <AssigneeDropdown
                    leadId={lead.id}
                    currentAssigneeId={lead.assign}
                    currentAssigneeName={lead.assignee?.name}
                    isUpdating={updatingLeadIds.includes(lead.id)}
                    onAssigneeChange={(assigneeId) =>
                      onLeadUpdate?.(lead.id, { assign: assigneeId })
                    }
                  />
                </div>
                {lead.businessCategory && (
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="font-medium w-20">Category:</span>
                    <span>{lead.businessCategory}</span>
                  </div>
                )}
                {lead.businessIndustry && (
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="font-medium w-20">Industry:</span>
                    <span>{lead.businessIndustry}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <Link href={`/leads/${lead.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    <Eye className="mr-2 h-4 w-4" />
                    View
                  </Button>
                </Link>
                <Link href={`/leads/${lead.id}/edit`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    <Edit3 className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                </Link>

                {/* Quick contact actions for mobile */}
                <div className="flex gap-1">
                  {lead.phone && (
                    <a href={`tel:${lead.phone}`}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Phone className="h-4 w-4" />
                        <span className="sr-only">Call</span>
                      </Button>
                    </a>
                  )}
                  {lead.email && (
                    <a href={`mailto:${lead.email}`}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Mail className="h-4 w-4" />
                        <span className="sr-only">Email</span>
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </>
    );
  }
);

LeadsTable.displayName = "LeadsTable";

// Status Dropdown Component
const StatusDropdown = memo(
  ({
    leadId,
    currentStatus,
    onStatusChange,
  }: {
    leadId: number;
    currentStatus: string;
    onStatusChange: (status: string) => void;
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
            className="h-8 px-2 justify-between w-full max-w-[120px]"
          >
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium truncate ${getStatusColor(
                currentStatus
              )}`}
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : null}
              {currentStatus}
            </span>
            <ChevronsUpDown className="h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[180px] p-0">
          <Command>
            <CommandList>
              <CommandGroup>
                {statusOptions.map((status) => (
                  <CommandItem
                    key={status}
                    onSelect={() => handleStatusChange(status)}
                    className="cursor-pointer"
                  >
                    <span className="truncate">{status}</span>
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
const SubStatusDropdown = memo(
  ({
    leadId,
    currentSubStatus,
    onSubStatusChange,
  }: {
    leadId: number;
    currentSubStatus?: string;
    onSubStatusChange: (subStatus: string | undefined) => void;
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Substatus options from lead-form.tsx
    const subStatusOptions = ["Hot", "Warm", "Cold"];

    const handleSubStatusChange = async (subStatus: string | undefined) => {
      setIsLoading(true);
      try {
        await onSubStatusChange(subStatus);
      } catch (error) {
        console.error("Error updating substatus:", error);
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
            className="h-8 px-2 justify-between w-full max-w-[120px]"
          >
            {currentSubStatus ? (
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium truncate ${getSubStatusColor(
                  currentSubStatus
                )}`}
              >
                {isLoading ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : null}
                {currentSubStatus}
              </span>
            ) : (
              <span className="text-gray-400 text-xs">
                {isLoading ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin inline" />
                ) : null}
                -
              </span>
            )}
            <ChevronsUpDown className="h-3 w-3 opacity-50" />
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
                    <span className="truncate">{subStatus}</span>
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
const PriorityDropdown = memo(
  ({
    leadId,
    currentPriority,
    onPriorityChange,
  }: {
    leadId: number;
    currentPriority?: string;
    onPriorityChange: (priority: string) => void;
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
            className="h-8 px-2 justify-between w-full max-w-[150px] text-left"
          >
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium truncate ${getPriorityColor(
                currentPriority
              )}`}
            >
              {isLoading ? (
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

// Assignee Dropdown Component
const AssigneeDropdown = memo(
  ({
    currentAssigneeId,
    currentAssigneeName,
    isUpdating = false,
    onAssigneeChange,
  }: {
    leadId: number;
    currentAssigneeId?: number;
    currentAssigneeName?: string;
    isUpdating?: boolean;
    onAssigneeChange: (assigneeId: number | undefined) => void;
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [assignees, setAssignees] = useState<Assignee[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isSearching, setIsSearching] = useState(false);

    // Fetch assignees when dropdown opens
    useEffect(() => {
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
            className="h-8 px-2 justify-between w-full max-w-[150px] text-left"
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

export default LeadsTable;
