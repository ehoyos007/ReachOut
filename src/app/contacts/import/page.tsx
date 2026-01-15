"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  ArrowRight,
  Check,
  X,
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  SkipForward,
  Tag as TagIcon,
  Plus,
  ChevronDown,
  ChevronUp,
  Search,
  Trash2,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { useContactStore } from "@/lib/store/contactStore";
import { isSupabaseConfigured } from "@/lib/supabase";
import type {
  CsvColumn,
  CsvMapping,
  CsvImportResult,
  CsvImportError,
  CreateContactInput,
  Contact,
} from "@/types/contact";
import { STANDARD_CONTACT_FIELDS, STATUS_DISPLAY_NAMES, DEFAULT_TAG_COLORS } from "@/types/contact";

type ImportStep = "upload" | "mapping" | "preview" | "importing" | "complete";

// Conditional tagging types
type RuleOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "is_empty"
  | "is_not_empty"
  | "greater_than"
  | "less_than";

interface ConditionalTagRule {
  id: string;
  column: string;
  operator: RuleOperator;
  value: string;
  tagId: string;
}

const OPERATORS: { value: RuleOperator; label: string; needsValue: boolean }[] = [
  { value: "equals", label: "Equals", needsValue: true },
  { value: "not_equals", label: "Does not equal", needsValue: true },
  { value: "contains", label: "Contains", needsValue: true },
  { value: "not_contains", label: "Does not contain", needsValue: true },
  { value: "starts_with", label: "Starts with", needsValue: true },
  { value: "ends_with", label: "Ends with", needsValue: true },
  { value: "is_empty", label: "Is empty", needsValue: false },
  { value: "is_not_empty", label: "Is not empty", needsValue: false },
  { value: "greater_than", label: "Greater than", needsValue: true },
  { value: "less_than", label: "Less than", needsValue: true },
];

const VALID_STATUSES = Object.keys(STATUS_DISPLAY_NAMES);

export default function ImportContactsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step state
  const [currentStep, setCurrentStep] = useState<ImportStep>("upload");

  // File state
  const [fileError, setFileError] = useState<string | null>(null);

  // CSV data state
  const [columns, setColumns] = useState<CsvColumn[]>([]);
  const [allRows, setAllRows] = useState<Record<string, string>[]>([]);
  const [mappings, setMappings] = useState<CsvMapping[]>([]);

  // Import state
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<CsvImportResult | null>(null);

  // Tag selection state
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tagSectionOpen, setTagSectionOpen] = useState(true);
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const [showCreateTagDialog, setShowCreateTagDialog] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(DEFAULT_TAG_COLORS[8]); // Indigo default
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  // Conditional tagging state
  const [conditionalRules, setConditionalRules] = useState<ConditionalTagRule[]>([]);
  const [conditionalSectionOpen, setConditionalSectionOpen] = useState(false);

  // Store
  const { createContact, tags, fetchTags, createTag } = useContactStore();

  // Fetch tags on mount
  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  // Filter tags by search query
  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(tagSearchQuery.toLowerCase())
  );

  // Get selected tag objects
  const selectedTags = tags.filter((tag) => selectedTagIds.includes(tag.id));

  // Handle tag selection
  const handleTagSelect = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  // Handle tag removal
  const handleTagRemove = (tagId: string) => {
    setSelectedTagIds((prev) => prev.filter((id) => id !== tagId));
  };

  // Handle new tag creation
  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    setIsCreatingTag(true);
    try {
      const newTag = await createTag({
        name: newTagName.trim(),
        color: newTagColor,
      });
      if (newTag) {
        // Auto-select the newly created tag
        setSelectedTagIds((prev) => [...prev, newTag.id]);
        setNewTagName("");
        setNewTagColor(DEFAULT_TAG_COLORS[8]);
        setShowCreateTagDialog(false);
      }
    } finally {
      setIsCreatingTag(false);
    }
  };

  // Conditional rule management
  const addConditionalRule = () => {
    const newRule: ConditionalTagRule = {
      id: crypto.randomUUID(),
      column: columns[0]?.header || "",
      operator: "equals",
      value: "",
      tagId: tags[0]?.id || "",
    };
    setConditionalRules((prev) => [...prev, newRule]);
    setConditionalSectionOpen(true);
  };

  const updateConditionalRule = (id: string, updates: Partial<ConditionalTagRule>) => {
    setConditionalRules((prev) =>
      prev.map((rule) => (rule.id === id ? { ...rule, ...updates } : rule))
    );
  };

  const removeConditionalRule = (id: string) => {
    setConditionalRules((prev) => prev.filter((rule) => rule.id !== id));
  };

  // Evaluate a single rule against a row value
  const evaluateRule = (rule: ConditionalTagRule, row: Record<string, string>): boolean => {
    const cellValue = (row[rule.column] || "").toString().toLowerCase();
    const ruleValue = rule.value.toLowerCase();

    switch (rule.operator) {
      case "equals":
        return cellValue === ruleValue;
      case "not_equals":
        return cellValue !== ruleValue;
      case "contains":
        return cellValue.includes(ruleValue);
      case "not_contains":
        return !cellValue.includes(ruleValue);
      case "starts_with":
        return cellValue.startsWith(ruleValue);
      case "ends_with":
        return cellValue.endsWith(ruleValue);
      case "is_empty":
        return cellValue.trim() === "";
      case "is_not_empty":
        return cellValue.trim() !== "";
      case "greater_than":
        return parseFloat(cellValue) > parseFloat(ruleValue);
      case "less_than":
        return parseFloat(cellValue) < parseFloat(ruleValue);
      default:
        return false;
    }
  };

  // Get all tag IDs that should be applied to a row (both static and conditional)
  const getTagsForRow = (row: Record<string, string>): string[] => {
    const tagIds = new Set<string>(selectedTagIds);

    // Evaluate conditional rules
    for (const rule of conditionalRules) {
      if (rule.tagId && evaluateRule(rule, row)) {
        tagIds.add(rule.tagId);
      }
    }

    return Array.from(tagIds);
  };

  // Get only conditional tags for a row (for preview display)
  const getConditionalTagsForRow = (row: Record<string, string>): string[] => {
    const tagIds: string[] = [];
    for (const rule of conditionalRules) {
      if (rule.tagId && evaluateRule(rule, row) && !tagIds.includes(rule.tagId)) {
        tagIds.push(rule.tagId);
      }
    }
    return tagIds;
  };

  const handleFileSelect = useCallback((file: File) => {
    setFileError(null);

    if (!file.name.endsWith(".csv")) {
      setFileError("Please select a CSV file");
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setFileError(`Error parsing CSV: ${results.errors[0].message}`);
          return;
        }

        if (results.data.length === 0) {
          setFileError("CSV file is empty");
          return;
        }

        const headers = results.meta.fields || [];
        if (headers.length === 0) {
          setFileError("CSV file has no headers");
          return;
        }

        // Build column info with samples
        const csvColumns: CsvColumn[] = headers.map((header) => ({
          header,
          sample: (results.data as Record<string, string>[])
            .slice(0, 3)
            .map((row) => row[header] || "")
            .filter((v) => v !== ""),
        }));

        setColumns(csvColumns);
        setAllRows(results.data as Record<string, string>[]);

        // Auto-map columns based on header names
        const autoMappings: CsvMapping[] = csvColumns.map((col) => {
          const headerLower = col.header.toLowerCase().replace(/[_\s-]/g, "");

          // Try to find a matching field
          let targetField: string | null = null;

          if (headerLower.includes("firstname") || headerLower === "first") {
            targetField = "first_name";
          } else if (headerLower.includes("lastname") || headerLower === "last") {
            targetField = "last_name";
          } else if (headerLower.includes("email") || headerLower === "mail") {
            targetField = "email";
          } else if (headerLower.includes("phone") || headerLower.includes("mobile") || headerLower.includes("cell")) {
            targetField = "phone";
          } else if (headerLower === "status") {
            targetField = "status";
          }

          return {
            csvColumn: col.header,
            targetField,
          };
        });

        setMappings(autoMappings);
        setCurrentStep("mapping");
      },
      error: (error) => {
        setFileError(`Error reading file: ${error.message}`);
      },
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const updateMapping = (csvColumn: string, targetField: string | null) => {
    setMappings((prev) =>
      prev.map((m) =>
        m.csvColumn === csvColumn ? { ...m, targetField } : m
      )
    );
  };

  const getMappedFieldsCount = () => {
    return mappings.filter((m) => m.targetField !== null).length;
  };

  const getPreviewRows = () => {
    return allRows.slice(0, 5);
  };

  const getMappedValue = (row: Record<string, string>, field: string): string => {
    const mapping = mappings.find((m) => m.targetField === field);
    if (!mapping) return "";
    return row[mapping.csvColumn] || "";
  };

  const validateRow = (
    row: Record<string, string>,
    rowIndex: number
  ): { valid: boolean; errors: CsvImportError[] } => {
    const errors: CsvImportError[] = [];

    const firstName = getMappedValue(row, "first_name");
    const lastName = getMappedValue(row, "last_name");
    const email = getMappedValue(row, "email");
    const phone = getMappedValue(row, "phone");

    // Must have at least one identifier
    if (!firstName && !lastName && !email && !phone) {
      errors.push({
        row: rowIndex + 1,
        field: "contact",
        value: "",
        message: "Contact must have at least a name, email, or phone",
      });
    }

    // Validate email format if provided
    if (email && !email.includes("@")) {
      errors.push({
        row: rowIndex + 1,
        field: "email",
        value: email,
        message: "Invalid email format",
      });
    }

    // Validate status if provided
    const status = getMappedValue(row, "status");
    if (status && !VALID_STATUSES.includes(status.toLowerCase())) {
      errors.push({
        row: rowIndex + 1,
        field: "status",
        value: status,
        message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
      });
    }

    return { valid: errors.length === 0, errors };
  };

  const runImport = async () => {
    setCurrentStep("importing");
    setImportProgress(0);

    const result: CsvImportResult = {
      total: allRows.length,
      imported: 0,
      skipped: 0,
      errors: [],
    };

    for (let i = 0; i < allRows.length; i++) {
      const row = allRows[i];
      const validation = validateRow(row, i);

      if (!validation.valid) {
        result.skipped++;
        result.errors.push(...validation.errors);
        setImportProgress(Math.round(((i + 1) / allRows.length) * 100));
        continue;
      }

      // Build contact input
      const contactInput: CreateContactInput = {};

      const firstName = getMappedValue(row, "first_name");
      const lastName = getMappedValue(row, "last_name");
      const email = getMappedValue(row, "email");
      const phone = getMappedValue(row, "phone");
      const status = getMappedValue(row, "status");

      if (firstName) contactInput.first_name = firstName;
      if (lastName) contactInput.last_name = lastName;
      if (email) contactInput.email = email;
      if (phone) contactInput.phone = phone;
      if (status && VALID_STATUSES.includes(status.toLowerCase())) {
        contactInput.status = status.toLowerCase() as Contact["status"];
      }

      // Add tags to the contact (static + conditional based on row data)
      const tagsForRow = getTagsForRow(row);
      if (tagsForRow.length > 0) {
        contactInput.tags = tagsForRow;
      }

      try {
        await createContact(contactInput);
        result.imported++;
      } catch (error) {
        result.skipped++;
        result.errors.push({
          row: i + 1,
          field: "import",
          value: "",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }

      setImportProgress(Math.round(((i + 1) / allRows.length) * 100));
    }

    setImportResult(result);
    setCurrentStep("complete");
  };

  const resetImport = () => {
    setCurrentStep("upload");
    setFileError(null);
    setColumns([]);
    setAllRows([]);
    setMappings([]);
    setImportProgress(0);
    setImportResult(null);
    setSelectedTagIds([]);
    setTagSearchQuery("");
    setConditionalRules([]);
    setConditionalSectionOpen(false);
  };

  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Setup Required</CardTitle>
            <CardDescription>
              Configure Supabase to import contacts.
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
        <div className="flex items-center gap-4 mb-8">
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
            <h1 className="text-xl font-bold text-gray-900">Import Contacts</h1>
            <p className="text-sm text-gray-500">
              Upload a CSV file to import contacts in bulk
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-2">
            {[
              { key: "upload", label: "Upload" },
              { key: "mapping", label: "Map Fields" },
              { key: "preview", label: "Preview" },
              { key: "complete", label: "Complete" },
            ].map((step, index) => {
              const stepKeys: ImportStep[] = ["upload", "mapping", "preview", "complete"];
              const currentIndex = stepKeys.indexOf(
                currentStep === "importing" ? "complete" : currentStep
              );
              const stepIndex = stepKeys.indexOf(step.key as ImportStep);
              const isComplete = stepIndex < currentIndex;
              const isCurrent = step.key === currentStep || (currentStep === "importing" && step.key === "complete");

              return (
                <div key={step.key} className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                      isComplete
                        ? "bg-green-500 text-white"
                        : isCurrent
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {isComplete ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span
                    className={`ml-2 text-sm ${
                      isCurrent ? "font-medium text-gray-900" : "text-gray-500"
                    }`}
                  >
                    {step.label}
                  </span>
                  {index < 3 && (
                    <div
                      className={`w-12 h-0.5 mx-4 ${
                        isComplete ? "bg-green-500" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        {currentStep === "upload" && (
          <Card>
            <CardHeader>
              <CardTitle>Upload CSV File</CardTitle>
              <CardDescription>
                Select a CSV file containing your contacts. The file should have headers in the first row.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                  fileError
                    ? "border-red-300 bg-red-50"
                    : "border-gray-300 hover:border-blue-400 hover:bg-blue-50"
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileInputChange}
                />
                <div className="flex flex-col items-center">
                  {fileError ? (
                    <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
                  ) : (
                    <Upload className="w-12 h-12 text-gray-400 mb-4" />
                  )}
                  <p className="text-lg font-medium text-gray-900 mb-1">
                    {fileError
                      ? "Error uploading file"
                      : "Drop your CSV file here"}
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    {fileError || "or click to browse"}
                  </p>
                  <Button variant="outline" type="button">
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Select CSV File
                  </Button>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  CSV Format Tips
                </h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• First row should contain column headers</li>
                  <li>• Supported fields: First Name, Last Name, Email, Phone, Status</li>
                  <li>• Status values: new, contacted, responded, qualified, disqualified</li>
                  <li>• Each contact should have at least a name, email, or phone</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === "mapping" && (
          <Card>
            <CardHeader>
              <CardTitle>Map CSV Columns</CardTitle>
              <CardDescription>
                Match your CSV columns to contact fields. Columns without a mapping will be skipped.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {columns.map((column) => {
                  const mapping = mappings.find(
                    (m) => m.csvColumn === column.header
                  );
                  const currentTarget = mapping?.targetField || "";

                  return (
                    <div
                      key={column.header}
                      className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {column.header}
                        </p>
                        {column.sample.length > 0 && (
                          <p className="text-sm text-gray-500 truncate">
                            Sample: {column.sample.slice(0, 2).join(", ")}
                            {column.sample.length > 2 && "..."}
                          </p>
                        )}
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <div className="w-48">
                        <Select
                          value={currentTarget || "skip"}
                          onValueChange={(value) =>
                            updateMapping(
                              column.header,
                              value === "skip" ? null : value
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="skip">
                              <span className="text-gray-400">Skip column</span>
                            </SelectItem>
                            {STANDARD_CONTACT_FIELDS.map((field) => {
                              const isUsed = mappings.some(
                                (m) =>
                                  m.targetField === field.value &&
                                  m.csvColumn !== column.header
                              );
                              return (
                                <SelectItem
                                  key={field.value}
                                  value={field.value}
                                  disabled={isUsed}
                                >
                                  {field.label}
                                  {isUsed && " (already mapped)"}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Tag Selection Section */}
              <Collapsible
                open={tagSectionOpen}
                onOpenChange={setTagSectionOpen}
                className="mt-6 pt-6 border-t"
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center justify-between w-full p-0 h-auto hover:bg-transparent"
                  >
                    <div className="flex items-center gap-2">
                      <TagIcon className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-gray-900">
                        Tags to Apply
                      </span>
                      {selectedTagIds.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {selectedTagIds.length} selected
                        </Badge>
                      )}
                    </div>
                    {tagSectionOpen ? (
                      <ChevronUp className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4">
                  <p className="text-sm text-gray-500 mb-4">
                    Select tags to apply to all imported contacts. You can also create new tags.
                  </p>

                  {/* Selected Tags Display */}
                  {selectedTags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {selectedTags.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="secondary"
                          className="pl-2 pr-1 py-1 flex items-center gap-1"
                          style={{ backgroundColor: `${tag.color}20`, borderColor: tag.color }}
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span className="text-gray-700">{tag.name}</span>
                          <button
                            onClick={() => handleTagRemove(tag.id)}
                            className="ml-1 p-0.5 rounded-full hover:bg-gray-200 transition-colors"
                          >
                            <X className="w-3 h-3 text-gray-500" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Tag Search */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search tags..."
                      value={tagSearchQuery}
                      onChange={(e) => setTagSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  {/* Tag List */}
                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    {filteredTags.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        {tags.length === 0
                          ? "No tags yet. Create one to get started."
                          : "No tags match your search."}
                      </div>
                    ) : (
                      <div className="divide-y">
                        {filteredTags.map((tag) => {
                          const isSelected = selectedTagIds.includes(tag.id);
                          return (
                            <button
                              key={tag.id}
                              onClick={() => handleTagSelect(tag.id)}
                              className={`w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 transition-colors ${
                                isSelected ? "bg-blue-50" : ""
                              }`}
                            >
                              <div
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                  isSelected
                                    ? "bg-blue-500 border-blue-500"
                                    : "border-gray-300"
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: tag.color }}
                              />
                              <span className="text-gray-700">{tag.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Create New Tag Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setShowCreateTagDialog(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Tag
                  </Button>
                </CollapsibleContent>
              </Collapsible>

              {/* Conditional Tagging Section */}
              <Collapsible
                open={conditionalSectionOpen}
                onOpenChange={setConditionalSectionOpen}
                className="mt-4 pt-4 border-t"
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center justify-between w-full p-0 h-auto hover:bg-transparent"
                  >
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-gray-900">
                        Conditional Tagging
                      </span>
                      {conditionalRules.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {conditionalRules.length} rule{conditionalRules.length !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                    {conditionalSectionOpen ? (
                      <ChevronUp className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4">
                  <p className="text-sm text-gray-500 mb-4">
                    Apply tags conditionally based on column values. Rules are evaluated for each row during import.
                  </p>

                  {/* Conditional Rules List */}
                  {conditionalRules.length > 0 && (
                    <div className="space-y-3 mb-4">
                      {conditionalRules.map((rule) => {
                        const operatorInfo = OPERATORS.find((op) => op.value === rule.operator);
                        const ruleTag = tags.find((t) => t.id === rule.tagId);
                        return (
                          <div
                            key={rule.id}
                            className="p-3 bg-gray-50 rounded-lg border"
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm text-gray-500">If</span>

                              {/* Column Selector */}
                              <Select
                                value={rule.column}
                                onValueChange={(value) =>
                                  updateConditionalRule(rule.id, { column: value })
                                }
                              >
                                <SelectTrigger className="w-[140px] h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {columns.map((col) => (
                                    <SelectItem key={col.header} value={col.header}>
                                      {col.header}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              {/* Operator Selector */}
                              <Select
                                value={rule.operator}
                                onValueChange={(value) =>
                                  updateConditionalRule(rule.id, {
                                    operator: value as RuleOperator,
                                  })
                                }
                              >
                                <SelectTrigger className="w-[150px] h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {OPERATORS.map((op) => (
                                    <SelectItem key={op.value} value={op.value}>
                                      {op.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              {/* Value Input (if needed) */}
                              {operatorInfo?.needsValue && (
                                <Input
                                  value={rule.value}
                                  onChange={(e) =>
                                    updateConditionalRule(rule.id, { value: e.target.value })
                                  }
                                  placeholder="Value..."
                                  className="w-[120px] h-8 text-sm"
                                />
                              )}

                              <span className="text-sm text-gray-500">then apply</span>

                              {/* Tag Selector */}
                              <Select
                                value={rule.tagId}
                                onValueChange={(value) =>
                                  updateConditionalRule(rule.id, { tagId: value })
                                }
                              >
                                <SelectTrigger className="w-[140px] h-8 text-sm">
                                  <SelectValue>
                                    {ruleTag ? (
                                      <div className="flex items-center gap-2">
                                        <span
                                          className="w-2 h-2 rounded-full"
                                          style={{ backgroundColor: ruleTag.color }}
                                        />
                                        {ruleTag.name}
                                      </div>
                                    ) : (
                                      "Select tag..."
                                    )}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {tags.map((tag) => (
                                    <SelectItem key={tag.id} value={tag.id}>
                                      <div className="flex items-center gap-2">
                                        <span
                                          className="w-2 h-2 rounded-full"
                                          style={{ backgroundColor: tag.color }}
                                        />
                                        {tag.name}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              {/* Delete Button */}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                                onClick={() => removeConditionalRule(rule.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add Rule Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addConditionalRule}
                    disabled={columns.length === 0 || tags.length === 0}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Rule
                  </Button>

                  {tags.length === 0 && (
                    <p className="text-xs text-amber-600 mt-2">
                      Create at least one tag to use conditional tagging.
                    </p>
                  )}
                </CollapsibleContent>
              </Collapsible>

              <div className="flex items-center justify-between mt-6 pt-6 border-t">
                <div className="text-sm text-gray-500">
                  {getMappedFieldsCount()} of {columns.length} columns mapped
                  {selectedTagIds.length > 0 && (
                    <span className="ml-2">
                      • {selectedTagIds.length} tag{selectedTagIds.length !== 1 ? "s" : ""} selected
                    </span>
                  )}
                  {conditionalRules.length > 0 && (
                    <span className="ml-2">
                      • {conditionalRules.length} conditional rule{conditionalRules.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={resetImport}>
                    Start Over
                  </Button>
                  <Button
                    onClick={() => setCurrentStep("preview")}
                    disabled={getMappedFieldsCount() === 0}
                  >
                    Continue to Preview
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === "preview" && (
          <Card>
            <CardHeader>
              <CardTitle>Preview Import</CardTitle>
              <CardDescription>
                Review the data before importing. Showing first 5 of {allRows.length} contacts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      {STANDARD_CONTACT_FIELDS.filter((f) =>
                        mappings.some((m) => m.targetField === f.value)
                      ).map((field) => (
                        <TableHead key={field.value}>{field.label}</TableHead>
                      ))}
                      {(selectedTagIds.length > 0 || conditionalRules.length > 0) && (
                        <TableHead>Tags</TableHead>
                      )}
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getPreviewRows().map((row, index) => {
                      const validation = validateRow(row, index);
                      const rowConditionalTags = getConditionalTagsForRow(row);
                      const allRowTags = getTagsForRow(row);
                      return (
                        <TableRow
                          key={index}
                          className={!validation.valid ? "bg-red-50" : ""}
                        >
                          <TableCell className="font-medium">
                            {index + 1}
                          </TableCell>
                          {STANDARD_CONTACT_FIELDS.filter((f) =>
                            mappings.some((m) => m.targetField === f.value)
                          ).map((field) => (
                            <TableCell key={field.value}>
                              {getMappedValue(row, field.value) || (
                                <span className="text-gray-400">—</span>
                              )}
                            </TableCell>
                          ))}
                          {(selectedTagIds.length > 0 || conditionalRules.length > 0) && (
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {allRowTags.length === 0 ? (
                                  <span className="text-gray-400 text-xs">—</span>
                                ) : (
                                  allRowTags.map((tagId) => {
                                    const tag = tags.find((t) => t.id === tagId);
                                    const isConditional = rowConditionalTags.includes(tagId);
                                    if (!tag) return null;
                                    return (
                                      <Badge
                                        key={tagId}
                                        variant="secondary"
                                        className="text-xs py-0 px-1.5 flex items-center gap-1"
                                        style={{
                                          backgroundColor: `${tag.color}20`,
                                          borderColor: tag.color,
                                        }}
                                        title={isConditional ? "Applied by rule" : "Static tag"}
                                      >
                                        <span
                                          className="w-1.5 h-1.5 rounded-full"
                                          style={{ backgroundColor: tag.color }}
                                        />
                                        {tag.name}
                                        {isConditional && (
                                          <Filter className="w-2.5 h-2.5 ml-0.5 text-gray-400" />
                                        )}
                                      </Badge>
                                    );
                                  })
                                )}
                              </div>
                            </TableCell>
                          )}
                          <TableCell>
                            {validation.valid ? (
                              <Badge
                                variant="outline"
                                className="text-green-600 border-green-300"
                              >
                                <Check className="w-3 h-3 mr-1" />
                                Valid
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <X className="w-3 h-3 mr-1" />
                                Invalid
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Validation Summary */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Import Summary
                </h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {allRows.length}
                    </p>
                    <p className="text-sm text-gray-500">Total Rows</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {allRows.filter((row, i) => validateRow(row, i).valid).length}
                    </p>
                    <p className="text-sm text-gray-500">Valid</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">
                      {allRows.filter((row, i) => !validateRow(row, i).valid).length}
                    </p>
                    <p className="text-sm text-gray-500">Will Skip</p>
                  </div>
                </div>

                {/* Tags to Apply */}
                {selectedTags.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2 mb-2">
                      <TagIcon className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-900">
                        Static Tags ({selectedTags.length})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedTags.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="secondary"
                          className="flex items-center gap-1"
                          style={{ backgroundColor: `${tag.color}20`, borderColor: tag.color }}
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      These tags will be applied to all {allRows.filter((row, i) => validateRow(row, i).valid).length} valid contacts
                    </p>
                  </div>
                )}

                {/* Conditional Rules */}
                {conditionalRules.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2 mb-2">
                      <Filter className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-900">
                        Conditional Rules ({conditionalRules.length})
                      </span>
                    </div>
                    <div className="space-y-2">
                      {conditionalRules.map((rule) => {
                        const operatorInfo = OPERATORS.find((op) => op.value === rule.operator);
                        const ruleTag = tags.find((t) => t.id === rule.tagId);
                        const matchingRows = allRows.filter(
                          (row, i) => validateRow(row, i).valid && evaluateRule(rule, row)
                        ).length;
                        return (
                          <div
                            key={rule.id}
                            className="text-sm text-gray-600 bg-white p-2 rounded border"
                          >
                            <span className="text-gray-500">If</span>{" "}
                            <span className="font-medium">{rule.column}</span>{" "}
                            <span className="text-gray-500">{operatorInfo?.label.toLowerCase()}</span>
                            {operatorInfo?.needsValue && (
                              <>
                                {" "}
                                <span className="font-medium">&quot;{rule.value}&quot;</span>
                              </>
                            )}
                            {" → "}
                            {ruleTag && (
                              <Badge
                                variant="secondary"
                                className="text-xs py-0 px-1.5 inline-flex items-center gap-1"
                                style={{
                                  backgroundColor: `${ruleTag.color}20`,
                                  borderColor: ruleTag.color,
                                }}
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ backgroundColor: ruleTag.color }}
                                />
                                {ruleTag.name}
                              </Badge>
                            )}
                            <span className="text-gray-400 ml-2">
                              ({matchingRows} match{matchingRows !== 1 ? "es" : ""})
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-6 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep("mapping")}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Mapping
                </Button>
                <Button onClick={runImport}>
                  Import {allRows.filter((row, i) => validateRow(row, i).valid).length} Contacts
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === "importing" && (
          <Card>
            <CardHeader>
              <CardTitle>Importing Contacts</CardTitle>
              <CardDescription>
                Please wait while we import your contacts...
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center py-12">
                <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Importing contacts...
                </p>
                <div className="w-full max-w-md">
                  <div className="flex justify-between text-sm text-gray-500 mb-2">
                    <span>Progress</span>
                    <span>{importProgress}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${importProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === "complete" && importResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
                Import Complete
              </CardTitle>
              <CardDescription>
                Your contacts have been imported successfully.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Results Summary */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-700">
                    {importResult.imported}
                  </p>
                  <p className="text-sm text-green-600">Imported</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg text-center">
                  <SkipForward className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-yellow-700">
                    {importResult.skipped}
                  </p>
                  <p className="text-sm text-yellow-600">Skipped</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <FileSpreadsheet className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-700">
                    {importResult.total}
                  </p>
                  <p className="text-sm text-gray-600">Total</p>
                </div>
              </div>

              {/* Tags Applied */}
              {selectedTags.length > 0 && importResult.imported > 0 && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TagIcon className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">
                      Tags Applied
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedTags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="secondary"
                        className="flex items-center gap-1"
                        style={{ backgroundColor: `${tag.color}20`, borderColor: tag.color }}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-blue-700 mt-2">
                    Applied to {importResult.imported} imported contact{importResult.imported !== 1 ? "s" : ""}
                  </p>
                </div>
              )}

              {/* Errors */}
              {importResult.errors.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500" />
                    Errors ({importResult.errors.length})
                  </h4>
                  <div className="max-h-48 overflow-y-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Row</TableHead>
                          <TableHead>Field</TableHead>
                          <TableHead>Error</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importResult.errors.slice(0, 20).map((error, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {error.row}
                            </TableCell>
                            <TableCell>{error.field}</TableCell>
                            <TableCell className="text-red-600">
                              {error.message}
                            </TableCell>
                          </TableRow>
                        ))}
                        {importResult.errors.length > 20 && (
                          <TableRow>
                            <TableCell
                              colSpan={3}
                              className="text-center text-gray-500"
                            >
                              ... and {importResult.errors.length - 20} more errors
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-6 border-t">
                <Button variant="outline" onClick={resetImport}>
                  Import More Contacts
                </Button>
                <Button onClick={() => router.push("/contacts")}>
                  View All Contacts
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create New Tag Dialog */}
      <Dialog open={showCreateTagDialog} onOpenChange={setShowCreateTagDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Tag</DialogTitle>
            <DialogDescription>
              Create a new tag to apply to imported contacts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tagName">Tag Name</Label>
              <Input
                id="tagName"
                placeholder="Enter tag name..."
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
              <Label>Tag Color</Label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_TAG_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewTagColor(color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      newTagColor === color
                        ? "border-gray-900 scale-110"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
            {/* Tag Preview */}
            {newTagName.trim() && (
              <div className="pt-2">
                <Label className="text-xs text-gray-500">Preview</Label>
                <div className="mt-1">
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1 w-fit"
                    style={{ backgroundColor: `${newTagColor}20`, borderColor: newTagColor }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: newTagColor }}
                    />
                    {newTagName.trim()}
                  </Badge>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateTagDialog(false);
                setNewTagName("");
                setNewTagColor(DEFAULT_TAG_COLORS[8]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateTag}
              disabled={!newTagName.trim() || isCreatingTag}
            >
              {isCreatingTag ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Tag
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
