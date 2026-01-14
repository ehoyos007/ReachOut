"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users,
  Search,
  Loader2,
  Check,
  AlertCircle,
  UserPlus,
  Play,
} from "lucide-react";
import { useEnrollmentStore } from "@/lib/store/enrollmentStore";
import { getContactDisplayName } from "@/types/contact";
import type { ContactWithRelations } from "@/types/contact";

interface EnrollContactsDialogProps {
  workflowId: string;
  workflowName: string;
  isEnabled: boolean;
  trigger?: React.ReactNode;
}

export function EnrollContactsDialog({
  workflowId,
  workflowName,
  isEnabled,
  trigger,
}: EnrollContactsDialogProps) {
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<ContactWithRelations[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [enrollResult, setEnrollResult] = useState<{
    total: number;
    enrolled: number;
    skipped: number;
  } | null>(null);

  const { enrollContacts, isEnrolling, counts, fetchEnrollmentCounts } =
    useEnrollmentStore();

  // Load contacts when dialog opens
  useEffect(() => {
    if (open) {
      loadContacts();
      fetchEnrollmentCounts(workflowId);
      setEnrollResult(null);
      setSelectedIds(new Set());
    }
  }, [open, workflowId]);

  const loadContacts = async () => {
    setIsLoadingContacts(true);
    try {
      const { getContacts } = await import("@/lib/supabase");
      const result = await getContacts(
        { do_not_contact: false },
        { page: 1, pageSize: 1000, sortBy: "created_at", sortOrder: "desc" }
      );
      setContacts(result.contacts);
    } catch (error) {
      console.error("Failed to load contacts:", error);
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const filteredContacts = contacts.filter((contact) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      contact.first_name?.toLowerCase().includes(search) ||
      contact.last_name?.toLowerCase().includes(search) ||
      contact.email?.toLowerCase().includes(search) ||
      contact.phone?.toLowerCase().includes(search)
    );
  });

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    const allIds = new Set(filteredContacts.map((c) => c.id));
    setSelectedIds(allIds);
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleEnroll = async () => {
    if (selectedIds.size === 0) return;

    try {
      const result = await enrollContacts(
        workflowId,
        Array.from(selectedIds),
        true
      );
      setEnrollResult(result);
      await fetchEnrollmentCounts(workflowId);
    } catch (error) {
      console.error("Enrollment failed:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" disabled={!isEnabled}>
            <UserPlus className="w-4 h-4 mr-2" />
            Enroll
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Enroll Contacts in Workflow
          </DialogTitle>
          <DialogDescription>
            Select contacts to enroll in &ldquo;{workflowName}&rdquo;. They will start
            receiving messages according to the workflow.
          </DialogDescription>
        </DialogHeader>

        {/* Enrollment Stats */}
        <div className="flex gap-4 py-2">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-gray-600">Active:</span>
            <span className="font-medium">{counts.active}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-gray-600">Completed:</span>
            <span className="font-medium">{counts.completed}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full bg-gray-500" />
            <span className="text-gray-600">Stopped:</span>
            <span className="font-medium">{counts.stopped}</span>
          </div>
        </div>

        {/* Result Message */}
        {enrollResult && (
          <div
            className={`flex items-center gap-2 p-3 rounded-md ${
              enrollResult.enrolled > 0
                ? "bg-green-50 text-green-700"
                : "bg-yellow-50 text-yellow-700"
            }`}
          >
            {enrollResult.enrolled > 0 ? (
              <Check className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span>
              Enrolled {enrollResult.enrolled} contacts
              {enrollResult.skipped > 0 && `, ${enrollResult.skipped} already enrolled`}
            </span>
          </div>
        )}

        {/* Search and Select All */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={selectedIds.size === filteredContacts.length ? deselectAll : selectAll}
          >
            {selectedIds.size === filteredContacts.length ? "Deselect All" : "Select All"}
          </Button>
        </div>

        {/* Contact List */}
        <ScrollArea className="h-[300px] border rounded-md">
          {isLoadingContacts ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Users className="w-8 h-8 mb-2" />
              <p>No contacts found</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  className={`flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer ${
                    selectedIds.has(contact.id) ? "bg-blue-50" : ""
                  }`}
                  onClick={() => toggleSelect(contact.id)}
                >
                  <Checkbox
                    checked={selectedIds.has(contact.id)}
                    onCheckedChange={() => toggleSelect(contact.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {getContactDisplayName(contact)}
                    </div>
                    <div className="text-sm text-gray-500 truncate">
                      {contact.email || contact.phone || "No contact info"}
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {contact.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <span className="text-sm text-gray-500">
              {selectedIds.size} contact{selectedIds.size !== 1 && "s"} selected
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleEnroll}
                disabled={selectedIds.size === 0 || isEnrolling}
              >
                {isEnrolling ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Enroll {selectedIds.size} Contact{selectedIds.size !== 1 && "s"}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
