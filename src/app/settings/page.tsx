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
import { useSettingsStore } from "@/lib/store/settingsStore";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { SettingKey, TestResult } from "@/types/settings";
import {
  SETTINGS_CONFIG,
  getProviderSettings,
  validateSettingValue,
  maskSecretValue,
} from "@/types/settings";

export default function SettingsPage() {
  const [supabaseReady, setSupabaseReady] = useState(true);
  const [activeTab, setActiveTab] = useState<"twilio" | "sendgrid">("twilio");

  // Form state for each setting
  const [formValues, setFormValues] = useState<Record<SettingKey, string>>(
    {} as Record<SettingKey, string>
  );
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Store
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
    clearError,
  } = useSettingsStore();

  // Check Supabase configuration
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setSupabaseReady(false);
      return;
    }
    fetchSettings();
  }, [fetchSettings]);

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
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "twilio" | "sendgrid")}>
          <TabsList className="grid w-full grid-cols-2">
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
        </Tabs>
      )}

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
