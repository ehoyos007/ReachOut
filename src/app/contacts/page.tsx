"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Filter,
  Trash2,
  MoreHorizontal,
  Loader2,
  Users,
  X,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  Edit,
  Ban,
  Upload,
  Settings2,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useContactStore } from "@/lib/store/contactStore";
import { isSupabaseConfigured } from "@/lib/supabase";
import type {
  ContactWithRelations,
  CreateContactInput,
  Contact,
} from "@/types/contact";
import {
  getContactDisplayName,
  getContactInitials,
  formatPhoneNumber,
  STATUS_DISPLAY_NAMES,
} from "@/types/contact";

const STATUS_COLORS: Record<Contact["status"], string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-yellow-100 text-yellow-700",
  responded: "bg-green-100 text-green-700",
  qualified: "bg-purple-100 text-purple-700",
  disqualified: "bg-gray-100 text-gray-700",
};

export default function ContactsPage() {
  const router = useRouter();
  const [supabaseReady, setSupabaseReady] = useState(true);
  const [searchInput, setSearchInput] = useState("");

  // Create dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateContactInput>({});
  const [isCreating, setIsCreating] = useState(false);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<ContactWithRelations | null>(
    null
  );

  // Store
  const {
    contacts,
    totalContacts,
    currentPage,
    pageSize,
    totalPages,
    filters,
    selectedContactIds,
    tags,
    isLoading,
    isDeleting,
    error,
    fetchContacts,
    fetchTags,
    createContact,
    deleteContact,
    deleteSelectedContacts,
    setPage,
    setFilters,
    clearFilters,
    selectContact,
    deselectContact,
    selectAllContacts,
    deselectAllContacts,
    toggleContactSelection,
    setError,
  } = useContactStore();

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setSupabaseReady(false);
      return;
    }

    fetchContacts();
    fetchTags();
  }, []);

  const handleSearch = () => {
    setFilters({ search: searchInput || undefined });
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleCreate = async () => {
    if (!createForm.first_name && !createForm.email && !createForm.phone) {
      setError("Please provide at least a name, email, or phone number");
      return;
    }

    setIsCreating(true);
    const result = await createContact(createForm);
    setIsCreating(false);

    if (result) {
      setIsCreateOpen(false);
      setCreateForm({});
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    const success = await deleteContact(deleteTarget.id);
    if (success) {
      setDeleteTarget(null);
    }
  };

  const handleBulkDelete = async () => {
    await deleteSelectedContacts();
  };

  const toggleStatusFilter = (status: Contact["status"]) => {
    const currentStatuses = filters.status || [];
    if (currentStatuses.includes(status)) {
      setFilters({
        status: currentStatuses.filter((s) => s !== status),
      });
    } else {
      setFilters({
        status: [...currentStatuses, status],
      });
    }
  };

  const toggleTagFilter = (tagId: string) => {
    const currentTags = filters.tags || [];
    if (currentTags.includes(tagId)) {
      setFilters({
        tags: currentTags.filter((t) => t !== tagId),
      });
    } else {
      setFilters({
        tags: [...currentTags, tagId],
      });
    }
  };

  const allSelected =
    contacts.length > 0 && selectedContactIds.size === contacts.length;
  const someSelected =
    selectedContactIds.size > 0 && selectedContactIds.size < contacts.length;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (!supabaseReady) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Setup Required</CardTitle>
            <CardDescription>
              Configure Supabase to start managing contacts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600 space-y-2">
              <p>
                1. Create a Supabase project at{" "}
                <a
                  href="https://supabase.com"
                  className="text-blue-600 underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  supabase.com
                </a>
              </p>
              <p>
                2. Run the migration SQL from{" "}
                <code className="bg-gray-100 px-1 rounded">
                  supabase/migrations/
                </code>
              </p>
              <p>
                3. Copy{" "}
                <code className="bg-gray-100 px-1 rounded">.env.example</code>{" "}
                to <code className="bg-gray-100 px-1 rounded">.env.local</code>
              </p>
              <p>4. Add your Supabase URL and anon key</p>
              <p>5. Restart the development server</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-500">
            Manage your contacts and organize them with tags
          </p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Settings2 className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push("/contacts/fields")}>
                <Settings2 className="w-4 h-4 mr-2" />
                Custom Fields
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/contacts/tags")}>
                <Tag className="w-4 h-4 mr-2" />
                Manage Tags
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={() => router.push("/contacts/import")}>
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Contact
          </Button>
        </div>
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

      {/* Filters Row */}
      <div className="flex items-center gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search contacts..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="pl-10"
          />
        </div>

        {/* Status Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Status
              {filters.status && filters.status.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {filters.status.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2">
            {(Object.keys(STATUS_DISPLAY_NAMES) as Contact["status"][]).map(
              (status) => (
                <div
                  key={status}
                  className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
                  onClick={() => toggleStatusFilter(status)}
                >
                  <Checkbox
                    checked={filters.status?.includes(status) || false}
                    onCheckedChange={() => toggleStatusFilter(status)}
                  />
                  <span className="text-sm">{STATUS_DISPLAY_NAMES[status]}</span>
                </div>
              )
            )}
          </PopoverContent>
        </Popover>

        {/* Tags Filter */}
        {tags.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Tags
                {filters.tags && filters.tags.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {filters.tags.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
                  onClick={() => toggleTagFilter(tag.id)}
                >
                  <Checkbox
                    checked={filters.tags?.includes(tag.id) || false}
                    onCheckedChange={() => toggleTagFilter(tag.id)}
                  />
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="text-sm">{tag.name}</span>
                </div>
              ))}
            </PopoverContent>
          </Popover>
        )}

        {/* Clear Filters */}
        {(filters.search ||
          (filters.status && filters.status.length > 0) ||
          (filters.tags && filters.tags.length > 0)) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clearFilters();
              setSearchInput("");
            }}
          >
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedContactIds.size > 0 && (
        <div className="flex items-center gap-4 mb-4 p-3 bg-blue-50 rounded-lg">
          <span className="text-sm text-blue-700">
            {selectedContactIds.size} contact
            {selectedContactIds.size !== 1 ? "s" : ""} selected
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={deselectAllContacts}
          >
            Clear Selection
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            disabled={isDeleting}
          >
            {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Selected
          </Button>
        </div>
      )}

      {/* Contacts Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                No contacts found
              </h3>
              <p className="text-gray-500 text-center max-w-sm mb-4">
                {filters.search || filters.status?.length || filters.tags?.length
                  ? "Try adjusting your filters to find contacts."
                  : "Add your first contact to get started."}
              </p>
              {!filters.search &&
                !filters.status?.length &&
                !filters.tags?.length && (
                  <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Contact
                  </Button>
                )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={() => {
                        if (allSelected) {
                          deselectAllContacts();
                        } else {
                          selectAllContacts();
                        }
                      }}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => (
                  <TableRow
                    key={contact.id}
                    className={`cursor-pointer hover:bg-gray-50 ${
                      selectedContactIds.has(contact.id) ? "bg-blue-50" : ""
                    }`}
                    onClick={(e) => {
                      // Don't navigate if clicking checkbox or dropdown
                      const target = e.target as HTMLElement;
                      if (target.closest('button') || target.closest('[role="checkbox"]')) {
                        return;
                      }
                      router.push(`/contacts/${contact.id}`);
                    }}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedContactIds.has(contact.id)}
                        onCheckedChange={() =>
                          toggleContactSelection(contact.id)
                        }
                        aria-label={`Select ${getContactDisplayName(contact)}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                          {getContactInitials(contact)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {getContactDisplayName(contact)}
                          </div>
                          {contact.do_not_contact && (
                            <div className="flex items-center text-xs text-red-600">
                              <Ban className="w-3 h-3 mr-1" />
                              Do not contact
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {contact.email ? (
                        <div className="flex items-center text-sm text-gray-600">
                          <Mail className="w-3 h-3 mr-1.5 text-gray-400" />
                          {contact.email}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {contact.phone ? (
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="w-3 h-3 mr-1.5 text-gray-400" />
                          {formatPhoneNumber(contact.phone)}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`${STATUS_COLORS[contact.status]} border-0`}
                      >
                        {STATUS_DISPLAY_NAMES[contact.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {contact.tags.length > 0 ? (
                          contact.tags.slice(0, 3).map((tag) => (
                            <Badge
                              key={tag.id}
                              variant="outline"
                              className="text-xs"
                              style={{
                                borderColor: tag.color,
                                color: tag.color,
                              }}
                            >
                              {tag.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                        {contact.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{contact.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDate(contact.created_at)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/contacts/${contact.id}`)
                            }
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => setDeleteTarget(contact)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="text-sm text-gray-500">
              Showing {(currentPage - 1) * pageSize + 1} to{" "}
              {Math.min(currentPage * pageSize, totalContacts)} of{" "}
              {totalContacts} contacts
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <div className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Create Contact Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
            <DialogDescription>
              Enter the contact&apos;s information below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  placeholder="John"
                  value={createForm.first_name || ""}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, first_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  placeholder="Doe"
                  value={createForm.last_name || ""}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, last_name: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={createForm.email || ""}
                onChange={(e) =>
                  setCreateForm({ ...createForm, email: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={createForm.phone || ""}
                onChange={(e) =>
                  setCreateForm({ ...createForm, phone: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={createForm.status || "new"}
                onValueChange={(value) =>
                  setCreateForm({
                    ...createForm,
                    status: value as Contact["status"],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.keys(STATUS_DISPLAY_NAMES) as Contact["status"][]
                  ).map((status) => (
                    <SelectItem key={status} value={status}>
                      {STATUS_DISPLAY_NAMES[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                setCreateForm({});
              }}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Contact</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              {deleteTarget && `"${getContactDisplayName(deleteTarget)}"`}? This
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
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
