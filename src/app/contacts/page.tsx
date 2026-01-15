"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Loader2,
  Users,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  Edit,
  Ban,
  Upload,
  Settings2,
  Tag,
  MoreHorizontal,
  Trash2,
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
import { toast } from "sonner";
import { useContactStore } from "@/lib/store/contactStore";
import { isSupabaseConfigured, updateContact } from "@/lib/supabase";
import {
  ContactFilterBuilder,
  SavedViewsSidebar,
  BulkActionToolbar,
  BulkTagModal,
  BulkSmsModal,
  BulkEmailModal,
} from "@/components/contacts";
import { useContactFilters, filterContacts } from "@/hooks/useContactFilters";
import { useSavedViews } from "@/hooks/useSavedViews";
import type {
  ContactWithRelations,
  CreateContactInput,
  Contact,
  SavedView,
} from "@/types/contact";
import {
  getContactDisplayName,
  getContactInitials,
  formatPhoneNumber,
  STATUS_DISPLAY_NAMES,
  createEmptyAdvancedFilters,
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Create dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateContactInput>({});
  const [isCreating, setIsCreating] = useState(false);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<ContactWithRelations | null>(null);

  // Bulk action modals
  const [isBulkTagOpen, setIsBulkTagOpen] = useState(false);
  const [isBulkSmsOpen, setIsBulkSmsOpen] = useState(false);
  const [isBulkEmailOpen, setIsBulkEmailOpen] = useState(false);

  // Store
  const {
    contacts,
    totalContacts,
    currentPage,
    pageSize,
    totalPages,
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
    selectContact,
    deselectContact,
    selectAllContacts,
    deselectAllContacts,
    toggleContactSelection,
    setError,
    createTag,
  } = useContactStore();

  // Advanced filter state
  const filterState = useContactFilters();
  const { filters, loadFilters, hasFilters, filterCount } = filterState;

  // Saved views state
  const savedViewsState = useSavedViews();
  const { selectView, saveCurrentFilters, activeView, activeViewId } = savedViewsState;

  // Initialize
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setSupabaseReady(false);
      return;
    }

    fetchContacts();
    fetchTags();
  }, []);

  // Apply advanced filters to contacts
  const filteredContacts = useMemo(() => {
    // First filter by search
    let result = contacts;

    if (searchInput.trim()) {
      const search = searchInput.toLowerCase();
      result = result.filter(
        (c) =>
          c.first_name?.toLowerCase().includes(search) ||
          c.last_name?.toLowerCase().includes(search) ||
          c.email?.toLowerCase().includes(search) ||
          c.phone?.includes(search)
      );
    }

    // Then apply advanced filters
    if (hasFilters) {
      result = filterContacts(result, filters);
    }

    return result;
  }, [contacts, searchInput, filters, hasFilters]);

  // Selected contacts (for bulk actions)
  const selectedContacts = useMemo(() => {
    return filteredContacts.filter((c) => selectedContactIds.has(c.id));
  }, [filteredContacts, selectedContactIds]);

  // Handle view selection
  const handleSelectView = useCallback((view: SavedView | null) => {
    selectView(view?.id || null);
    if (view) {
      loadFilters(view.filters);
    } else {
      loadFilters(createEmptyAdvancedFilters());
    }
    setSearchInput("");
    deselectAllContacts();
  }, [selectView, loadFilters, deselectAllContacts]);

  // Handle save view
  const handleSaveView = useCallback(async (name: string, icon: string, color: string) => {
    const view = await saveCurrentFilters(name, filters, icon, color);
    if (view) {
      toast.success(`View "${name}" saved`);
    }
  }, [saveCurrentFilters, filters]);

  // Handle search
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      // Search is applied in real-time via filteredContacts
    }
  };

  // Handle create contact
  const handleCreate = async () => {
    if (!createForm.first_name && !createForm.email && !createForm.phone) {
      setError("Please provide at least a name, email, or phone number");
      return;
    }

    setIsCreating(true);
    const result = await createContact(createForm);
    setIsCreating(false);

    if (result) {
      toast.success("Contact created");
      setIsCreateOpen(false);
      setCreateForm({});
    }
  };

  // Handle delete single contact
  const handleDelete = async () => {
    if (!deleteTarget) return;

    const success = await deleteContact(deleteTarget.id);
    if (success) {
      toast.success("Contact deleted");
      setDeleteTarget(null);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    await deleteSelectedContacts();
    toast.success(`${selectedContactIds.size} contacts deleted`);
  };

  // Handle bulk tag
  const handleBulkTag = async (tagIds: string[]) => {
    // Add tags to each selected contact
    for (const contact of selectedContacts) {
      const existingTagIds = contact.tags.map((t) => t.id);
      const newTagIds = [...new Set([...existingTagIds, ...tagIds])];

      await updateContact({
        id: contact.id,
        tags: newTagIds,
      });
    }

    // Refresh contacts
    await fetchContacts();
    toast.success(`Tags added to ${selectedContacts.length} contacts`);
  };

  // Handle bulk SMS
  const handleBulkSms = async (message: string, contactIds: string[]): Promise<{ sent: number; failed: number }> => {
    // For now, this is a placeholder - actual SMS sending would go through the API
    try {
      const response = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "sms",
          message,
          contactIds,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send messages");
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Bulk SMS error:", error);
      return { sent: 0, failed: contactIds.length };
    }
  };

  // Handle bulk email
  const handleBulkEmail = async (
    subject: string,
    body: string,
    contactIds: string[]
  ): Promise<{ sent: number; failed: number }> => {
    try {
      const response = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "email",
          subject,
          body,
          contactIds,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send emails");
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Bulk email error:", error);
      return { sent: 0, failed: contactIds.length };
    }
  };

  // Handle create tag (for bulk tag modal)
  const handleCreateTag = async (name: string, color: string) => {
    return await createTag({ name, color });
  };

  // Selection helpers
  const allSelected =
    filteredContacts.length > 0 && selectedContactIds.size === filteredContacts.length;
  const someSelected =
    selectedContactIds.size > 0 && selectedContactIds.size < filteredContacts.length;

  // Date formatter
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
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Saved Views Sidebar */}
      <SavedViewsSidebar
        savedViewsState={savedViewsState}
        onSelectView={handleSelectView}
        totalContacts={totalContacts}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {activeView ? activeView.name : "Contacts"}
            </h1>
            <p className="text-gray-500">
              {activeView
                ? `${filteredContacts.length} contacts match this view`
                : "Manage your contacts and organize them with tags"}
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

        {/* Search and Filters Row */}
        <div className="flex items-start gap-4 mb-6">
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

          {/* Advanced Filters */}
          <ContactFilterBuilder
            filterState={filterState}
            tags={tags}
            onSaveView={handleSaveView}
            showSaveButton={!activeViewId}
          />
        </div>

        {/* Bulk Actions Toolbar */}
        <BulkActionToolbar
          selectedCount={selectedContactIds.size}
          totalFilteredCount={filteredContacts.length}
          isAllSelected={allSelected}
          onClearSelection={deselectAllContacts}
          onSelectAll={() => {
            filteredContacts.forEach((c) => selectContact(c.id));
          }}
          onSelectAllFiltered={() => {
            filteredContacts.forEach((c) => selectContact(c.id));
          }}
          onBulkTag={() => setIsBulkTagOpen(true)}
          onBulkSms={() => setIsBulkSmsOpen(true)}
          onBulkEmail={() => setIsBulkEmailOpen(true)}
          onBulkDelete={handleBulkDelete}
          isDeleting={isDeleting}
          showSelectAllFiltered={filteredContacts.length > contacts.length}
        />

        {/* Contacts Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  No contacts found
                </h3>
                <p className="text-gray-500 text-center max-w-sm mb-4">
                  {searchInput || hasFilters
                    ? "Try adjusting your search or filters to find contacts."
                    : "Add your first contact to get started."}
                </p>
                {!searchInput && !hasFilters && (
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
                            filteredContacts.forEach((c) => selectContact(c.id));
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
                  {filteredContacts.map((contact) => (
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

        {/* Bulk Tag Modal */}
        <BulkTagModal
          isOpen={isBulkTagOpen}
          onClose={() => setIsBulkTagOpen(false)}
          selectedContacts={selectedContacts}
          tags={tags}
          onApplyTags={handleBulkTag}
          onCreateTag={handleCreateTag}
        />

        {/* Bulk SMS Modal */}
        <BulkSmsModal
          isOpen={isBulkSmsOpen}
          onClose={() => setIsBulkSmsOpen(false)}
          selectedContacts={selectedContacts}
          onSendSms={handleBulkSms}
        />

        {/* Bulk Email Modal */}
        <BulkEmailModal
          isOpen={isBulkEmailOpen}
          onClose={() => setIsBulkEmailOpen(false)}
          selectedContacts={selectedContacts}
          onSendEmail={handleBulkEmail}
        />
      </div>
    </div>
  );
}
