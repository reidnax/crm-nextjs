"use client";

import { memo, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const SearchInput = memo(function SearchInput({
  value,
  onChange,
  placeholder = "Search tasks...",
}: SearchInputProps) {
  // Local input state for immediate UI responsiveness
  const [inputValue, setInputValue] = useState(value);

  // Sync with external value changes (e.g., resets)
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Handle input changes - immediate update to parent (debouncing handled at container level)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
  };

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
