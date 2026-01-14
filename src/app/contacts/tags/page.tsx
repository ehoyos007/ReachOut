"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Tag,
  Check,
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
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useContactStore } from "@/lib/store/contactStore";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { Tag as TagType, CreateTagInput } from "@/types/contact";
import { DEFAULT_TAG_COLORS } from "@/types/contact";

interface TagFormData {
  name: string;
  color: string;
}

const initialFormData: TagFormData = {
  name: "",
  color: DEFAULT_TAG_COLORS[0],
};

export default function TagsManagementPage() {
  const router = useRouter();
  const [supabaseReady, setSupabaseReady] = useState(true);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagType | null>(null);
  const [formData, setFormData] = useState<TagFormData>(initialFormData);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<TagType | null>(null);

  // Store
  const {
    tags,
    isLoading,
    isSaving,
    isDeleting,
    error,
    fetchTags,
    createTag,
    updateTag,
    deleteTag,
    setError,
  } = useContactStore();

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setSupabaseReady(false);
      return;
    }
    fetchTags();
  }, []);

  const openCreateDialog = () => {
    setEditingTag(null);
    setFormData(initialFormData);
    setIsDialogOpen(true);
  };

  const openEditDialog = (tag: TagType) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      color: tag.color,
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingTag(null);
    setFormData(initialFormData);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError("Tag name is required");
      return;
    }

    // Check for duplicate names (excluding current tag if editing)
    const isDuplicate = tags.some(
      (t) =>
        t.name.toLowerCase() === formData.name.trim().toLowerCase() &&
        t.id !== editingTag?.id
    );

    if (isDuplicate) {
      setError("A tag with this name already exists");
      return;
    }

    const input: CreateTagInput = {
      name: formData.name.trim(),
      color: formData.color,
    };

    let result;
    if (editingTag) {
      result = await updateTag({ id: editingTag.id, ...input });
    } else {
      result = await createTag(input);
    }

    if (result) {
      closeDialog();
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    const success = await deleteTag(deleteTarget.id);
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
              Configure Supabase to manage tags.
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
                <Tag className="w-5 h-5" />
                Manage Tags
              </h1>
              <p className="text-sm text-gray-500">
                Create and organize tags for your contacts
              </p>
            </div>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Add Tag
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

        {/* Tags List */}
        <Card>
          <CardHeader>
            <CardTitle>Tags</CardTitle>
            <CardDescription>
              Tags help you categorize and filter contacts. Each contact can have multiple tags.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : tags.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <Tag className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  No tags created
                </h3>
                <p className="text-gray-500 text-center max-w-sm mb-4">
                  Create tags to categorize your contacts and make filtering easier.
                </p>
                <Button onClick={openCreateDialog}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Tag
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 group hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{
                          backgroundColor: tag.color,
                          boxShadow: `0 0 0 2px white, 0 0 0 4px ${tag.color}`,
                        }}
                      />
                      <span className="font-medium text-gray-900">
                        {tag.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(tag)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDeleteTarget(tag)}
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

        {/* Usage Tips */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Using Tags</CardTitle>
            <CardDescription>
              Tips for organizing your contacts with tags
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <h4 className="font-medium text-blue-900 mb-2">
                  Categorize by Source
                </h4>
                <p className="text-sm text-blue-700">
                  Create tags like &quot;Website Lead&quot;, &quot;Referral&quot;, or &quot;Event&quot; to track where contacts came from.
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                <h4 className="font-medium text-green-900 mb-2">
                  Segment by Interest
                </h4>
                <p className="text-sm text-green-700">
                  Use tags like &quot;Product A&quot;, &quot;Enterprise&quot;, or &quot;Small Business&quot; to segment your audience.
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                <h4 className="font-medium text-purple-900 mb-2">
                  Track Campaign Membership
                </h4>
                <p className="text-sm text-purple-700">
                  Add tags for specific campaigns to track which contacts received certain outreach.
                </p>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                <h4 className="font-medium text-amber-900 mb-2">
                  Filter in Workflows
                </h4>
                <p className="text-sm text-amber-700">
                  Tags can be used in workflow conditions to target specific groups of contacts.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Tag Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTag ? "Edit Tag" : "Create Tag"}
            </DialogTitle>
            <DialogDescription>
              {editingTag
                ? "Update the tag name or color."
                : "Create a new tag to categorize your contacts."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Tag Name */}
            <div className="space-y-2">
              <Label htmlFor="tag_name">Tag Name</Label>
              <Input
                id="tag_name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., VIP, Hot Lead, Partner"
              />
            </div>

            {/* Color Picker */}
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="grid grid-cols-7 gap-2">
                {DEFAULT_TAG_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                    style={{
                      backgroundColor: color,
                      boxShadow: formData.color === color
                        ? `0 0 0 2px white, 0 0 0 4px ${color}`
                        : "none",
                    }}
                    onClick={() => setFormData({ ...formData, color })}
                  >
                    {formData.color === color && (
                      <Check className="w-4 h-4 text-white drop-shadow-md" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="p-4 bg-gray-50 rounded-lg">
                <Badge
                  variant="outline"
                  className="text-sm"
                  style={{
                    borderColor: formData.color,
                    color: formData.color,
                  }}
                >
                  {formData.name || "Tag Name"}
                </Badge>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingTag ? "Update Tag" : "Create Tag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tag</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the &quot;{deleteTarget?.name}&quot; tag?
              This will remove the tag from all contacts. This action cannot be undone.
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
              Delete Tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
