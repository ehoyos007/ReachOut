"use client";

import { useState } from "react";
import {
  Users,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Edit2,
  Trash2,
  Loader2,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { SavedView } from "@/types/contact";
import { SAVED_VIEW_COLORS, SAVED_VIEW_ICONS } from "@/types/contact";
import { IconByName } from "./ContactFilterBuilder";
import type { UseSavedViewsReturn } from "@/hooks/useSavedViews";

interface SavedViewsSidebarProps {
  savedViewsState: UseSavedViewsReturn;
  onSelectView: (view: SavedView | null) => void;
  totalContacts: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function SavedViewsSidebar({
  savedViewsState,
  onSelectView,
  totalContacts,
  isCollapsed = false,
  onToggleCollapse,
}: SavedViewsSidebarProps) {
  const {
    views,
    isLoading,
    isSaving,
    activeViewId,
    update,
    remove,
  } = savedViewsState;

  const [isSavedViewsOpen, setIsSavedViewsOpen] = useState(true);
  const [editingView, setEditingView] = useState<SavedView | null>(null);
  const [deleteView, setDeleteView] = useState<SavedView | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [editColor, setEditColor] = useState("");

  const handleEditView = async () => {
    if (!editingView || !editName.trim()) return;

    await update({
      id: editingView.id,
      name: editName.trim(),
      icon: editIcon,
      color: editColor,
    });

    setEditingView(null);
  };

  const handleDeleteView = async () => {
    if (!deleteView) return;

    await remove(deleteView.id);
    if (activeViewId === deleteView.id) {
      onSelectView(null);
    }
    setDeleteView(null);
  };

  const openEditDialog = (view: SavedView) => {
    setEditingView(view);
    setEditName(view.name);
    setEditIcon(view.icon);
    setEditColor(view.color);
  };

  if (isCollapsed) {
    return (
      <div className="w-12 border-r bg-white flex flex-col items-center py-4 h-full overflow-y-auto">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4"
          onClick={onToggleCollapse}
        >
          <PanelLeft className="w-4 h-4" />
        </Button>

        {/* All Contacts Icon */}
        <Button
          variant={activeViewId === null ? "secondary" : "ghost"}
          size="sm"
          className="w-10 h-10 p-0 mb-2"
          onClick={() => onSelectView(null)}
          title="All Contacts"
        >
          <Users className="w-4 h-4" />
        </Button>

        {/* Saved View Icons */}
        {views.map((view) => (
          <Button
            key={view.id}
            variant={activeViewId === view.id ? "secondary" : "ghost"}
            size="sm"
            className="w-10 h-10 p-0 mb-1"
            onClick={() => onSelectView(view)}
            title={view.name}
          >
            <IconByName name={view.icon} className="w-4 h-4" style={{ color: view.color }} />
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div className="w-64 border-r bg-white flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold text-gray-900">Views</h2>
        {onToggleCollapse && (
          <Button variant="ghost" size="sm" onClick={onToggleCollapse}>
            <PanelLeftClose className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Views List */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* All Contacts */}
        <button
          onClick={() => onSelectView(null)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
            activeViewId === null
              ? "bg-blue-50 text-blue-700"
              : "hover:bg-gray-100 text-gray-700"
          }`}
        >
          <Users className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1 truncate font-medium">All Contacts</span>
          <span className="text-sm text-gray-500">{totalContacts}</span>
        </button>

        {/* Saved Views Section */}
        <Collapsible
          open={isSavedViewsOpen}
          onOpenChange={setIsSavedViewsOpen}
          className="mt-4"
        >
          <CollapsibleTrigger className="flex items-center gap-2 px-3 py-2 w-full text-sm font-medium text-gray-500 hover:text-gray-700">
            {isSavedViewsOpen ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            Saved Views
            {views.length > 0 && (
              <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                {views.length}
              </span>
            )}
          </CollapsibleTrigger>

          <CollapsibleContent className="space-y-1 mt-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              </div>
            ) : views.length === 0 ? (
              <p className="text-sm text-gray-400 px-3 py-2">
                No saved views yet
              </p>
            ) : (
              views.map((view) => (
                <SavedViewItem
                  key={view.id}
                  view={view}
                  isActive={activeViewId === view.id}
                  onSelect={() => onSelectView(view)}
                  onEdit={() => openEditDialog(view)}
                  onDelete={() => setDeleteView(view)}
                />
              ))
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Edit View Dialog */}
      <Dialog open={!!editingView} onOpenChange={() => setEditingView(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit View</DialogTitle>
            <DialogDescription>
              Update the name, icon, or color of this view.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-view-name">Name</Label>
              <Input
                id="edit-view-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Icon</Label>
              <div className="flex flex-wrap gap-2">
                {SAVED_VIEW_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setEditIcon(icon)}
                    className={`w-8 h-8 rounded flex items-center justify-center border-2 transition-colors ${
                      editIcon === icon
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <IconByName name={icon} className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {SAVED_VIEW_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setEditColor(color)}
                    className={`w-8 h-8 rounded transition-transform ${
                      editColor === color
                        ? "ring-2 ring-offset-2 ring-gray-400 scale-110"
                        : ""
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingView(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditView} disabled={isSaving || !editName.trim()}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteView} onOpenChange={() => setDeleteView(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete View</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteView?.name}&quot;? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteView(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteView}
              disabled={isSaving}
            >
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Saved View Item Component
interface SavedViewItemProps {
  view: SavedView;
  isActive: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function SavedViewItem({
  view,
  isActive,
  onSelect,
  onEdit,
  onDelete,
}: SavedViewItemProps) {
  return (
    <div
      className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
        isActive
          ? "bg-blue-50 text-blue-700"
          : "hover:bg-gray-100 text-gray-700"
      }`}
    >
      <button
        onClick={onSelect}
        className="flex items-center gap-3 flex-1 min-w-0"
      >
        <IconByName
          name={view.icon}
          className="w-4 h-4 flex-shrink-0"
          style={{ color: view.color }}
        />
        <span className="truncate text-sm">{view.name}</span>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Edit2 className="w-4 h-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-red-600" onClick={onDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default SavedViewsSidebar;
