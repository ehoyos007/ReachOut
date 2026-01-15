"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Search, FileText, Mail, MessageSquare } from "lucide-react";
import { useTemplateStore, selectTemplatesByChannel } from "@/lib/store/templateStore";
import type { Template, TemplateChannel } from "@/types/template";

interface TemplateSelectorProps {
  channel: TemplateChannel;
  selectedTemplateId?: string | null;
  onSelect: (template: Template) => void;
  disabled?: boolean;
}

export function TemplateSelector({
  channel,
  selectedTemplateId,
  onSelect,
  disabled = false,
}: TemplateSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { templates, isLoading, fetchTemplates } = useTemplateStore();

  // Fetch templates on mount if empty
  useEffect(() => {
    if (templates.length === 0) {
      fetchTemplates();
    }
  }, [templates.length, fetchTemplates]);

  // Filter templates by channel and search
  const filteredTemplates = useMemo(() => {
    const channelTemplates = selectTemplatesByChannel(templates, channel);

    if (!search) return channelTemplates;

    const lowerSearch = search.toLowerCase();
    return channelTemplates.filter(
      (t) =>
        t.name.toLowerCase().includes(lowerSearch) ||
        t.body.toLowerCase().includes(lowerSearch) ||
        (t.subject && t.subject.toLowerCase().includes(lowerSearch))
    );
  }, [templates, channel, search]);

  // Find selected template
  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateId) return null;
    return templates.find((t) => t.id === selectedTemplateId) || null;
  }, [templates, selectedTemplateId]);

  const handleSelect = (template: Template) => {
    onSelect(template);
    setOpen(false);
    setSearch("");
  };

  const ChannelIcon = channel === "sms" ? MessageSquare : Mail;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isLoading}
          className="w-full justify-between h-9"
        >
          <div className="flex items-center gap-2 truncate">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            {selectedTemplate ? (
              <span className="truncate">{selectedTemplate.name}</span>
            ) : (
              <span className="text-muted-foreground">Select template...</span>
            )}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <div className="p-3 border-b">
          <div className="flex items-center gap-2 mb-2">
            <ChannelIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {channel === "sms" ? "SMS" : "Email"} Templates
            </span>
            <Badge variant="secondary" className="ml-auto text-xs">
              {filteredTemplates.length}
            </Badge>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </div>
        <ScrollArea className="h-[280px]">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading templates...
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {search ? "No templates found" : `No ${channel === "sms" ? "SMS" : "email"} templates yet`}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => handleSelect(template)}
                  className={`w-full text-left p-3 rounded-md transition-colors hover:bg-muted ${
                    selectedTemplateId === template.id ? "bg-muted" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{template.name}</span>
                    {selectedTemplateId === template.id && (
                      <Badge variant="secondary" className="text-xs">
                        Selected
                      </Badge>
                    )}
                  </div>
                  {channel === "email" && template.subject && (
                    <p className="text-xs text-muted-foreground mb-1 truncate">
                      Subject: {template.subject}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {template.body}
                  </p>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
