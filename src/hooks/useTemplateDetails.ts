"use client";

import { useState, useCallback, useEffect } from "react";
import type {
  SendGridTemplateDetails,
  SendGridTemplateVersion,
  TemplateVariable,
} from "@/types/sendgrid";
import { extractTemplateVariables } from "@/utils/templateParser";

interface UseTemplateDetailsState {
  template: SendGridTemplateDetails | null;
  activeVersion: SendGridTemplateVersion | null;
  variables: TemplateVariable[];
  isLoading: boolean;
  error: string | null;
}

export function useTemplateDetails(templateId: string | null) {
  const [state, setState] = useState<UseTemplateDetailsState>({
    template: null,
    activeVersion: null,
    variables: [],
    isLoading: false,
    error: null,
  });

  // Fetch template details from API
  const fetchDetails = useCallback(async (id: string) => {
    if (!id) {
      setState({
        template: null,
        activeVersion: null,
        variables: [],
        isLoading: false,
        error: null,
      });
      return null;
    }

    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch(`/api/sendgrid/templates/${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch template details");
      }

      const template: SendGridTemplateDetails = data.template;
      const activeVersion: SendGridTemplateVersion | null = data.activeVersion || null;

      // Extract variables from the active version
      let variables: TemplateVariable[] = [];
      if (activeVersion?.html_content) {
        const parseResult = extractTemplateVariables(
          activeVersion.html_content,
          activeVersion.subject || ""
        );
        variables = parseResult.variables;
      }

      setState({
        template,
        activeVersion,
        variables,
        isLoading: false,
        error: null,
      });

      return { template, activeVersion, variables };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error("Failed to fetch template details:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return null;
    }
  }, []);

  // Fetch when templateId changes
  useEffect(() => {
    if (templateId) {
      fetchDetails(templateId);
    } else {
      setState({
        template: null,
        activeVersion: null,
        variables: [],
        isLoading: false,
        error: null,
      });
    }
  }, [templateId, fetchDetails]);

  // Clear state
  const clear = useCallback(() => {
    setState({
      template: null,
      activeVersion: null,
      variables: [],
      isLoading: false,
      error: null,
    });
  }, []);

  return {
    template: state.template,
    activeVersion: state.activeVersion,
    variables: state.variables,
    isLoading: state.isLoading,
    error: state.error,
    fetchDetails,
    clear,
  };
}

export type UseTemplateDetailsReturn = ReturnType<typeof useTemplateDetails>;
