"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTemplateStore } from "@/lib/store/templateStore";
import type { TemplateChannel, Template } from "@/types/template";
import { STANDARD_PLACEHOLDERS, calculateSmsSegments } from "@/types/template";

interface CreateTemplateDialogProps {
  channel: TemplateChannel;
  onTemplateCreated?: (template: Template) => void;
}

export function CreateTemplateDialog({
  channel,
  onTemplateCreated,
}: CreateTemplateDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const { createTemplate, isSaving } = useTemplateStore();

  const isEmail = channel === "email";
  const smsInfo = !isEmail ? calculateSmsSegments(body) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !body.trim()) return;
    if (isEmail && !subject.trim()) return;

    const template = await createTemplate({
      name: name.trim(),
      channel,
      subject: isEmail ? subject.trim() : null,
      body: body.trim(),
    });

    if (template) {
      onTemplateCreated?.(template);
      setOpen(false);
      // Reset form
      setName("");
      setSubject("");
      setBody("");
    }
  };

  const insertPlaceholder = (key: string) => {
    setBody((prev) => prev + `{{${key}}}`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full mt-2">
          <Plus className="h-4 w-4 mr-2" />
          Create New Template
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              Create {isEmail ? "Email" : "SMS"} Template
            </DialogTitle>
            <DialogDescription>
              Create a new template to use in your workflow.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="templateName">Template Name</Label>
              <Input
                id="templateName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`e.g., ${isEmail ? "Welcome Email" : "Follow-up SMS"}`}
                required
              />
            </div>

            {isEmail && (
              <div className="space-y-2">
                <Label htmlFor="templateSubject">Subject Line</Label>
                <Input
                  id="templateSubject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g., Welcome to {{company}}!"
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="templateBody">
                {isEmail ? "Email Body" : "Message Body"}
              </Label>
              <Textarea
                id="templateBody"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={
                  isEmail
                    ? "Hi {{first_name}},\n\nThank you for reaching out..."
                    : "Hi {{first_name}}, thanks for your interest!"
                }
                rows={isEmail ? 6 : 4}
                required
              />
              {smsInfo && (
                <p className="text-xs text-gray-500">
                  {smsInfo.charactersUsed} characters · {smsInfo.segments}{" "}
                  segment{smsInfo.segments !== 1 ? "s" : ""}
                  {smsInfo.isUnicode && " (Unicode)"}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-gray-500">
                Available Placeholders
              </Label>
              <div className="flex flex-wrap gap-1">
                {STANDARD_PLACEHOLDERS.map((placeholder) => (
                  <Button
                    key={placeholder.key}
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => insertPlaceholder(placeholder.key)}
                  >
                    {`{{${placeholder.key}}}`}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Creating..." : "Create Template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
