"use client";

import { useState } from "react";
import {
  Tag,
  MessageSquare,
  Mail,
  Trash2,
  X,
  CheckSquare,
  Square,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface BulkActionToolbarProps {
  selectedCount: number;
  totalFilteredCount: number;
  isAllSelected: boolean;
  onClearSelection: () => void;
  onSelectAll: () => void;
  onSelectAllFiltered?: () => void;
  onBulkTag: () => void;
  onBulkSms: () => void;
  onBulkEmail: () => void;
  onBulkDelete: () => void;
  isDeleting?: boolean;
  showSelectAllFiltered?: boolean;
}

export function BulkActionToolbar({
  selectedCount,
  totalFilteredCount,
  isAllSelected,
  onClearSelection,
  onSelectAll,
  onSelectAllFiltered,
  onBulkTag,
  onBulkSms,
  onBulkEmail,
  onBulkDelete,
  isDeleting = false,
  showSelectAllFiltered = false,
}: BulkActionToolbarProps) {
  const [showAllFilteredBanner, setShowAllFilteredBanner] = useState(false);

  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Selection Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {isAllSelected ? (
              <CheckSquare className="w-5 h-5 text-blue-600" />
            ) : (
              <Square className="w-5 h-5 text-blue-600" />
            )}
            <span className="text-sm font-medium text-blue-700">
              {selectedCount} contact{selectedCount !== 1 ? "s" : ""} selected
            </span>
          </div>

          {/* Select All / Clear buttons */}
          <div className="flex items-center gap-1">
            {!isAllSelected && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                onClick={onSelectAll}
              >
                Select page
              </Button>
            )}

            {showSelectAllFiltered &&
              selectedCount < totalFilteredCount &&
              onSelectAllFiltered && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                  onClick={() => {
                    onSelectAllFiltered();
                    setShowAllFilteredBanner(true);
                  }}
                >
                  Select all {totalFilteredCount}
                </Button>
              )}

            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-gray-500 hover:text-gray-700"
              onClick={() => {
                onClearSelection();
                setShowAllFilteredBanner(false);
              }}
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-white"
            onClick={onBulkTag}
          >
            <Tag className="w-4 h-4 mr-2" />
            Add Tags
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="bg-white"
            onClick={onBulkSms}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Send SMS
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="bg-white"
            onClick={onBulkEmail}
          >
            <Mail className="w-4 h-4 mr-2" />
            Send Email
          </Button>

          <div className="w-px h-6 bg-blue-200 mx-1" />

          <Button
            variant="destructive"
            size="sm"
            onClick={onBulkDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4 mr-2" />
            )}
            Delete
          </Button>
        </div>
      </div>

      {/* All Filtered Banner */}
      {showAllFilteredBanner && selectedCount === totalFilteredCount && (
        <div className="mt-2 text-sm text-blue-600">
          All {totalFilteredCount} contacts matching your filters are selected.
        </div>
      )}
    </div>
  );
}

export default BulkActionToolbar;
