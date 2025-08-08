"use client";

import { memo, useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

const SearchInput = memo(function SearchInput({
  value,
  onChange,
  placeholder = "Search tasks...",
  debounceMs = 300,
}: SearchInputProps) {
  // Local state for the input - always controlled by what user types
  const [inputValue, setInputValue] = useState(value);

  // Debounced callback to update parent
  const debouncedOnChange = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (newValue: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          onChange(newValue);
        }, debounceMs);
      };
    })(),
    [onChange, debounceMs]
  );

  // Handle input changes
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      debouncedOnChange(newValue);
    },
    [debouncedOnChange]
  );

  // Only sync from parent when it's a reset to empty
  useEffect(() => {
    if (value === "" && inputValue !== "") {
      setInputValue("");
    }
  }, [value, inputValue]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
      <Input
        placeholder={placeholder}
        value={inputValue}
        onChange={handleInputChange}
        className="pl-9"
      />
    </div>
  );
});

export default SearchInput;
