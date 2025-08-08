"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface FilterSection {
  id: string;
  label: string;
  options: string[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  maxHeight?: string;
}

interface FilterModalProps {
  trigger: React.ReactNode;
  title: string;
  sections: FilterSection[];
  hasActiveFilters: boolean;
  onClearAll: () => void;
  onApply?: () => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FilterModal({
  trigger,
  title,
  sections,
  hasActiveFilters,
  onClearAll,
  onApply,
  isOpen,
  onOpenChange,
}: FilterModalProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);

    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  const handleClose = () => {
    onApply?.();
    onOpenChange(false);
  };

  const FilterContent = () => (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b flex-shrink-0">
        <h3 className="font-medium text-lg">{title}</h3>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto py-4 space-y-6">
        {sections.map((section) => (
          <div key={section.id}>
            <label className="text-sm font-medium text-gray-700 mb-3 block">
              {section.label}{" "}
              {section.selectedValues.length > 0 &&
                `(${section.selectedValues.length} selected)`}
            </label>
            <div
              className={`space-y-2 ${
                section.maxHeight
                  ? `max-h-${section.maxHeight} overflow-y-auto`
                  : ""
              }`}
            >
              {section.options.map((option) => (
                <label
                  key={option}
                  className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={section.selectedValues.includes(option)}
                    onChange={(e) => {
                      const newValues = e.target.checked
                        ? [...section.selectedValues, option]
                        : section.selectedValues.filter((v) => v !== option);
                      section.onChange(newValues);
                    }}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-900">{option}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Actions */}
      <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t flex-shrink-0">
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onClearAll();
              handleClose();
            }}
            className="flex-1"
          >
            <X className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        )}
        <Button onClick={handleClose} size="sm" className="flex-1">
          Apply Filters
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent side="bottom" className="h-[85vh] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
          <div className="h-full p-6">
            <FilterContent />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        className="w-80 h-[75vh] p-0 overflow-hidden"
        align="end"
        side="bottom"
        sideOffset={8}
      >
        <div className="h-full p-4">
          <FilterContent />
        </div>
      </PopoverContent>
    </Popover>
  );
}
