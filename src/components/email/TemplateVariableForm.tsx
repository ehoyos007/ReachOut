"use client";

import { useEffect, useMemo } from "react";
import { AlertCircle, User, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VariableField } from "./VariableField";
import type { TemplateVariable } from "@/types/sendgrid";
import type { Contact } from "@/types/contact";
import { getAutoMappings } from "@/utils/templateParser";

interface TemplateVariableFormProps {
  variables: TemplateVariable[];
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
  selectedContacts: Contact[];
  disabled?: boolean;
}

export function TemplateVariableForm({
  variables,
  values,
  onChange,
  selectedContacts,
  disabled = false,
}: TemplateVariableFormProps) {
  // Group variables by whether they can be auto-filled
  const { autoFillable, manual } = useMemo(() => {
    const autoFillable: TemplateVariable[] = [];
    const manual: TemplateVariable[] = [];

    for (const variable of variables) {
      if (variable.suggestedMapping) {
        autoFillable.push(variable);
      } else {
        manual.push(variable);
      }
    }

    return { autoFillable, manual };
  }, [variables]);

  // Get the first selected contact for auto-fill preview
  const previewContact = selectedContacts[0] || null;
  const hasMultipleContacts = selectedContacts.length > 1;

  // Auto-fill values when contact is selected
  useEffect(() => {
    if (!previewContact || variables.length === 0) return;

    const mappings = getAutoMappings(variables);
    const newValues = { ...values };
    let hasChanges = false;

    for (const variable of variables) {
      const mapping = mappings[variable.name];
      if (mapping && !values[variable.name]) {
        // Get value from contact
        let contactValue = "";

        if (mapping === "fullName") {
          contactValue = [previewContact.first_name, previewContact.last_name]
            .filter(Boolean)
            .join(" ");
        } else if (mapping === "first_name") {
          contactValue = previewContact.first_name || "";
        } else if (mapping === "last_name") {
          contactValue = previewContact.last_name || "";
        } else if (mapping === "email") {
          contactValue = previewContact.email || "";
        } else if (mapping === "phone") {
          contactValue = previewContact.phone || "";
        }

        if (contactValue) {
          newValues[variable.name] = contactValue;
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      onChange(newValues);
    }
  }, [previewContact, variables]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle individual field change
  const handleFieldChange = (name: string, value: string) => {
    onChange({ ...values, [name]: value });
  };

  // Get auto-fill source display text
  const getAutoFillSource = (variable: TemplateVariable): string | undefined => {
    if (!previewContact || !variable.suggestedMapping) return undefined;

    const mapping = variable.suggestedMapping;
    let hasValue = false;

    if (mapping === "fullName") {
      hasValue = !!(previewContact.first_name || previewContact.last_name);
    } else if (mapping === "first_name") {
      hasValue = !!previewContact.first_name;
    } else if (mapping === "last_name") {
      hasValue = !!previewContact.last_name;
    } else if (mapping === "email") {
      hasValue = !!previewContact.email;
    } else if (mapping === "phone") {
      hasValue = !!previewContact.phone;
    }

    if (hasValue) {
      const contactName = [previewContact.first_name, previewContact.last_name]
        .filter(Boolean)
        .join(" ") || "Contact";
      return contactName;
    }

    return undefined;
  };

  if (variables.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Template Variables</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This template has no dynamic variables.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Template Variables</CardTitle>
          <div className="flex items-center gap-2">
            {selectedContacts.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {hasMultipleContacts ? (
                  <>
                    <Users className="mr-1 h-3 w-3" />
                    {selectedContacts.length} contacts
                  </>
                ) : (
                  <>
                    <User className="mr-1 h-3 w-3" />
                    {previewContact?.first_name || "1 contact"}
                  </>
                )}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Contact-based variables (auto-fillable) */}
        {autoFillable.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>Contact Fields</span>
              {hasMultipleContacts && (
                <Badge variant="outline" className="text-xs font-normal">
                  Will vary per recipient
                </Badge>
              )}
            </div>
            {autoFillable.map((variable) => (
              <VariableField
                key={variable.name}
                variable={variable}
                value={values[variable.name] || ""}
                onChange={(value) => handleFieldChange(variable.name, value)}
                autoFilledFrom={getAutoFillSource(variable)}
                disabled={disabled}
              />
            ))}
          </div>
        )}

        {/* Custom variables (manual entry) */}
        {manual.length > 0 && (
          <div className="space-y-3">
            {autoFillable.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
                <AlertCircle className="h-4 w-4" />
                <span>Custom Variables</span>
              </div>
            )}
            {manual.map((variable) => (
              <VariableField
                key={variable.name}
                variable={variable}
                value={values[variable.name] || ""}
                onChange={(value) => handleFieldChange(variable.name, value)}
                disabled={disabled}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
