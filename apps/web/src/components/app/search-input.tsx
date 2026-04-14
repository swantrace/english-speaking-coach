import { Input } from "@english-coach/ui";

interface SearchInputProps {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

export function SearchInput({ value, placeholder = "Search", onChange }: SearchInputProps) {
  return (
    <Input
      aria-label={placeholder}
      className="bg-white"
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      type="search"
      value={value}
    />
  );
}
