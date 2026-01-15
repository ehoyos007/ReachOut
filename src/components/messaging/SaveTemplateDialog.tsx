"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2 } from "lucide-react";
import { useTemplateStore } from "@/lib/store/templateStore";
import type { TemplateChannel } from "@/types/template";

interface SaveTemplateDialogProps {
  channel: TemplateChannel;
  body: string;
  subject?: string;
  disabled?: boolean;
  onSaved?: (templateId: string) => void;
}

export function SaveTemplateDialog({
  channel,
  body,
  subject,
  disabled = false,
  onSaved,
}: SaveTemplateDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { createTemplate, isSaving } = useTemplateStore();

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Template name is required");
      return;
    }

    if (!body.trim()) {
      setError("Cannot save empty message as template");
      return;
    }

    const template = await createTemplate({
      name: name.trim(),
      channel,
      body,
      subject: channel === "email" ? subject : null,
    });

    if (template) {
      setOpen(false);
      setName("");
      setError(null);
      onSaved?.(template.id);
    } else {
      setError("Failed to save template. Please try again.");
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setName("");
      setError(null);
    }
  };

  const isDisabled = disabled || !body.trim();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isDisabled}
          className="h-8"
        >
          <Save className="h-3.5 w-3.5 mr-1" />
          Save as Template
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
          <DialogDescription>
            Save this message as a reusable {channel === "sms" ? "SMS" : "email"} template.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                placeholder="e.g., Welcome Message, Follow-up..."
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                disabled={isSaving}
                autoFocus
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">Preview</Label>
              <div className="border rounded-md p-3 bg-muted/30 text-sm">
                {channel === "email" && subject && (
                  <p className="text-muted-foreground mb-2 text-xs">
                    <span className="font-medium">Subject:</span> {subject}
                  </p>
                )}
                <p className="whitespace-pre-wrap line-clamp-4">{body}</p>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Template"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
