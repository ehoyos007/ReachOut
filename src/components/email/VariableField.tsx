"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { TemplateVariable } from "@/types/sendgrid";
import { snakeCaseToTitleCase } from "@/utils/templateParser";
import { cn } from "@/lib/utils";

interface VariableFieldProps {
  variable: TemplateVariable;
  value: string;
  onChange: (value: string) => void;
  autoFilledFrom?: string;
  disabled?: boolean;
}

export function VariableField({
  variable,
  value,
  onChange,
  autoFilledFrom,
  disabled = false,
}: VariableFieldProps) {
  const label = snakeCaseToTitleCase(variable.name);
  const hasAutoFill = !!autoFilledFrom;
  const isEmpty = !value || value.trim() === "";
  const isRequired = variable.isRequired;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label
          htmlFor={`var-${variable.name}`}
          className={cn(
            "text-sm",
            isRequired && isEmpty && "text-red-500"
          )}
        >
          {label}
          {isRequired && <span className="text-red-500 ml-0.5">*</span>}
        </Label>
        <div className="flex items-center gap-1.5">
          {variable.locations.length === 1 && (
            <Badge variant="outline" className="text-xs font-normal">
              {variable.locations[0] === "subject" ? "Subject only" : "Body only"}
            </Badge>
          )}
          {hasAutoFill && (
            <Badge variant="secondary" className="text-xs font-normal">
              From: {autoFilledFrom}
            </Badge>
          )}
          {variable.suggestedMapping && !hasAutoFill && (
            <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
              Maps to: {variable.suggestedMapping}
            </Badge>
          )}
        </div>
      </div>

      <Input
        id={`var-${variable.name}`}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Enter ${label.toLowerCase()}...`}
        disabled={disabled}
        className={cn(
          hasAutoFill && "bg-blue-50 border-blue-200",
          isRequired && isEmpty && "border-red-300 focus:ring-red-500"
        )}
      />

      {isRequired && isEmpty && (
        <p className="text-xs text-red-500">This field is required</p>
      )}
    </div>
  );
}
