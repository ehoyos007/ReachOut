"use client";

import { useState } from "react";
import { Mail, RefreshCw, Search, FileText } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { SendGridTemplate } from "@/types/sendgrid";
import { cn } from "@/lib/utils";

interface TemplateSelectorProps {
  templates: SendGridTemplate[];
  selectedTemplateId: string | null;
  onSelect: (templateId: string | null) => void;
  isLoading: boolean;
  error: string | null;
  lastSyncedAt: string | null;
  onRefresh: () => void;
  disabled?: boolean;
}

export function TemplateSelector({
  templates,
  selectedTemplateId,
  onSelect,
  isLoading,
  error,
  lastSyncedAt,
  onRefresh,
  disabled = false,
}: TemplateSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter templates by search query
  const filteredTemplates = templates.filter((template) =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format last synced time
  const formatLastSync = () => {
    if (!lastSyncedAt) return null;
    const date = new Date(lastSyncedAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label>Email Template</Label>
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <Label>Email Template</Label>
        <div className="rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-700">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="mt-2"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Email Template</Label>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {lastSyncedAt && (
            <span>Synced {formatLastSync()}</span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-6 px-2"
          >
            <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      <Select
        value={selectedTemplateId || ""}
        onValueChange={(value) => onSelect(value || null)}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a template...">
            {selectedTemplateId && (
              <span className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {templates.find((t) => t.id === selectedTemplateId)?.name || "Select a template..."}
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {/* Search input */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Template list */}
          <div className="max-h-[300px] overflow-auto">
            {filteredTemplates.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {searchQuery ? "No templates match your search" : "No templates available"}
              </div>
            ) : (
              filteredTemplates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span className="font-medium">{template.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {template.versions?.find((v) => v.active === 1)?.subject || "No subject"}
                      </span>
                    </div>
                  </div>
                </SelectItem>
              ))
            )}
          </div>
        </SelectContent>
      </Select>

      {templates.length === 0 && !isLoading && !error && (
        <p className="text-xs text-muted-foreground">
          No dynamic templates found. Create templates in your SendGrid account.
        </p>
      )}
    </div>
  );
}
