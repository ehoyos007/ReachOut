"use client";

import { useState, useCallback, useRef } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { STANDARD_CONTACT_FIELDS, STATUS_DISPLAY_NAMES } from "@/types/contact";

type ImportStep = "upload" | "mapping" | "preview" | "importing" | "complete";

const VALID_STATUSES = Object.keys(STATUS_DISPLAY_NAMES);

export default function ImportContactsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step state
  const [currentStep, setCurrentStep] = useState<ImportStep>("upload");

  // File state
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // CSV data state
  const [columns, setColumns] = useState<CsvColumn[]>([]);
  const [allRows, setAllRows] = useState<Record<string, string>[]>([]);
  const [mappings, setMappings] = useState<CsvMapping[]>([]);

  // Import state
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<CsvImportResult | null>(null);

  // Store
  const { createContact } = useContactStore();

  const handleFileSelect = useCallback((file: File) => {
    setFileError(null);

    if (!file.name.endsWith(".csv")) {
      setFileError("Please select a CSV file");
      return;
    }

    setFileName(file.name);

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
    setIsImporting(true);
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
    setIsImporting(false);
    setCurrentStep("complete");
  };

  const resetImport = () => {
    setCurrentStep("upload");
    setFileName(null);
    setFileError(null);
    setColumns([]);
    setAllRows([]);
    setMappings([]);
    setImportProgress(0);
    setImportResult(null);
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

              <div className="flex items-center justify-between mt-6 pt-6 border-t">
                <div className="text-sm text-gray-500">
                  {getMappedFieldsCount()} of {columns.length} columns mapped
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
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getPreviewRows().map((row, index) => {
                      const validation = validateRow(row, index);
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
    </div>
  );
}
