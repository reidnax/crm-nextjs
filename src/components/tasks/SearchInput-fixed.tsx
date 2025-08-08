"use client";

import { memo, useState, useEffect, useRef } from "react";
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
  // Local input state - initialized properly with the prop value
  const [inputValue, setInputValue] = useState(value);

  // Ref to store the debounce timeout
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Ref to track if this is the initial mount
  const isInitialMount = useRef(true);

  // Initialize input value with prop value on mount or when value changes externally
  useEffect(() => {
    if (isInitialMount.current || value !== inputValue) {
      setInputValue(value);
      isInitialMount.current = false;
    }
  }, [value, inputValue]);

  // Handle input changes with proper debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // Update input immediately for responsive UI
    setInputValue(newValue);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for debounced callback
    timeoutRef.current = setTimeout(() => {
      onChange(newValue);
    }, debounceMs);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

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
