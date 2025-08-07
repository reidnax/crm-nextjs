"use client";

import { useState, useCallback, useMemo, memo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
} from "lucide-react";

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface PaginationProps {
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  className?: string;
  showPageSizeSelector?: boolean;
  pageSizeOptions?: number[];
}

function PaginationComponent({
  pagination,
  onPageChange,
  onPageSizeChange,
  className,
  showPageSizeSelector = true,
  pageSizeOptions = [5, 10, 20, 50, 100],
}: PaginationProps) {
  const {
    currentPage,
    totalPages,
    totalCount,
    pageSize,
    hasNextPage,
    hasPrevPage,
  } = pagination;

  // Memoize the expensive page numbers calculation
  const pageNumbers = useMemo(() => {
    const delta = 2; // Number of pages to show on each side of current page
    const range = [];
    const rangeWithDots = [];

    // Always show first page
    range.push(1);

    // Add pages around current page
    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    // Always show last page if there's more than one page
    if (totalPages > 1) {
      range.push(totalPages);
    }

    // Remove duplicates and sort
    const uniqueRange = [...new Set(range)].sort((a, b) => a - b);

    // Add dots where there are gaps
    for (let i = 0; i < uniqueRange.length; i++) {
      rangeWithDots.push(uniqueRange[i]);
      if (uniqueRange[i + 1] && uniqueRange[i + 1] - uniqueRange[i] > 1) {
        rangeWithDots.push("...");
      }
    }

    return rangeWithDots;
  }, [currentPage, totalPages]);

  // Calculate the range of items being shown
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  if (totalPages <= 1 && !showPageSizeSelector) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-4",
        className
      )}
    >
      {/* Items info and page size selector */}
      <div className="flex flex-col sm:flex-row items-center gap-4 text-sm text-gray-600">
        <div>
          Showing {startItem}-{endItem} of {totalCount} entries
        </div>

        {showPageSizeSelector && (
          <div className="flex items-center gap-2">
            <span>Show</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => onPageSizeChange(parseInt(value))}
            >
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>per page</span>
          </div>
        )}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          {/* First page button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={!hasPrevPage}
            className="hidden sm:flex h-8 w-8 p-0"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          {/* Previous page button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!hasPrevPage}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Page numbers */}
          <div className="flex items-center gap-1">
            {pageNumbers.map((pageNum, index) => (
              <div key={index}>
                {pageNum === "..." ? (
                  <div className="h-8 w-8 flex items-center justify-center">
                    <MoreHorizontal className="h-4 w-4 text-gray-400" />
                  </div>
                ) : (
                  <Button
                    variant={pageNum === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(pageNum as number)}
                    className="h-8 w-8 p-0"
                  >
                    {pageNum}
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Next page button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!hasNextPage}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Last page button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={!hasNextPage}
            className="hidden sm:flex h-8 w-8 p-0"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// Memoize the component to prevent unnecessary re-renders
const Pagination = memo(PaginationComponent);
export default Pagination;

// Helper hook for pagination state management
export function usePagination(initialPageSize: number = 10) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage((prevPage) => {
      // Only update if page actually changed
      if (prevPage === page) return prevPage;
      return page;
    });
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize((prevSize) => {
      // Only update if size actually changed
      if (prevSize === newPageSize) return prevSize;
      setCurrentPage(1); // Reset to first page when page size changes
      return newPageSize;
    });
  }, []);

  const resetPagination = useCallback(() => {
    setCurrentPage((prevPage) => {
      // Only reset if not already on page 1
      if (prevPage === 1) return prevPage;
      return 1;
    });
  }, []);

  return useMemo(
    () => ({
      currentPage,
      pageSize,
      handlePageChange,
      handlePageSizeChange,
      resetPagination,
    }),
    [
      currentPage,
      pageSize,
      handlePageChange,
      handlePageSizeChange,
      resetPagination,
    ]
  );
}
