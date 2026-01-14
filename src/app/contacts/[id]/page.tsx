"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Phone,
  User,
  Save,
  Trash2,
  Loader2,
  Ban,
  MessageSquare,
  Tag,
  Plus,
  X,
  Calendar,
  Hash,
  Type,
  List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { MessageThread } from "@/components/contacts/MessageThread";
import { ContactEnrollments } from "@/components/contacts/ContactEnrollments";
import { useContactStore } from "@/lib/store/contactStore";
import { useSettingsStore } from "@/lib/store/settingsStore";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { Contact, UpdateContactInput, CustomField, Tag as TagType } from "@/types/contact";
import {
  getContactDisplayName,
  getContactInitials,
  formatPhoneNumber,
  STATUS_DISPLAY_NAMES,
  FIELD_TYPE_DISPLAY_NAMES,
} from "@/types/contact";

const STATUS_COLORS: Record<Contact["status"], string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-yellow-100 text-yellow-700",
  responded: "bg-green-100 text-green-700",
  qualified: "bg-purple-100 text-purple-700",
  disqualified: "bg-gray-100 text-gray-700",
};

const FIELD_TYPE_ICONS: Record<string, React.ReactNode> = {
  text: <Type className="w-4 h-4" />,
  number: <Hash className="w-4 h-4" />,
  date: <Calendar className="w-4 h-4" />,
  select: <List className="w-4 h-4" />,
};

export default function ContactDetailPage() {
  const router = useRouter();
  const params = useParams();
  const contactId = params.id as string;

  const [supabaseReady, setSupabaseReady] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<UpdateContactInput>>({});
  const [editCustomFields, setEditCustomFields] = useState<Record<string, string>>({});
  const [editTags, setEditTags] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);

  const {
    currentContact,
    customFields,
    tags,
    isLoadingContact,
    isSaving,
    isDeleting,
    error,
    fetchContact,
    fetchCustomFields,
    fetchTags,
    updateContact,
    deleteContact,
    setError,
  } = useContactStore();

  const {
    isTwilioConfigured,
    isSendGridConfigured,
    fetchSettings,
  } = useSettingsStore();

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setSupabaseReady(false);
      return;
    }

    fetchContact(contactId);
    fetchCustomFields();
    fetchTags();
    fetchSettings();
  }, [contactId, fetchContact, fetchCustomFields, fetchTags, fetchSettings]);

  // Initialize edit form when contact loads or editing starts
  useEffect(() => {
    if (currentContact && isEditing) {
      setEditForm({
        first_name: currentContact.first_name,
        last_name: currentContact.last_name,
        email: currentContact.email,
        phone: currentContact.phone,
        status: currentContact.status,
        do_not_contact: currentContact.do_not_contact,
      });

      // Initialize custom field values
      const fieldValues: Record<string, string> = {};
      for (const fv of currentContact.custom_fields) {
        fieldValues[fv.field_id] = fv.value || "";
      }
      setEditCustomFields(fieldValues);

      // Initialize tags
      setEditTags(currentContact.tags.map((t) => t.id));
    }
  }, [currentContact, isEditing]);

  const handleSave = async () => {
    if (!currentContact) return;

    const result = await updateContact({
      id: currentContact.id,
      ...editForm,
      tags: editTags,
      custom_fields: editCustomFields,
    });

    if (result) {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditForm({});
    setEditCustomFields({});
    setEditTags([]);
  };

  const handleDelete = async () => {
    if (!currentContact) return;

    const success = await deleteContact(currentContact.id);
    if (success) {
      router.push("/contacts");
    }
  };

  const toggleTag = (tagId: string) => {
    if (editTags.includes(tagId)) {
      setEditTags(editTags.filter((t) => t !== tagId));
    } else {
      setEditTags([...editTags, tagId]);
    }
  };

  const getCustomFieldValue = (fieldId: string): string => {
    if (isEditing) {
      return editCustomFields[fieldId] || "";
    }
    const fv = currentContact?.custom_fields.find((f) => f.field_id === fieldId);
    return fv?.value || "";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (!supabaseReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Setup Required</CardTitle>
            <CardDescription>
              Configure Supabase to view contact details.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoadingContact) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!currentContact) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Contact Not Found</CardTitle>
            <CardDescription>
              The contact you&apos;re looking for doesn&apos;t exist or has been deleted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/contacts")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Contacts
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayTags = isEditing
    ? tags.filter((t) => editTags.includes(t.id))
    : currentContact.tags;

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
              Back
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-lg font-medium text-gray-600">
                {getContactInitials(currentContact)}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {getContactDisplayName(currentContact)}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    className={`${STATUS_COLORS[currentContact.status]} border-0`}
                  >
                    {STATUS_DISPLAY_NAMES[currentContact.status]}
                  </Badge>
                  {currentContact.do_not_contact && (
                    <Badge variant="destructive" className="text-xs">
                      <Ban className="w-3 h-3 mr-1" />
                      Do Not Contact
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  Edit Contact
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </>
            )}
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name</Label>
                    {isEditing ? (
                      <Input
                        id="first_name"
                        value={editForm.first_name || ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, first_name: e.target.value })
                        }
                        placeholder="John"
                      />
                    ) : (
                      <p className="text-sm text-gray-900">
                        {currentContact.first_name || "—"}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name</Label>
                    {isEditing ? (
                      <Input
                        id="last_name"
                        value={editForm.last_name || ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, last_name: e.target.value })
                        }
                        placeholder="Doe"
                      />
                    ) : (
                      <p className="text-sm text-gray-900">
                        {currentContact.last_name || "—"}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">
                    <Mail className="w-4 h-4 inline mr-1" />
                    Email
                  </Label>
                  {isEditing ? (
                    <Input
                      id="email"
                      type="email"
                      value={editForm.email || ""}
                      onChange={(e) =>
                        setEditForm({ ...editForm, email: e.target.value })
                      }
                      placeholder="john@example.com"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">
                      {currentContact.email || "—"}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">
                    <Phone className="w-4 h-4 inline mr-1" />
                    Phone
                  </Label>
                  {isEditing ? (
                    <Input
                      id="phone"
                      type="tel"
                      value={editForm.phone || ""}
                      onChange={(e) =>
                        setEditForm({ ...editForm, phone: e.target.value })
                      }
                      placeholder="+1 (555) 123-4567"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">
                      {currentContact.phone
                        ? formatPhoneNumber(currentContact.phone)
                        : "—"}
                    </p>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  {isEditing ? (
                    <Select
                      value={editForm.status || currentContact.status}
                      onValueChange={(value) =>
                        setEditForm({
                          ...editForm,
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
                  ) : (
                    <Badge
                      className={`${STATUS_COLORS[currentContact.status]} border-0`}
                    >
                      {STATUS_DISPLAY_NAMES[currentContact.status]}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="do_not_contact">Do Not Contact</Label>
                    <p className="text-sm text-gray-500">
                      Prevent all automated messages to this contact
                    </p>
                  </div>
                  {isEditing ? (
                    <Switch
                      id="do_not_contact"
                      checked={editForm.do_not_contact ?? currentContact.do_not_contact}
                      onCheckedChange={(checked) =>
                        setEditForm({ ...editForm, do_not_contact: checked })
                      }
                    />
                  ) : (
                    <Badge
                      variant={currentContact.do_not_contact ? "destructive" : "secondary"}
                    >
                      {currentContact.do_not_contact ? "Yes" : "No"}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Custom Fields */}
            {customFields.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <List className="w-5 h-5" />
                    Custom Fields
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {customFields.map((field) => (
                    <div key={field.id} className="space-y-2">
                      <Label className="flex items-center gap-2">
                        {FIELD_TYPE_ICONS[field.field_type]}
                        {field.name}
                        {field.is_required && (
                          <span className="text-red-500">*</span>
                        )}
                      </Label>
                      {isEditing ? (
                        field.field_type === "select" && field.options ? (
                          <Select
                            value={editCustomFields[field.id] || ""}
                            onValueChange={(value) =>
                              setEditCustomFields({
                                ...editCustomFields,
                                [field.id]: value,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={`Select ${field.name}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {field.options.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            type={field.field_type === "number" ? "number" : field.field_type === "date" ? "date" : "text"}
                            value={editCustomFields[field.id] || ""}
                            onChange={(e) =>
                              setEditCustomFields({
                                ...editCustomFields,
                                [field.id]: e.target.value,
                              })
                            }
                            placeholder={`Enter ${field.name}`}
                          />
                        )
                      ) : (
                        <p className="text-sm text-gray-900">
                          {getCustomFieldValue(field.id) || "—"}
                        </p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Message History */}
            <MessageThread
              contactId={contactId}
              contactEmail={currentContact.email}
              contactPhone={currentContact.phone}
              contactName={getContactDisplayName(currentContact)}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Tag className="w-5 h-5" />
                    Tags
                  </span>
                  {isEditing && tags.length > 0 && (
                    <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 p-2">
                        {tags.map((tag) => (
                          <div
                            key={tag.id}
                            className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
                            onClick={() => toggleTag(tag.id)}
                          >
                            <div
                              className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                editTags.includes(tag.id)
                                  ? "border-blue-500 bg-blue-500"
                                  : "border-gray-300"
                              }`}
                            >
                              {editTags.includes(tag.id) && (
                                <svg
                                  className="w-3 h-3 text-white"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              )}
                            </div>
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
                </CardTitle>
              </CardHeader>
              <CardContent>
                {displayTags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {displayTags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="outline"
                        className="flex items-center gap-1"
                        style={{
                          borderColor: tag.color,
                          color: tag.color,
                        }}
                      >
                        {tag.name}
                        {isEditing && (
                          <button
                            onClick={() => toggleTag(tag.id)}
                            className="ml-1 hover:opacity-70"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    {isEditing
                      ? "Click + to add tags"
                      : "No tags assigned"}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500">Created</p>
                  <p className="text-sm text-gray-900">
                    {formatDate(currentContact.created_at)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Last Updated</p>
                  <p className="text-sm text-gray-900">
                    {formatDate(currentContact.updated_at)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Workflow Enrollments */}
            <ContactEnrollments contactId={contactId} />

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  disabled={!isSendGridConfigured || !currentContact.email}
                  onClick={() => {
                    // Scroll to message thread and it will handle compose
                    const messageSection = document.querySelector('[data-message-thread]');
                    messageSection?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send Email
                  {!isSendGridConfigured && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      Configure SendGrid
                    </Badge>
                  )}
                  {isSendGridConfigured && !currentContact.email && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      No Email
                    </Badge>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  disabled={!isTwilioConfigured || !currentContact.phone}
                  onClick={() => {
                    // Scroll to message thread and it will handle compose
                    const messageSection = document.querySelector('[data-message-thread]');
                    messageSection?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Send SMS
                  {!isTwilioConfigured && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      Configure Twilio
                    </Badge>
                  )}
                  {isTwilioConfigured && !currentContact.phone && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      No Phone
                    </Badge>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Contact</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              {`"${getContactDisplayName(currentContact)}"`}? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
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
