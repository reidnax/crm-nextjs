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
import { MoreHorizontal, Eye, Edit3, Phone, Mail } from "lucide-react";
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
  createdAt: string;
  creator?: {
    name: string;
    username: string;
  };
  assignee?: {
    name: string;
    username: string;
  };
}

interface LeadsTableProps {
  leads: Lead[];
  loading: boolean;
}

// Memoized table component - only re-renders when leads or loading actually change
const LeadsTable = memo(({ leads, loading }: LeadsTableProps) => {
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
          Try adjusting your search or filters to find what you're looking for.
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
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {lead.status || "New"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {lead.subStatus ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {lead.subStatus}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell text-gray-600">
                    {lead.assignee?.name || "-"}
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
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {lead.status || "New"}
                </span>
                {lead.subStatus && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {lead.subStatus}
                  </span>
                )}
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
                    {[lead.city, lead.state].filter(Boolean).join(", ") || "-"}
                  </span>
                </div>
              )}
              {lead.assignee?.name && (
                <div className="flex items-center text-sm text-gray-600">
                  <span className="font-medium w-20">Assigned:</span>
                  <span>{lead.assignee.name}</span>
                </div>
              )}
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
});

LeadsTable.displayName = "LeadsTable";

export default LeadsTable;
