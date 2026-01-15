"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  MessageSquare,
  Mail,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  Loader2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTemplateStore } from "@/lib/store/templateStore";
import { isSupabaseConfigured } from "@/lib/supabase";
import type {
  Template,
  TemplateChannel,
  CreateTemplateInput,
} from "@/types/template";
import {
  CHANNEL_DISPLAY_NAMES,
  STANDARD_PLACEHOLDERS,
  extractPlaceholders,
  replacePlaceholders,
  calculateSmsSegments,
  getSamplePlaceholderValues,
} from "@/types/template";

interface TemplateFormData {
  name: string;
  channel: TemplateChannel;
  subject: string;
  body: string;
}

const initialFormData: TemplateFormData = {
  name: "",
  channel: "sms",
  subject: "",
  body: "",
};

export default function TemplatesPage() {
  const [supabaseReady, setSupabaseReady] = useState(true);

  // Dialog states
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>(initialFormData);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);

  // Store
  const {
    templates,
    filters,
    isLoading,
    isSaving,
    isDeleting,
    error,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    setFilters,
    clearFilters,
    setError,
  } = useTemplateStore();

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setSupabaseReady(false);
      return;
    }
    fetchTemplates();
  }, [fetchTemplates]);

  // Refetch when filters change
  useEffect(() => {
    if (supabaseReady) {
      fetchTemplates();
    }
  }, [filters.channel, fetchTemplates, supabaseReady]);

  // Debounced search
  useEffect(() => {
    if (!supabaseReady) return;

    const timer = setTimeout(() => {
      fetchTemplates();
    }, 300);

    return () => clearTimeout(timer);
  }, [filters.search, fetchTemplates, supabaseReady]);

  const openCreateDialog = () => {
    setEditingTemplate(null);
    setFormData(initialFormData);
    setActiveTab("edit");
    setIsEditorOpen(true);
  };

  const openEditDialog = (template: Template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      channel: template.channel,
      subject: template.subject || "",
      body: template.body,
    });
    setActiveTab("edit");
    setIsEditorOpen(true);
  };

  const handleDuplicate = (template: Template) => {
    setEditingTemplate(null);
    setFormData({
      name: `${template.name} (Copy)`,
      channel: template.channel,
      subject: template.subject || "",
      body: template.body,
    });
    setActiveTab("edit");
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setEditingTemplate(null);
    setFormData(initialFormData);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError("Template name is required");
      return;
    }

    if (!formData.body.trim()) {
      setError("Template body is required");
      return;
    }

    if (formData.channel === "email" && !formData.subject.trim()) {
      setError("Email subject is required");
      return;
    }

    const input: CreateTemplateInput = {
      name: formData.name.trim(),
      channel: formData.channel,
      subject: formData.channel === "email" ? formData.subject.trim() : null,
      body: formData.body.trim(),
    };

    let result;
    if (editingTemplate) {
      result = await updateTemplate({ id: editingTemplate.id, ...input });
    } else {
      result = await createTemplate(input);
    }

    if (result) {
      closeEditor();
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    const success = await deleteTemplate(deleteTarget.id);
    if (success) {
      setDeleteTarget(null);
    }
  };

  const insertPlaceholder = (key: string) => {
    const placeholder = `{{${key}}}`;
    setFormData((prev) => ({
      ...prev,
      body: prev.body + placeholder,
    }));
  };

  // Calculate preview with sample values
  const previewBody = replacePlaceholders(
    formData.body,
    getSamplePlaceholderValues()
  );
  const previewSubject = replacePlaceholders(
    formData.subject,
    getSamplePlaceholderValues()
  );

  // SMS segment info
  const smsInfo = formData.channel === "sms" ? calculateSmsSegments(previewBody) : null;

  // Get placeholders used in template
  const usedPlaceholders = extractPlaceholders(formData.body + " " + formData.subject);

  if (!supabaseReady) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Setup Required</CardTitle>
            <CardDescription>
              Configure Supabase to manage templates.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Message Templates
          </h1>
          <p className="text-gray-500">
            Create and manage reusable templates for SMS and email messages
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search templates..."
            value={filters.search || ""}
            onChange={(e) => setFilters({ search: e.target.value || undefined })}
            className="pl-10"
          />
        </div>
        <Select
          value={filters.channel || "all"}
          onValueChange={(value) =>
            setFilters({
              channel: value === "all" ? undefined : (value as TemplateChannel),
            })
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Channels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Channels</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
            <SelectItem value="email">Email</SelectItem>
          </SelectContent>
        </Select>
        {(filters.search || filters.channel) && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear Filters
          </Button>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
          <button className="ml-2 underline" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      {/* Templates List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              No templates yet
            </h3>
            <p className="text-gray-500 text-center max-w-sm mb-4">
              Create your first template to use in workflows and manual outreach.
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card
              key={template.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => openEditDialog(template)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {template.channel === "sms" ? (
                      <MessageSquare className="w-4 h-4 text-blue-500" />
                    ) : (
                      <Mail className="w-4 h-4 text-purple-500" />
                    )}
                    <Badge variant="outline" className="text-xs">
                      {CHANNEL_DISPLAY_NAMES[template.channel]}
                    </Badge>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(template);
                        }}
                      >
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicate(template);
                        }}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(template);
                        }}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardTitle className="text-base mt-2">{template.name}</CardTitle>
                {template.channel === "email" && template.subject && (
                  <CardDescription className="text-xs truncate">
                    Subject: {template.subject}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 line-clamp-3">
                  {template.body}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  {extractPlaceholders(template.body).slice(0, 3).map((key) => (
                    <Badge key={key} variant="secondary" className="text-xs">
                      {`{{${key}}}`}
                    </Badge>
                  ))}
                  {extractPlaceholders(template.body).length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{extractPlaceholders(template.body).length - 3} more
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Template Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Edit Template" : "Create Template"}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate
                ? "Update your message template."
                : "Create a new reusable message template with placeholders."}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "edit" | "preview")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="edit">Edit</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="edit" className="space-y-4 mt-4">
              {/* Template Name */}
              <div className="space-y-2">
                <Label htmlFor="template_name">Template Name</Label>
                <Input
                  id="template_name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Welcome Message, Follow-up Reminder"
                />
              </div>

              {/* Channel */}
              <div className="space-y-2">
                <Label>Channel</Label>
                <Select
                  value={formData.channel}
                  onValueChange={(value) =>
                    setFormData({ ...formData, channel: value as TemplateChannel })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sms">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        SMS
                      </div>
                    </SelectItem>
                    <SelectItem value="email">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Subject (Email only) */}
              {formData.channel === "email" && (
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject Line</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) =>
                      setFormData({ ...formData, subject: e.target.value })
                    }
                    placeholder="e.g., Hi {{first_name}}, we have an update for you"
                  />
                </div>
              )}

              {/* Body */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="body">Message Body</Label>
                  {formData.channel === "sms" && smsInfo && (
                    <span className="text-xs text-gray-500">
                      {smsInfo.charactersUsed} chars · {smsInfo.segments} segment(s)
                      {smsInfo.isUnicode && " (Unicode)"}
                    </span>
                  )}
                </div>
                <Textarea
                  id="body"
                  value={formData.body}
                  onChange={(e) =>
                    setFormData({ ...formData, body: e.target.value })
                  }
                  placeholder="Write your message here. Use {{placeholders}} for personalization."
                  rows={formData.channel === "email" ? 10 : 5}
                  className="font-mono text-sm"
                />
              </div>

              {/* Placeholders */}
              <div className="space-y-2">
                <Label>Insert Placeholder</Label>
                <div className="flex flex-wrap gap-2">
                  {STANDARD_PLACEHOLDERS.map((placeholder) => (
                    <Button
                      key={placeholder.key}
                      variant="outline"
                      size="sm"
                      onClick={() => insertPlaceholder(placeholder.key)}
                      className="text-xs"
                    >
                      {`{{${placeholder.key}}}`}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  Click a placeholder to insert it at the end of your message.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    {formData.channel === "sms" ? (
                      <MessageSquare className="w-4 h-4" />
                    ) : (
                      <Mail className="w-4 h-4" />
                    )}
                    {CHANNEL_DISPLAY_NAMES[formData.channel]} Preview
                  </CardTitle>
                  <CardDescription>
                    Sample contact: John Doe (john@example.com)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {formData.channel === "email" && (
                    <div>
                      <Label className="text-xs text-gray-500">Subject</Label>
                      <p className="font-medium">
                        {previewSubject || "(No subject)"}
                      </p>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs text-gray-500">Message</Label>
                    <div
                      className={`p-4 rounded-lg whitespace-pre-wrap ${
                        formData.channel === "sms"
                          ? "bg-green-50 border border-green-200"
                          : "bg-blue-50 border border-blue-200"
                      }`}
                    >
                      {previewBody || "(No message content)"}
                    </div>
                  </div>

                  {/* Placeholder usage summary */}
                  {usedPlaceholders.length > 0 && (
                    <div>
                      <Label className="text-xs text-gray-500">
                        Placeholders Used
                      </Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {usedPlaceholders.map((key) => {
                          const info = STANDARD_PLACEHOLDERS.find(
                            (p) => p.key === key
                          );
                          return (
                            <Badge
                              key={key}
                              variant={info ? "secondary" : "destructive"}
                              className="text-xs"
                            >
                              {`{{${key}}}`}
                              {!info && " (unknown)"}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* SMS segment info */}
                  {formData.channel === "sms" && smsInfo && (
                    <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                      <p>
                        <strong>Characters:</strong> {smsInfo.charactersUsed}
                      </p>
                      <p>
                        <strong>Segments:</strong> {smsInfo.segments}{" "}
                        {smsInfo.segments > 1 &&
                          `(${smsInfo.charactersPerSegment} chars per segment)`}
                      </p>
                      {smsInfo.isUnicode && (
                        <p className="text-amber-600">
                          <strong>Note:</strong> Unicode characters detected.
                          Message uses shorter segments.
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={closeEditor} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingTemplate ? "Update Template" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
