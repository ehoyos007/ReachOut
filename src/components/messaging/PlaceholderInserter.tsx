"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { ChevronDown, Search, User, Settings } from "lucide-react";
import {
  TemplatePlaceholder,
  getAllPlaceholders,
} from "@/types/template";
import type { CustomField } from "@/types/contact";

interface PlaceholderInserterProps {
  onInsert: (placeholder: string) => void;
  customFields?: CustomField[];
  disabled?: boolean;
}

export function PlaceholderInserter({
  onInsert,
  customFields = [],
  disabled = false,
}: PlaceholderInserterProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { standard, custom } = getAllPlaceholders(customFields);

  const filterPlaceholders = (placeholders: TemplatePlaceholder[]) => {
    if (!search) return placeholders;
    const lowerSearch = search.toLowerCase();
    return placeholders.filter(
      (p) =>
        p.label.toLowerCase().includes(lowerSearch) ||
        p.key.toLowerCase().includes(lowerSearch) ||
        p.description.toLowerCase().includes(lowerSearch)
    );
  };

  const filteredStandard = filterPlaceholders(standard);
  const filteredCustom = filterPlaceholders(custom);

  const handleInsert = (key: string) => {
    onInsert(`{{${key}}}`);
    setOpen(false);
    setSearch("");
  };

  const PlaceholderItem = ({ placeholder }: { placeholder: TemplatePlaceholder }) => (
    <button
      type="button"
      onClick={() => handleInsert(placeholder.key)}
      className="w-full text-left px-3 py-2 hover:bg-muted rounded-md transition-colors"
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{placeholder.label}</span>
        <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          {`{{${placeholder.key}}}`}
        </code>
      </div>
      <p className="text-xs text-muted-foreground mt-0.5">
        {placeholder.description}
      </p>
    </button>
  );

  const hasResults = filteredStandard.length > 0 || filteredCustom.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className="h-8 text-xs"
        >
          Insert Placeholder
          <ChevronDown className="ml-1 h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search placeholders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </div>
        <ScrollArea className="h-[300px]">
          {!hasResults && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No placeholders found
            </div>
          )}

          {filteredStandard.length > 0 && (
            <div className="p-2">
              <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase">
                <User className="h-3 w-3" />
                Contact Fields
              </div>
              <div className="space-y-0.5">
                {filteredStandard.map((placeholder) => (
                  <PlaceholderItem key={placeholder.key} placeholder={placeholder} />
                ))}
              </div>
            </div>
          )}

          {filteredCustom.length > 0 && (
            <div className="p-2 border-t">
              <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase">
                <Settings className="h-3 w-3" />
                Custom Fields
              </div>
              <div className="space-y-0.5">
                {filteredCustom.map((placeholder) => (
                  <PlaceholderItem key={placeholder.key} placeholder={placeholder} />
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
