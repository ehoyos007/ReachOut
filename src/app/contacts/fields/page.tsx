"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Settings2,
  Type,
  Hash,
  Calendar,
  List,
  X,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useContactStore } from "@/lib/store/contactStore";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { CustomField, CustomFieldType, CreateCustomFieldInput } from "@/types/contact";
import { FIELD_TYPE_DISPLAY_NAMES } from "@/types/contact";

const FIELD_TYPE_ICONS: Record<CustomFieldType, React.ReactNode> = {
  text: <Type className="w-4 h-4" />,
  number: <Hash className="w-4 h-4" />,
  date: <Calendar className="w-4 h-4" />,
  select: <List className="w-4 h-4" />,
};

const FIELD_TYPE_DESCRIPTIONS: Record<CustomFieldType, string> = {
  text: "Free-form text input",
  number: "Numeric values only",
  date: "Date picker",
  select: "Dropdown with predefined options",
};

interface FieldFormData {
  name: string;
  field_type: CustomFieldType;
  options: string[];
  is_required: boolean;
}

const initialFormData: FieldFormData = {
  name: "",
  field_type: "text",
  options: [],
  is_required: false,
};

export default function CustomFieldsPage() {
  const router = useRouter();
  const [supabaseReady, setSupabaseReady] = useState(true);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [formData, setFormData] = useState<FieldFormData>(initialFormData);
  const [newOption, setNewOption] = useState("");

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<CustomField | null>(null);

  // Store
  const {
    customFields,
    isLoading,
    isSaving,
    isDeleting,
    error,
    fetchCustomFields,
    createCustomField,
    updateCustomField,
    deleteCustomField,
    setError,
  } = useContactStore();

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setSupabaseReady(false);
      return;
    }
    fetchCustomFields();
  }, []);

  const openCreateDialog = () => {
    setEditingField(null);
    setFormData(initialFormData);
    setNewOption("");
    setIsDialogOpen(true);
  };

  const openEditDialog = (field: CustomField) => {
    setEditingField(field);
    setFormData({
      name: field.name,
      field_type: field.field_type,
      options: field.options || [],
      is_required: field.is_required,
    });
    setNewOption("");
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingField(null);
    setFormData(initialFormData);
    setNewOption("");
  };

  const addOption = () => {
    if (newOption.trim() && !formData.options.includes(newOption.trim())) {
      setFormData({
        ...formData,
        options: [...formData.options, newOption.trim()],
      });
      setNewOption("");
    }
  };

  const removeOption = (option: string) => {
    setFormData({
      ...formData,
      options: formData.options.filter((o) => o !== option),
    });
  };

  const handleOptionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addOption();
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError("Field name is required");
      return;
    }

    if (formData.field_type === "select" && formData.options.length === 0) {
      setError("Select fields must have at least one option");
      return;
    }

    const input: CreateCustomFieldInput = {
      name: formData.name.trim(),
      field_type: formData.field_type,
      options: formData.field_type === "select" ? formData.options : undefined,
      is_required: formData.is_required,
    };

    let result;
    if (editingField) {
      result = await updateCustomField({ id: editingField.id, ...input });
    } else {
      result = await createCustomField(input);
    }

    if (result) {
      closeDialog();
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    const success = await deleteCustomField(deleteTarget.id);
    if (success) {
      setDeleteTarget(null);
    }
  };

  if (!supabaseReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Setup Required</CardTitle>
            <CardDescription>
              Configure Supabase to manage custom fields.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/contacts")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Contacts
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Settings2 className="w-5 h-5" />
                Custom Fields
              </h1>
              <p className="text-sm text-gray-500">
                Define additional fields for your contacts
              </p>
            </div>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Add Field
          </Button>
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

        {/* Fields List */}
        <Card>
          <CardHeader>
            <CardTitle>Field Definitions</CardTitle>
            <CardDescription>
              Custom fields appear on contact detail pages and can be used during CSV import.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : customFields.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <Settings2 className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  No custom fields defined
                </h3>
                <p className="text-gray-500 text-center max-w-sm mb-4">
                  Create custom fields to capture additional information about your contacts.
                </p>
                <Button onClick={openCreateDialog}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Field
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {customFields.map((field) => (
                  <div
                    key={field.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500">
                        {FIELD_TYPE_ICONS[field.field_type]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900">
                            {field.name}
                          </h3>
                          {field.is_required && (
                            <Badge variant="secondary" className="text-xs">
                              Required
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {FIELD_TYPE_DISPLAY_NAMES[field.field_type]}
                          {field.field_type === "select" &&
                            field.options &&
                            ` · ${field.options.length} option${field.options.length !== 1 ? "s" : ""}`}
                        </p>
                        {field.field_type === "select" && field.options && field.options.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {field.options.slice(0, 5).map((option) => (
                              <Badge
                                key={option}
                                variant="outline"
                                className="text-xs"
                              >
                                {option}
                              </Badge>
                            ))}
                            {field.options.length > 5 && (
                              <Badge variant="secondary" className="text-xs">
                                +{field.options.length - 5} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(field)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDeleteTarget(field)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Field Type Guide */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Field Types</CardTitle>
            <CardDescription>
              Choose the right field type for your data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {(Object.keys(FIELD_TYPE_DISPLAY_NAMES) as CustomFieldType[]).map(
                (type) => (
                  <div
                    key={type}
                    className="flex items-start gap-3 p-3 rounded-lg border border-gray-200"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                      {FIELD_TYPE_ICONS[type]}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {FIELD_TYPE_DISPLAY_NAMES[type]}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {FIELD_TYPE_DESCRIPTIONS[type]}
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Field Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingField ? "Edit Custom Field" : "Create Custom Field"}
            </DialogTitle>
            <DialogDescription>
              {editingField
                ? "Update the field definition. Changes will apply to all contacts."
                : "Define a new custom field for your contacts."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Field Name */}
            <div className="space-y-2">
              <Label htmlFor="field_name">Field Name</Label>
              <Input
                id="field_name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Company, Job Title, Industry"
              />
            </div>

            {/* Field Type */}
            <div className="space-y-2">
              <Label htmlFor="field_type">Field Type</Label>
              <Select
                value={formData.field_type}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    field_type: value as CustomFieldType,
                    options: value === "select" ? formData.options : [],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(FIELD_TYPE_DISPLAY_NAMES) as CustomFieldType[]).map(
                    (type) => (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          {FIELD_TYPE_ICONS[type]}
                          {FIELD_TYPE_DISPLAY_NAMES[type]}
                        </div>
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {FIELD_TYPE_DESCRIPTIONS[formData.field_type]}
              </p>
            </div>

            {/* Options (for select type) */}
            {formData.field_type === "select" && (
              <div className="space-y-2">
                <Label>Options</Label>
                <div className="flex gap-2">
                  <Input
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    onKeyDown={handleOptionKeyDown}
                    placeholder="Add an option..."
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addOption}
                    disabled={!newOption.trim()}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {formData.options.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.options.map((option) => (
                      <Badge
                        key={option}
                        variant="secondary"
                        className="flex items-center gap-1 pr-1"
                      >
                        {option}
                        <button
                          type="button"
                          onClick={() => removeOption(option)}
                          className="ml-1 hover:bg-gray-300 rounded p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                {formData.options.length === 0 && (
                  <p className="text-xs text-amber-600">
                    Add at least one option for the dropdown
                  </p>
                )}
              </div>
            )}

            {/* Required Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="is_required">Required Field</Label>
                <p className="text-xs text-gray-500">
                  Contacts must have a value for this field
                </p>
              </div>
              <Switch
                id="is_required"
                checked={formData.is_required}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_required: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingField ? "Update Field" : "Create Field"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Custom Field</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the &quot;{deleteTarget?.name}&quot; field?
              This will remove all values for this field from all contacts. This
              action cannot be undone.
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
              Delete Field
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
