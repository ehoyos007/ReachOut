"use client";

import { useEffect, useState } from "react";
import {
  Save,
  Loader2,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Send,
  Phone,
  Mail,
  AlertCircle,
  Plus,
  Pencil,
  Trash2,
  Star,
  Users,
  BadgeCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useSettingsStore } from "@/lib/store/settingsStore";
import { useSenderStore } from "@/lib/store/senderStore";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { SettingKey, TestResult } from "@/types/settings";
import {
  SETTINGS_CONFIG,
  getProviderSettings,
  validateSettingValue,
} from "@/types/settings";
import type {
  SenderEmail,
  SenderPhone,
  CreateSenderEmailInput,
  CreateSenderPhoneInput,
} from "@/types/sender";

export default function SettingsPage() {
  const [supabaseReady, setSupabaseReady] = useState(true);
  const [activeTab, setActiveTab] = useState<"twilio" | "sendgrid" | "senders">("twilio");

  // Form state for each setting
  const [formValues, setFormValues] = useState<Record<SettingKey, string>>(
    {} as Record<SettingKey, string>
  );
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Sender identity dialog state
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
  const [editingEmail, setEditingEmail] = useState<SenderEmail | null>(null);
  const [editingPhone, setEditingPhone] = useState<SenderPhone | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: "email" | "phone"; id: string } | null>(null);

  // Email form state
  const [emailForm, setEmailForm] = useState<CreateSenderEmailInput>({
    email: "",
    name: "",
    is_default: false,
  });

  // Phone form state
  const [phoneForm, setPhoneForm] = useState<CreateSenderPhoneInput>({
    phone: "",
    label: "",
    is_default: false,
  });

  // Settings store
  const {
    settingsMap,
    isTwilioConfigured,
    isSendGridConfigured,
    isLoading,
    isSaving,
    isTesting,
    twilioTestResult,
    sendgridTestResult,
    error,
    fetchSettings,
    updateMultipleSettings,
    testTwilioConnection,
    testSendGridConnection,
    clearTestResults,
  } = useSettingsStore();

  // Sender store
  const {
    emails: senderEmails,
    phones: senderPhones,
    isLoading: sendersLoading,
    isSaving: sendersSaving,
    isDeleting: sendersDeleting,
    error: sendersError,
    fetchSenders,
    addEmail,
    addPhone,
    updateEmail,
    updatePhone,
    removeEmail,
    removePhone,
  } = useSenderStore();

  // Check Supabase configuration
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setSupabaseReady(false);
      return;
    }
    fetchSettings();
    fetchSenders();
  }, [fetchSettings, fetchSenders]);

  // Sync form values with store
  useEffect(() => {
    if (Object.keys(settingsMap).length > 0) {
      setFormValues(settingsMap);
    }
  }, [settingsMap]);

  // Track changes
  useEffect(() => {
    const changed = Object.keys(formValues).some(
      (key) => formValues[key as SettingKey] !== settingsMap[key as SettingKey]
    );
    setHasChanges(changed);
  }, [formValues, settingsMap]);

  const handleInputChange = (key: SettingKey, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));

    // Clear validation error when user types
    if (validationErrors[key]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  const toggleShowSecret = (key: string) => {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const validateForm = (provider: "twilio" | "sendgrid"): boolean => {
    const providerSettings = getProviderSettings(provider);
    const errors: Record<string, string> = {};

    for (const config of providerSettings) {
      const result = validateSettingValue(config.key, formValues[config.key] || "");
      if (!result.valid && result.message) {
        errors[config.key] = result.message;
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (provider: "twilio" | "sendgrid") => {
    if (!validateForm(provider)) return;

    const providerSettings = getProviderSettings(provider);
    const updates = providerSettings
      .filter((config) => formValues[config.key] !== settingsMap[config.key])
      .map((config) => ({
        key: config.key,
        value: formValues[config.key] || "",
      }));

    if (updates.length === 0) return;

    const success = await updateMultipleSettings(updates);
    if (success) {
      clearTestResults();
    }
  };

  const handleTest = async (provider: "twilio" | "sendgrid") => {
    // First save any changes
    if (hasChanges) {
      await handleSave(provider);
    }

    if (provider === "twilio") {
      await testTwilioConnection();
    } else {
      await testSendGridConnection();
    }
  };

  // =============================================================================
  // Sender Identity Handlers
  // =============================================================================

  const openEmailDialog = (email?: SenderEmail) => {
    if (email) {
      setEditingEmail(email);
      setEmailForm({
        email: email.email,
        name: email.name,
        is_default: email.is_default,
      });
    } else {
      setEditingEmail(null);
      setEmailForm({ email: "", name: "", is_default: false });
    }
    setEmailDialogOpen(true);
  };

  const openPhoneDialog = (phone?: SenderPhone) => {
    if (phone) {
      setEditingPhone(phone);
      setPhoneForm({
        phone: phone.phone,
        label: phone.label,
        is_default: phone.is_default,
      });
    } else {
      setEditingPhone(null);
      setPhoneForm({ phone: "", label: "", is_default: false });
    }
    setPhoneDialogOpen(true);
  };

  const handleSaveEmail = async () => {
    if (!emailForm.email.trim()) return;

    if (editingEmail) {
      await updateEmail({
        id: editingEmail.id,
        email: emailForm.email,
        name: emailForm.name,
        is_default: emailForm.is_default,
      });
    } else {
      await addEmail(emailForm);
    }

    setEmailDialogOpen(false);
    setEditingEmail(null);
  };

  const handleSavePhone = async () => {
    if (!phoneForm.phone.trim()) return;

    if (editingPhone) {
      await updatePhone({
        id: editingPhone.id,
        phone: phoneForm.phone,
        label: phoneForm.label,
        is_default: phoneForm.is_default,
      });
    } else {
      await addPhone(phoneForm);
    }

    setPhoneDialogOpen(false);
    setEditingPhone(null);
  };

  const confirmDelete = (type: "email" | "phone", id: string) => {
    setItemToDelete({ type, id });
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    if (itemToDelete.type === "email") {
      await removeEmail(itemToDelete.id);
    } else {
      await removePhone(itemToDelete.id);
    }

    setDeleteConfirmOpen(false);
    setItemToDelete(null);
  };

  const renderTestResult = (result: TestResult | null) => {
    if (!result) return null;

    return (
      <Alert variant={result.success ? "default" : "destructive"} className="mt-4">
        {result.success ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <XCircle className="h-4 w-4" />
        )}
        <AlertTitle>{result.success ? "Success" : "Error"}</AlertTitle>
        <AlertDescription>
          {result.message}
          {result.details && (
            <p className="mt-1 text-sm opacity-75">{result.details}</p>
          )}
        </AlertDescription>
      </Alert>
    );
  };

  const renderSettingInput = (config: (typeof SETTINGS_CONFIG)[number]) => {
    const value = formValues[config.key] || "";
    const isSecret = config.isSecret;
    const showSecret = showSecrets[config.key];
    const error = validationErrors[config.key];

    return (
      <div key={config.key} className="space-y-2">
        <Label htmlFor={config.key} className="flex items-center gap-2">
          {config.label}
          {config.required && <span className="text-red-500">*</span>}
        </Label>
        <div className="relative">
          <Input
            id={config.key}
            type={isSecret && !showSecret ? "password" : "text"}
            value={value}
            onChange={(e) => handleInputChange(config.key, e.target.value)}
            placeholder={config.placeholder}
            className={error ? "border-red-500" : ""}
          />
          {isSecret && value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => toggleShowSecret(config.key)}
            >
              {showSecret ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{config.description}</p>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    );
  };

  if (!supabaseReady) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Configuration Required</AlertTitle>
          <AlertDescription>
            Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and
            NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const twilioSettings = getProviderSettings("twilio");
  const sendgridSettings = getProviderSettings("sendgrid");

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500">
            Configure your messaging providers
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "twilio" | "sendgrid" | "senders")}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="twilio" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Twilio (SMS)
              {isTwilioConfigured && (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="sendgrid" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              SendGrid (Email)
              {isSendGridConfigured && (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="senders" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Sender Identities
              {(senderEmails.length > 0 || senderPhones.length > 0) && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {senderEmails.length + senderPhones.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Twilio Tab */}
          <TabsContent value="twilio">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Twilio Configuration
                </CardTitle>
                <CardDescription>
                  Configure your Twilio account for SMS messaging. You can find these
                  credentials in your{" "}
                  <a
                    href="https://console.twilio.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    Twilio Console
                  </a>
                  .
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {twilioSettings.map(renderSettingInput)}

                <div className="flex items-center gap-3 pt-4 border-t">
                  <Button
                    onClick={() => handleSave("twilio")}
                    disabled={isSaving || !hasChanges}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleTest("twilio")}
                    disabled={isTesting || !isTwilioConfigured}
                  >
                    {isTesting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Test Connection
                  </Button>
                </div>

                {renderTestResult(twilioTestResult)}

                {!isTwilioConfigured && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Not Configured</AlertTitle>
                    <AlertDescription>
                      Please fill in all required fields to enable SMS messaging.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SendGrid Tab */}
          <TabsContent value="sendgrid">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  SendGrid Configuration
                </CardTitle>
                <CardDescription>
                  Configure your SendGrid account for email messaging. You can find
                  your API key in your{" "}
                  <a
                    href="https://app.sendgrid.com/settings/api_keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    SendGrid Settings
                  </a>
                  .
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {sendgridSettings.map(renderSettingInput)}

                <div className="flex items-center gap-3 pt-4 border-t">
                  <Button
                    onClick={() => handleSave("sendgrid")}
                    disabled={isSaving || !hasChanges}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleTest("sendgrid")}
                    disabled={isTesting || !isSendGridConfigured}
                  >
                    {isTesting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Test Connection
                  </Button>
                </div>

                {renderTestResult(sendgridTestResult)}

                {!isSendGridConfigured && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Not Configured</AlertTitle>
                    <AlertDescription>
                      Please fill in all required fields to enable email messaging.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sender Identities Tab */}
          <TabsContent value="senders">
            <div className="space-y-6">
              {/* Sender Error Alert */}
              {sendersError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{sendersError}</AlertDescription>
                </Alert>
              )}

              {/* Email Senders Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        Email Senders
                      </CardTitle>
                      <CardDescription>
                        Email addresses that will appear as the sender for outbound emails.
                      </CardDescription>
                    </div>
                    <Button onClick={() => openEmailDialog()} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Email
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {sendersLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : senderEmails.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No email senders configured</p>
                      <p className="text-sm">Add an email address to send emails from.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {senderEmails.map((sender) => (
                        <div
                          key={sender.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10">
                              <Mail className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{sender.name || sender.email}</span>
                                {sender.is_default && (
                                  <Badge variant="secondary" className="gap-1">
                                    <Star className="h-3 w-3" />
                                    Default
                                  </Badge>
                                )}
                                {sender.verified && (
                                  <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
                                    <BadgeCheck className="h-3 w-3" />
                                    Verified
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{sender.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEmailDialog(sender)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => confirmDelete("email", sender.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Phone Senders Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Phone className="h-5 w-5" />
                        Phone Numbers
                      </CardTitle>
                      <CardDescription>
                        Phone numbers that will appear as the sender for outbound SMS messages.
                      </CardDescription>
                    </div>
                    <Button onClick={() => openPhoneDialog()} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Phone
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {sendersLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : senderPhones.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Phone className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No phone numbers configured</p>
                      <p className="text-sm">Add a phone number to send SMS messages from.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {senderPhones.map((sender) => (
                        <div
                          key={sender.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-green-500/10">
                              <Phone className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{sender.label || sender.phone}</span>
                                {sender.is_default && (
                                  <Badge variant="secondary" className="gap-1">
                                    <Star className="h-3 w-3" />
                                    Default
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{sender.phone}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openPhoneDialog(sender)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => confirmDelete("phone", sender.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Info Alert */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>About Sender Identities</AlertTitle>
                <AlertDescription>
                  Sender identities determine the &quot;from&quot; address when sending messages.
                  The default sender will be used when composing new messages unless you select
                  a different one.
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Email Sender Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingEmail ? "Edit Email Sender" : "Add Email Sender"}
            </DialogTitle>
            <DialogDescription>
              {editingEmail
                ? "Update the email sender details."
                : "Add a new email address to send emails from."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sender-email">Email Address *</Label>
              <Input
                id="sender-email"
                type="email"
                placeholder="hello@example.com"
                value={emailForm.email}
                onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sender-name">Display Name</Label>
              <Input
                id="sender-name"
                placeholder="Company Name"
                value={emailForm.name}
                onChange={(e) => setEmailForm({ ...emailForm, name: e.target.value })}
              />
              <p className="text-sm text-muted-foreground">
                The name that will appear in the &quot;From&quot; field (e.g., &quot;Company Name&quot; &lt;hello@example.com&gt;)
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="email-default"
                checked={emailForm.is_default}
                onCheckedChange={(checked) =>
                  setEmailForm({ ...emailForm, is_default: checked === true })
                }
              />
              <Label htmlFor="email-default" className="text-sm font-normal">
                Set as default email sender
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEmail} disabled={sendersSaving || !emailForm.email.trim()}>
              {sendersSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingEmail ? "Save Changes" : "Add Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Phone Sender Dialog */}
      <Dialog open={phoneDialogOpen} onOpenChange={setPhoneDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPhone ? "Edit Phone Number" : "Add Phone Number"}
            </DialogTitle>
            <DialogDescription>
              {editingPhone
                ? "Update the phone number details."
                : "Add a new phone number to send SMS messages from."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sender-phone">Phone Number *</Label>
              <Input
                id="sender-phone"
                type="tel"
                placeholder="+1 555 123 4567"
                value={phoneForm.phone}
                onChange={(e) => setPhoneForm({ ...phoneForm, phone: e.target.value })}
              />
              <p className="text-sm text-muted-foreground">
                Use the format provided by Twilio (e.g., +15551234567)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone-label">Label</Label>
              <Input
                id="phone-label"
                placeholder="Main Line, Support, etc."
                value={phoneForm.label}
                onChange={(e) => setPhoneForm({ ...phoneForm, label: e.target.value })}
              />
              <p className="text-sm text-muted-foreground">
                A friendly name to identify this phone number
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="phone-default"
                checked={phoneForm.is_default}
                onCheckedChange={(checked) =>
                  setPhoneForm({ ...phoneForm, is_default: checked === true })
                }
              />
              <Label htmlFor="phone-default" className="text-sm font-normal">
                Set as default phone number
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPhoneDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePhone} disabled={sendersSaving || !phoneForm.phone.trim()}>
              {sendersSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingPhone ? "Save Changes" : "Add Phone"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Sender Identity</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this {itemToDelete?.type === "email" ? "email sender" : "phone number"}?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={sendersDeleting}>
              {sendersDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Webhook Info Card */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Webhook URLs</CardTitle>
          <CardDescription>
            Configure these URLs in your provider dashboards to receive inbound
            messages and delivery status updates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Twilio SMS Webhook</Label>
            <code className="block p-3 bg-muted rounded-md text-sm">
              {typeof window !== "undefined"
                ? `${window.location.origin}/api/webhooks/twilio/inbound`
                : "/api/webhooks/twilio/inbound"}
            </code>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Twilio Status Callback</Label>
            <code className="block p-3 bg-muted rounded-md text-sm">
              {typeof window !== "undefined"
                ? `${window.location.origin}/api/webhooks/twilio/status`
                : "/api/webhooks/twilio/status"}
            </code>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">SendGrid Inbound Parse</Label>
            <code className="block p-3 bg-muted rounded-md text-sm">
              {typeof window !== "undefined"
                ? `${window.location.origin}/api/webhooks/sendgrid/inbound`
                : "/api/webhooks/sendgrid/inbound"}
            </code>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">SendGrid Event Webhook</Label>
            <code className="block p-3 bg-muted rounded-md text-sm">
              {typeof window !== "undefined"
                ? `${window.location.origin}/api/webhooks/sendgrid/events`
                : "/api/webhooks/sendgrid/events"}
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
