"use client";

import { useState } from "react";
import {
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Filter,
  Save,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type {
  FilterCondition,
  FilterGroup,
  AdvancedFilters,
  FilterFieldType,
  Tag,
} from "@/types/contact";
import {
  STANDARD_FILTERABLE_FIELDS,
  getOperatorsForFieldType,
  STATUS_DISPLAY_NAMES,
  SAVED_VIEW_COLORS,
  SAVED_VIEW_ICONS,
} from "@/types/contact";
import type { UseContactFiltersReturn } from "@/hooks/useContactFilters";
import type { Contact } from "@/types/contact";

interface ContactFilterBuilderProps {
  filterState: UseContactFiltersReturn;
  tags: Tag[];
  onSaveView?: (name: string, icon: string, color: string) => void;
  showSaveButton?: boolean;
}

export function ContactFilterBuilder({
  filterState,
  tags,
  onSaveView,
  showSaveButton = true,
}: ContactFilterBuilderProps) {
  const {
    filters,
    addGroup,
    removeGroup,
    updateGroupLogic,
    addCondition,
    removeCondition,
    updateCondition,
    updateConditionField,
    updateGroupsLogic,
    clearFilters,
    hasFilters,
    filterCount,
  } = filterState;

  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [saveViewName, setSaveViewName] = useState("");
  const [saveViewIcon, setSaveViewIcon] = useState("filter");
  const [saveViewColor, setSaveViewColor] = useState(SAVED_VIEW_COLORS[0]);

  const handleSaveView = () => {
    if (saveViewName.trim() && onSaveView) {
      onSaveView(saveViewName.trim(), saveViewIcon, saveViewColor);
      setIsSaveDialogOpen(false);
      setSaveViewName("");
    }
  };

  return (
    <div className="space-y-3">
      {/* Filter Header */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2"
        >
          <Filter className="w-4 h-4" />
          Filters
          {filterCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {filterCount}
            </Badge>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </Button>

        {hasFilters && (
          <>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>

            {showSaveButton && onSaveView && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSaveDialogOpen(true)}
              >
                <Save className="w-4 h-4 mr-1" />
                Save View
              </Button>
            )}
          </>
        )}
      </div>

      {/* Filter Groups */}
      {isExpanded && (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
          {filters.groups.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500 mb-3">
                No filters applied. Add a filter group to get started.
              </p>
              <Button variant="outline" size="sm" onClick={addGroup}>
                <Plus className="w-4 h-4 mr-1" />
                Add Filter Group
              </Button>
            </div>
          ) : (
            <>
              {filters.groups.map((group, groupIndex) => (
                <FilterGroupComponent
                  key={group.id}
                  group={group}
                  groupIndex={groupIndex}
                  totalGroups={filters.groups.length}
                  groupsLogic={filters.groupLogic}
                  tags={tags}
                  onUpdateGroupLogic={updateGroupLogic}
                  onUpdateGroupsLogic={updateGroupsLogic}
                  onAddCondition={addCondition}
                  onRemoveCondition={removeCondition}
                  onUpdateCondition={updateCondition}
                  onUpdateConditionField={updateConditionField}
                  onRemoveGroup={removeGroup}
                />
              ))}

              <Button variant="outline" size="sm" onClick={addGroup}>
                <Plus className="w-4 h-4 mr-1" />
                Add Filter Group
              </Button>
            </>
          )}
        </div>
      )}

      {/* Save View Dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save View</DialogTitle>
            <DialogDescription>
              Save the current filters as a named view for quick access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="view-name">View Name</Label>
              <Input
                id="view-name"
                placeholder="e.g., Hot Leads, New This Week"
                value={saveViewName}
                onChange={(e) => setSaveViewName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Icon</Label>
              <div className="flex flex-wrap gap-2">
                {SAVED_VIEW_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setSaveViewIcon(icon)}
                    className={`w-8 h-8 rounded flex items-center justify-center border-2 transition-colors ${
                      saveViewIcon === icon
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
                    onClick={() => setSaveViewColor(color)}
                    className={`w-8 h-8 rounded transition-transform ${
                      saveViewColor === color ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : ""
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSaveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveView}
              disabled={!saveViewName.trim()}
            >
              Save View
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Filter Group Component
interface FilterGroupComponentProps {
  group: FilterGroup;
  groupIndex: number;
  totalGroups: number;
  groupsLogic: "and" | "or";
  tags: Tag[];
  onUpdateGroupLogic: (groupId: string, logic: "and" | "or") => void;
  onUpdateGroupsLogic: (logic: "and" | "or") => void;
  onAddCondition: (groupId: string) => void;
  onRemoveCondition: (groupId: string, conditionId: string) => void;
  onUpdateCondition: (
    groupId: string,
    conditionId: string,
    updates: Partial<FilterCondition>
  ) => void;
  onUpdateConditionField: (
    groupId: string,
    conditionId: string,
    fieldId: string
  ) => void;
  onRemoveGroup: (groupId: string) => void;
}

function FilterGroupComponent({
  group,
  groupIndex,
  totalGroups,
  groupsLogic,
  tags,
  onUpdateGroupLogic,
  onUpdateGroupsLogic,
  onAddCondition,
  onRemoveCondition,
  onUpdateCondition,
  onUpdateConditionField,
  onRemoveGroup,
}: FilterGroupComponentProps) {
  return (
    <div className="space-y-3">
      {/* Group Logic Separator */}
      {groupIndex > 0 && (
        <div className="flex items-center gap-2 py-2">
          <div className="flex-1 h-px bg-gray-300" />
          <Select
            value={groupsLogic}
            onValueChange={(value) =>
              onUpdateGroupsLogic(value as "and" | "or")
            }
          >
            <SelectTrigger className="w-20 h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="and">AND</SelectItem>
              <SelectItem value="or">OR</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex-1 h-px bg-gray-300" />
        </div>
      )}

      {/* Group Container */}
      <div className="p-3 bg-white rounded border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">
              Filter Group {groupIndex + 1}
            </span>
            {group.conditions.length > 1 && (
              <Select
                value={group.logic}
                onValueChange={(value) =>
                  onUpdateGroupLogic(group.id, value as "and" | "or")
                }
              >
                <SelectTrigger className="w-20 h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="and">AND</SelectItem>
                  <SelectItem value="or">OR</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-gray-400 hover:text-red-500"
            onClick={() => onRemoveGroup(group.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Conditions */}
        <div className="space-y-2">
          {group.conditions.map((condition, condIndex) => (
            <FilterConditionComponent
              key={condition.id}
              condition={condition}
              conditionIndex={condIndex}
              groupId={group.id}
              groupLogic={group.logic}
              tags={tags}
              onUpdate={(updates) =>
                onUpdateCondition(group.id, condition.id, updates)
              }
              onUpdateField={(fieldId) =>
                onUpdateConditionField(group.id, condition.id, fieldId)
              }
              onRemove={() => onRemoveCondition(group.id, condition.id)}
              showLogic={condIndex > 0}
            />
          ))}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="mt-2 text-gray-500"
          onClick={() => onAddCondition(group.id)}
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Condition
        </Button>
      </div>
    </div>
  );
}

// Filter Condition Component
interface FilterConditionComponentProps {
  condition: FilterCondition;
  conditionIndex: number;
  groupId: string;
  groupLogic: "and" | "or";
  tags: Tag[];
  onUpdate: (updates: Partial<FilterCondition>) => void;
  onUpdateField: (fieldId: string) => void;
  onRemove: () => void;
  showLogic: boolean;
}

function FilterConditionComponent({
  condition,
  groupLogic,
  tags,
  onUpdate,
  onUpdateField,
  onRemove,
  showLogic,
}: FilterConditionComponentProps) {
  const operators = getOperatorsForFieldType(condition.fieldType);
  const currentOperator = operators.find(
    (op) => op.value === condition.operator
  );

  // Check if operator needs value input
  const needsValue = !["is_empty", "is_not_empty", "last_7_days", "last_30_days", "last_90_days", "this_month", "this_year", "is_true", "is_false"].includes(
    condition.operator
  );
  const needsSecondValue = condition.operator === "between";

  return (
    <div className="flex items-center gap-2">
      {/* Logic Label */}
      {showLogic && (
        <span className="text-xs text-gray-400 w-8 text-center uppercase">
          {groupLogic}
        </span>
      )}
      {!showLogic && <div className="w-8" />}

      {/* Field Select */}
      <Select
        value={condition.field}
        onValueChange={onUpdateField}
      >
        <SelectTrigger className="w-36 h-8 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STANDARD_FILTERABLE_FIELDS.map((field) => (
            <SelectItem key={field.id} value={field.id}>
              {field.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Operator Select */}
      <Select
        value={condition.operator}
        onValueChange={(value) => onUpdate({ operator: value as FilterCondition["operator"] })}
      >
        <SelectTrigger className="w-36 h-8 text-sm">
          <SelectValue>{currentOperator?.label}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {operators.map((op) => (
            <SelectItem key={op.value} value={op.value}>
              {op.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Value Input */}
      {needsValue && (
        <ValueInput
          condition={condition}
          tags={tags}
          onUpdate={onUpdate}
        />
      )}

      {/* Second Value for Between */}
      {needsSecondValue && (
        <>
          <span className="text-sm text-gray-400">and</span>
          <Input
            type={condition.fieldType === "date" ? "date" : "text"}
            className="w-32 h-8 text-sm"
            value={condition.value2 || ""}
            onChange={(e) => onUpdate({ value2: e.target.value })}
            placeholder="End value"
          />
        </>
      )}

      {/* Remove Button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
        onClick={onRemove}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}

// Value Input Component (handles different field types)
interface ValueInputProps {
  condition: FilterCondition;
  tags: Tag[];
  onUpdate: (updates: Partial<FilterCondition>) => void;
}

function ValueInput({ condition, tags, onUpdate }: ValueInputProps) {
  const { fieldType, value } = condition;

  switch (fieldType) {
    case "status":
      return (
        <StatusMultiSelect
          value={Array.isArray(value) ? value : []}
          onChange={(newValue) => onUpdate({ value: newValue })}
        />
      );

    case "tags":
      return (
        <TagMultiSelect
          value={Array.isArray(value) ? value : []}
          tags={tags}
          onChange={(newValue) => onUpdate({ value: newValue })}
        />
      );

    case "date":
      return (
        <Input
          type="date"
          className="w-36 h-8 text-sm"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onUpdate({ value: e.target.value })}
        />
      );

    case "boolean":
      return null; // Boolean operators don't need additional value

    default:
      return (
        <Input
          type="text"
          className="w-36 h-8 text-sm"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onUpdate({ value: e.target.value })}
          placeholder="Enter value"
        />
      );
  }
}

// Status Multi-Select
interface StatusMultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
}

function StatusMultiSelect({ value, onChange }: StatusMultiSelectProps) {
  const statuses = Object.keys(STATUS_DISPLAY_NAMES) as Contact["status"][];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 justify-start w-36">
          {value.length === 0 ? (
            <span className="text-gray-400">Select...</span>
          ) : value.length === 1 ? (
            STATUS_DISPLAY_NAMES[value[0] as Contact["status"]]
          ) : (
            `${value.length} selected`
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2">
        {statuses.map((status) => (
          <div
            key={status}
            className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
            onClick={() => {
              if (value.includes(status)) {
                onChange(value.filter((v) => v !== status));
              } else {
                onChange([...value, status]);
              }
            }}
          >
            <Checkbox
              checked={value.includes(status)}
              onCheckedChange={() => {
                if (value.includes(status)) {
                  onChange(value.filter((v) => v !== status));
                } else {
                  onChange([...value, status]);
                }
              }}
            />
            <span className="text-sm">{STATUS_DISPLAY_NAMES[status]}</span>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// Tag Multi-Select
interface TagMultiSelectProps {
  value: string[];
  tags: Tag[];
  onChange: (value: string[]) => void;
}

function TagMultiSelect({ value, tags, onChange }: TagMultiSelectProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 justify-start w-36">
          {value.length === 0 ? (
            <span className="text-gray-400">Select...</span>
          ) : value.length === 1 ? (
            tags.find((t) => t.id === value[0])?.name || "1 tag"
          ) : (
            `${value.length} tags`
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2 max-h-64 overflow-y-auto">
        {tags.length === 0 ? (
          <p className="text-sm text-gray-500 p-2">No tags available</p>
        ) : (
          tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
              onClick={() => {
                if (value.includes(tag.id)) {
                  onChange(value.filter((v) => v !== tag.id));
                } else {
                  onChange([...value, tag.id]);
                }
              }}
            >
              <Checkbox
                checked={value.includes(tag.id)}
                onCheckedChange={() => {
                  if (value.includes(tag.id)) {
                    onChange(value.filter((v) => v !== tag.id));
                  } else {
                    onChange([...value, tag.id]);
                  }
                }}
              />
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: tag.color }}
              />
              <span className="text-sm">{tag.name}</span>
            </div>
          ))
        )}
      </PopoverContent>
    </Popover>
  );
}

// Icon helper component
import * as LucideIcons from "lucide-react";

function IconByName({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const pascalName = name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

  const Icon = (LucideIcons as Record<string, React.ComponentType<{ className?: string }>>)[pascalName];

  if (!Icon) {
    return <Filter className={className} />;
  }

  return <Icon className={className} />;
}

export { IconByName };
