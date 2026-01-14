import { create } from "zustand";
import type {
  Template,
  TemplateChannel,
  TemplateFilters,
  CreateTemplateInput,
  UpdateTemplateInput,
} from "@/types/template";
import {
  getTemplates as fetchTemplatesFromDb,
  getTemplate as fetchTemplateFromDb,
  createTemplate as createTemplateInDb,
  updateTemplate as updateTemplateInDb,
  deleteTemplate as deleteTemplateFromDb,
} from "@/lib/supabase";

interface TemplateState {
  // Data
  templates: Template[];
  selectedTemplate: Template | null;

  // Filters
  filters: TemplateFilters;

  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  isDeleting: boolean;

  // Error state
  error: string | null;

  // Actions
  fetchTemplates: () => Promise<void>;
  fetchTemplate: (id: string) => Promise<Template | null>;
  createTemplate: (input: CreateTemplateInput) => Promise<Template | null>;
  updateTemplate: (input: UpdateTemplateInput) => Promise<Template | null>;
  deleteTemplate: (id: string) => Promise<boolean>;

  // Filter actions
  setFilters: (filters: Partial<TemplateFilters>) => void;
  clearFilters: () => void;

  // Selection
  setSelectedTemplate: (template: Template | null) => void;

  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;
}

const initialFilters: TemplateFilters = {
  search: undefined,
  channel: undefined,
};

export const useTemplateStore = create<TemplateState>((set, get) => ({
  // Initial data
  templates: [],
  selectedTemplate: null,

  // Initial filters
  filters: initialFilters,

  // Initial loading states
  isLoading: false,
  isSaving: false,
  isDeleting: false,

  // Initial error state
  error: null,

  // =============================================================================
  // Fetch Actions
  // =============================================================================

  fetchTemplates: async () => {
    set({ isLoading: true, error: null });

    try {
      const { filters } = get();
      const templates = await fetchTemplatesFromDb(filters);
      set({ templates, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch templates";
      set({ error: message, isLoading: false });
    }
  },

  fetchTemplate: async (id: string) => {
    set({ isLoading: true, error: null });

    try {
      const template = await fetchTemplateFromDb(id);
      set({ selectedTemplate: template, isLoading: false });
      return template;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch template";
      set({ error: message, isLoading: false });
      return null;
    }
  },

  // =============================================================================
  // CRUD Actions
  // =============================================================================

  createTemplate: async (input: CreateTemplateInput) => {
    set({ isSaving: true, error: null });

    try {
      const template = await createTemplateInDb(input);

      // Add to local state
      set((state) => ({
        templates: [template, ...state.templates],
        isSaving: false,
      }));

      return template;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create template";
      set({ error: message, isSaving: false });
      return null;
    }
  },

  updateTemplate: async (input: UpdateTemplateInput) => {
    set({ isSaving: true, error: null });

    try {
      const template = await updateTemplateInDb(input);

      // Update in local state
      set((state) => ({
        templates: state.templates.map((t) =>
          t.id === template.id ? template : t
        ),
        selectedTemplate:
          state.selectedTemplate?.id === template.id
            ? template
            : state.selectedTemplate,
        isSaving: false,
      }));

      return template;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update template";
      set({ error: message, isSaving: false });
      return null;
    }
  },

  deleteTemplate: async (id: string) => {
    set({ isDeleting: true, error: null });

    try {
      await deleteTemplateFromDb(id);

      // Remove from local state
      set((state) => ({
        templates: state.templates.filter((t) => t.id !== id),
        selectedTemplate:
          state.selectedTemplate?.id === id ? null : state.selectedTemplate,
        isDeleting: false,
      }));

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete template";
      set({ error: message, isDeleting: false });
      return false;
    }
  },

  // =============================================================================
  // Filter Actions
  // =============================================================================

  setFilters: (newFilters: Partial<TemplateFilters>) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
  },

  clearFilters: () => {
    set({ filters: initialFilters });
  },

  // =============================================================================
  // Selection Actions
  // =============================================================================

  setSelectedTemplate: (template: Template | null) => {
    set({ selectedTemplate: template });
  },

  // =============================================================================
  // Error Handling
  // =============================================================================

  setError: (error: string | null) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },
}));

// =============================================================================
// Selectors
// =============================================================================

export const selectTemplatesByChannel = (
  templates: Template[],
  channel: TemplateChannel
): Template[] => {
  return templates.filter((t) => t.channel === channel);
};

export const selectSmsTemplates = (templates: Template[]): Template[] => {
  return selectTemplatesByChannel(templates, "sms");
};

export const selectEmailTemplates = (templates: Template[]): Template[] => {
  return selectTemplatesByChannel(templates, "email");
};
