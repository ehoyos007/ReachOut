"use client";

import { useState } from "react";
import { Search, Plus, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Tag, ContactWithRelations } from "@/types/contact";
import { DEFAULT_TAG_COLORS } from "@/types/contact";

interface BulkTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedContacts: ContactWithRelations[];
  tags: Tag[];
  onApplyTags: (tagIds: string[]) => Promise<void>;
  onCreateTag?: (name: string, color: string) => Promise<Tag | null>;
}

export function BulkTagModal({
  isOpen,
  onClose,
  selectedContacts,
  tags,
  onApplyTags,
  onCreateTag,
}: BulkTagModalProps) {
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const [showCreateTag, setShowCreateTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(DEFAULT_TAG_COLORS[8]); // Indigo
  const [isCreating, setIsCreating] = useState(false);

  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleTag = (tagId: string) => {
    const newSelected = new Set(selectedTagIds);
    if (newSelected.has(tagId)) {
      newSelected.delete(tagId);
    } else {
      newSelected.add(tagId);
    }
    setSelectedTagIds(newSelected);
  };

  const handleApply = async () => {
    if (selectedTagIds.size === 0) return;

    setIsApplying(true);
    try {
      await onApplyTags(Array.from(selectedTagIds));
      onClose();
      setSelectedTagIds(new Set());
      setSearchQuery("");
    } finally {
      setIsApplying(false);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim() || !onCreateTag) return;

    setIsCreating(true);
    try {
      const newTag = await onCreateTag(newTagName.trim(), newTagColor);
      if (newTag) {
        // Auto-select the newly created tag
        setSelectedTagIds((prev) => new Set([...prev, newTag.id]));
        setShowCreateTag(false);
        setNewTagName("");
        setNewTagColor(DEFAULT_TAG_COLORS[8]);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    onClose();
    setSelectedTagIds(new Set());
    setSearchQuery("");
    setShowCreateTag(false);
    setNewTagName("");
  };

  // Count how many contacts already have each tag
  const tagCounts = new Map<string, number>();
  selectedContacts.forEach((contact) => {
    contact.tags.forEach((tag) => {
      tagCounts.set(tag.id, (tagCounts.get(tag.id) || 0) + 1);
    });
  });

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Tags to Contacts</DialogTitle>
          <DialogDescription>
            Select tags to add to {selectedContacts.length} contact
            {selectedContacts.length !== 1 ? "s" : ""}.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Selected Tags Preview */}
          {selectedTagIds.size > 0 && (
            <div className="flex flex-wrap gap-2 p-3 bg-blue-50 rounded-lg">
              <span className="text-sm text-blue-700 font-medium">
                Adding:
              </span>
              {Array.from(selectedTagIds).map((tagId) => {
                const tag = tags.find((t) => t.id === tagId);
                if (!tag) return null;
                return (
                  <Badge
                    key={tag.id}
                    variant="outline"
                    style={{ borderColor: tag.color, color: tag.color }}
                    className="cursor-pointer hover:opacity-75"
                    onClick={() => handleToggleTag(tag.id)}
                  >
                    {tag.name}
                    <span className="ml-1 text-gray-400">&times;</span>
                  </Badge>
                );
              })}
            </div>
          )}

          {/* Tag List */}
          <div className="max-h-60 overflow-y-auto border rounded-lg">
            {filteredTags.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {searchQuery ? "No tags match your search" : "No tags available"}
              </div>
            ) : (
              <div className="divide-y">
                {filteredTags.map((tag) => {
                  const isSelected = selectedTagIds.has(tag.id);
                  const existingCount = tagCounts.get(tag.id) || 0;

                  return (
                    <button
                      key={tag.id}
                      onClick={() => handleToggleTag(tag.id)}
                      className={`w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors ${
                        isSelected ? "bg-blue-50" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full border-2"
                          style={{
                            backgroundColor: isSelected ? tag.color : "transparent",
                            borderColor: tag.color,
                          }}
                        >
                          {isSelected && (
                            <Check className="w-3 h-3 text-white" style={{ margin: "-1px" }} />
                          )}
                        </div>
                        <span className="font-medium">{tag.name}</span>
                      </div>

                      {existingCount > 0 && (
                        <span className="text-xs text-gray-400">
                          {existingCount} already have this tag
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Create New Tag Section */}
          {onCreateTag && (
            <div className="border-t pt-4">
              {showCreateTag ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="new-tag-name">New Tag Name</Label>
                    <Input
                      id="new-tag-name"
                      placeholder="Enter tag name"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newTagName.trim()) {
                          handleCreateTag();
                        }
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Color</Label>
                    <div className="flex flex-wrap gap-2">
                      {DEFAULT_TAG_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewTagColor(color)}
                          className={`w-6 h-6 rounded transition-transform ${
                            newTagColor === color
                              ? "ring-2 ring-offset-2 ring-gray-400 scale-110"
                              : ""
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowCreateTag(false);
                        setNewTagName("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleCreateTag}
                      disabled={!newTagName.trim() || isCreating}
                    >
                      {isCreating && (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      )}
                      Create Tag
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateTag(true)}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Tag
                </Button>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={selectedTagIds.size === 0 || isApplying}
          >
            {isApplying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Apply Tags to {selectedContacts.length} Contact
            {selectedContacts.length !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BulkTagModal;
