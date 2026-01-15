"use client";

import { useState, useCallback, useEffect } from "react";
import type { SendGridTemplate } from "@/types/sendgrid";
import { TEMPLATE_CACHE_TTL_MS } from "@/types/sendgrid";

interface UseSendGridTemplatesState {
  templates: SendGridTemplate[];
  isLoading: boolean;
  error: string | null;
  lastSyncedAt: string | null;
}

export function useSendGridTemplates() {
  const [state, setState] = useState<UseSendGridTemplatesState>({
    templates: [],
    isLoading: true,
    error: null,
    lastSyncedAt: null,
  });

  // Fetch templates from API
  const fetchTemplates = useCallback(async (forceRefresh = false) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      // Check cache validity (unless force refresh)
      if (!forceRefresh && state.lastSyncedAt) {
        const lastSync = new Date(state.lastSyncedAt).getTime();
        const now = Date.now();
        if (now - lastSync < TEMPLATE_CACHE_TTL_MS && state.templates.length > 0) {
          setState((prev) => ({ ...prev, isLoading: false }));
          return state.templates;
        }
      }

      const response = await fetch("/api/sendgrid/templates");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch templates");
      }

      setState({
        templates: data.templates || [],
        isLoading: false,
        error: null,
        lastSyncedAt: new Date().toISOString(),
      });

      return data.templates;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error("Failed to fetch SendGrid templates:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return [];
    }
  }, [state.lastSyncedAt, state.templates]);

  // Initial fetch
  useEffect(() => {
    fetchTemplates();
  // Only run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh templates (force)
  const refresh = useCallback(() => {
    return fetchTemplates(true);
  }, [fetchTemplates]);

  // Check if cache is stale
  const isCacheStale = useCallback(() => {
    if (!state.lastSyncedAt) return true;
    const lastSync = new Date(state.lastSyncedAt).getTime();
    return Date.now() - lastSync >= TEMPLATE_CACHE_TTL_MS;
  }, [state.lastSyncedAt]);

  return {
    templates: state.templates,
    isLoading: state.isLoading,
    error: state.error,
    lastSyncedAt: state.lastSyncedAt,
    fetchTemplates,
    refresh,
    isCacheStale,
  };
}

export type UseSendGridTemplatesReturn = ReturnType<typeof useSendGridTemplates>;
