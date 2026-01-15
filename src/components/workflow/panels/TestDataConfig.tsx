"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, RotateCcw, Variable } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { DEFAULT_TEST_DATA, getPlaceholderInfo } from "@/lib/message-renderer";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

interface TestDataConfigProps {
  /** Variables detected in the template */
  variables: string[];
  /** Current test data values */
  testData: Record<string, string>;
  /** Callback to update a single value */
  onUpdateValue: (key: string, value: string) => void;
  /** Callback to reset to defaults */
  onReset: () => void;
  /** Whether the panel is expanded */
  defaultOpen?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function TestDataConfig({
  variables,
  testData,
  onUpdateValue,
  onReset,
  defaultOpen = false,
}: TestDataConfigProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // If no variables, don't render
  if (variables.length === 0) {
    return null;
  }

  // Get display summary for collapsed state
  const getSummary = () => {
    const entries = variables
      .map((v) => {
        const value = testData[v] || DEFAULT_TEST_DATA[v] || "";
        if (value) {
          return `${v}: ${value.slice(0, 10)}${value.length > 10 ? "..." : ""}`;
        }
        return null;
      })
      .filter(Boolean);

    if (entries.length === 0) {
      return "Using default values";
    }
    return entries.slice(0, 2).join(", ") + (entries.length > 2 ? "..." : "");
  };

  // Check if any custom values are set
  const hasCustomValues = variables.some(
    (v) => testData[v] && testData[v] !== DEFAULT_TEST_DATA[v]
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-md bg-muted/30">
        <CollapsibleTrigger asChild>
          <button className="flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <Variable className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Test data</span>
              {!isOpen && (
                <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {getSummary()}
                </span>
              )}
            </div>
            {isOpen && hasCustomValues && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onReset();
                }}
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset
              </Button>
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-3">
            <p className="text-xs text-muted-foreground">
              Customize values for preview. Empty fields use defaults.
            </p>

            <div className="space-y-2">
              {variables.map((variable) => {
                const info = getPlaceholderInfo(variable);
                const value = testData[variable] || "";
                const placeholder = DEFAULT_TEST_DATA[variable] || info?.example || "Value";

                return (
                  <div key={variable} className="grid gap-1">
                    <Label
                      htmlFor={`test-${variable}`}
                      className="text-xs font-medium"
                    >
                      {info?.label || variable}
                    </Label>
                    <Input
                      id={`test-${variable}`}
                      value={value}
                      onChange={(e) => onUpdateValue(variable, e.target.value)}
                      placeholder={placeholder}
                      className={cn(
                        "h-8 text-sm",
                        !value && "text-muted-foreground"
                      )}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
