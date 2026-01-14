import { create } from "zustand";
import type {
  Contact,
  ContactWithRelations,
  CustomField,
  Tag,
  ContactFilters,
  CreateContactInput,
  UpdateContactInput,
  CreateCustomFieldInput,
  UpdateCustomFieldInput,
  CreateTagInput,
  UpdateTagInput,
} from "@/types/contact";
import {
  getContacts,
  getContact,
  createContact,
  updateContact,
  deleteContact,
  deleteContacts,
  getCustomFields,
  createCustomField,
  updateCustomField,
  deleteCustomField,
  getTags,
  createTag,
  updateTag,
  deleteTag,
} from "@/lib/supabase";

interface ContactState {
  // Contact list state
  contacts: ContactWithRelations[];
  totalContacts: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;

  // Filters
  filters: ContactFilters;
  sortBy: keyof Contact;
  sortOrder: "asc" | "desc";

  // Selection state
  selectedContactIds: Set<string>;

  // Current contact (for detail view)
  currentContact: ContactWithRelations | null;

  // Custom fields and tags
  customFields: CustomField[];
  tags: Tag[];

  // Loading states
  isLoading: boolean;
  isLoadingContact: boolean;
  isSaving: boolean;
  isDeleting: boolean;

  // Error state
  error: string | null;

  // Actions - Contacts
  fetchContacts: () => Promise<void>;
  fetchContact: (id: string) => Promise<void>;
  createContact: (input: CreateContactInput) => Promise<ContactWithRelations | null>;
  updateContact: (input: UpdateContactInput) => Promise<ContactWithRelations | null>;
  deleteContact: (id: string) => Promise<boolean>;
  deleteSelectedContacts: () => Promise<boolean>;

  // Actions - Pagination & Filters
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setFilters: (filters: Partial<ContactFilters>) => void;
  clearFilters: () => void;
  setSorting: (sortBy: keyof Contact, sortOrder: "asc" | "desc") => void;

  // Actions - Selection
  selectContact: (id: string) => void;
  deselectContact: (id: string) => void;
  selectAllContacts: () => void;
  deselectAllContacts: () => void;
  toggleContactSelection: (id: string) => void;

  // Actions - Custom Fields
  fetchCustomFields: () => Promise<void>;
  createCustomField: (input: CreateCustomFieldInput) => Promise<CustomField | null>;
  updateCustomField: (input: UpdateCustomFieldInput) => Promise<CustomField | null>;
  deleteCustomField: (id: string) => Promise<boolean>;

  // Actions - Tags
  fetchTags: () => Promise<void>;
  createTag: (input: CreateTagInput) => Promise<Tag | null>;
  updateTag: (input: UpdateTagInput) => Promise<Tag | null>;
  deleteTag: (id: string) => Promise<boolean>;

  // Actions - Utility
  setError: (error: string | null) => void;
  resetState: () => void;
}

const initialState = {
  contacts: [],
  totalContacts: 0,
  currentPage: 1,
  pageSize: 25,
  totalPages: 0,
  filters: {},
  sortBy: "created_at" as keyof Contact,
  sortOrder: "desc" as const,
  selectedContactIds: new Set<string>(),
  currentContact: null,
  customFields: [],
  tags: [],
  isLoading: false,
  isLoadingContact: false,
  isSaving: false,
  isDeleting: false,
  error: null,
};

export const useContactStore = create<ContactState>((set, get) => ({
  ...initialState,

  // ==========================================================================
  // Contact Actions
  // ==========================================================================

  fetchContacts: async () => {
    const state = get();
    set({ isLoading: true, error: null });

    try {
      const response = await getContacts(state.filters, {
        page: state.currentPage,
        pageSize: state.pageSize,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
      });

      set({
        contacts: response.contacts,
        totalContacts: response.total,
        totalPages: response.totalPages,
        isLoading: false,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch contacts";
      set({ isLoading: false, error: message });
    }
  },

  fetchContact: async (id) => {
    set({ isLoadingContact: true, error: null });

    try {
      const contact = await getContact(id);
      set({
        currentContact: contact,
        isLoadingContact: false,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch contact";
      set({ isLoadingContact: false, error: message });
    }
  },

  createContact: async (input) => {
    set({ isSaving: true, error: null });

    try {
      const contact = await createContact(input);
      // Refresh the contacts list
      await get().fetchContacts();
      set({ isSaving: false });
      return contact;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create contact";
      set({ isSaving: false, error: message });
      return null;
    }
  },

  updateContact: async (input) => {
    set({ isSaving: true, error: null });

    try {
      const contact = await updateContact(input);
      // Update in the list if present
      set((state) => ({
        contacts: state.contacts.map((c) =>
          c.id === contact.id ? contact : c
        ),
        currentContact:
          state.currentContact?.id === contact.id
            ? contact
            : state.currentContact,
        isSaving: false,
      }));
      return contact;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update contact";
      set({ isSaving: false, error: message });
      return null;
    }
  },

  deleteContact: async (id) => {
    set({ isDeleting: true, error: null });

    try {
      await deleteContact(id);
      // Remove from list and selection
      set((state) => {
        const newSelectedIds = new Set(state.selectedContactIds);
        newSelectedIds.delete(id);
        return {
          contacts: state.contacts.filter((c) => c.id !== id),
          selectedContactIds: newSelectedIds,
          currentContact:
            state.currentContact?.id === id ? null : state.currentContact,
          totalContacts: state.totalContacts - 1,
          isDeleting: false,
        };
      });
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete contact";
      set({ isDeleting: false, error: message });
      return false;
    }
  },

  deleteSelectedContacts: async () => {
    const state = get();
    const ids = Array.from(state.selectedContactIds);

    if (ids.length === 0) return false;

    set({ isDeleting: true, error: null });

    try {
      await deleteContacts(ids);
      // Refresh the list
      await get().fetchContacts();
      set({
        selectedContactIds: new Set(),
        isDeleting: false,
      });
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete contacts";
      set({ isDeleting: false, error: message });
      return false;
    }
  },

  // ==========================================================================
  // Pagination & Filters
  // ==========================================================================

  setPage: (page) => {
    set({ currentPage: page });
    get().fetchContacts();
  },

  setPageSize: (size) => {
    set({ pageSize: size, currentPage: 1 });
    get().fetchContacts();
  },

  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
      currentPage: 1, // Reset to first page when filtering
    }));
    get().fetchContacts();
  },

  clearFilters: () => {
    set({ filters: {}, currentPage: 1 });
    get().fetchContacts();
  },

  setSorting: (sortBy, sortOrder) => {
    set({ sortBy, sortOrder });
    get().fetchContacts();
  },

  // ==========================================================================
  // Selection
  // ==========================================================================

  selectContact: (id) => {
    set((state) => {
      const newSelectedIds = new Set(state.selectedContactIds);
      newSelectedIds.add(id);
      return { selectedContactIds: newSelectedIds };
    });
  },

  deselectContact: (id) => {
    set((state) => {
      const newSelectedIds = new Set(state.selectedContactIds);
      newSelectedIds.delete(id);
      return { selectedContactIds: newSelectedIds };
    });
  },

  selectAllContacts: () => {
    set((state) => ({
      selectedContactIds: new Set(state.contacts.map((c) => c.id)),
    }));
  },

  deselectAllContacts: () => {
    set({ selectedContactIds: new Set() });
  },

  toggleContactSelection: (id) => {
    const state = get();
    if (state.selectedContactIds.has(id)) {
      get().deselectContact(id);
    } else {
      get().selectContact(id);
    }
  },

  // ==========================================================================
  // Custom Fields
  // ==========================================================================

  fetchCustomFields: async () => {
    try {
      const customFields = await getCustomFields();
      set({ customFields });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch custom fields";
      set({ error: message });
    }
  },

  createCustomField: async (input) => {
    set({ isSaving: true, error: null });

    try {
      const field = await createCustomField(input);
      set((state) => ({
        customFields: [...state.customFields, field],
        isSaving: false,
      }));
      return field;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create custom field";
      set({ isSaving: false, error: message });
      return null;
    }
  },

  updateCustomField: async (input) => {
    set({ isSaving: true, error: null });

    try {
      const field = await updateCustomField(input);
      set((state) => ({
        customFields: state.customFields.map((f) =>
          f.id === field.id ? field : f
        ),
        isSaving: false,
      }));
      return field;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update custom field";
      set({ isSaving: false, error: message });
      return null;
    }
  },

  deleteCustomField: async (id) => {
    set({ isDeleting: true, error: null });

    try {
      await deleteCustomField(id);
      set((state) => ({
        customFields: state.customFields.filter((f) => f.id !== id),
        isDeleting: false,
      }));
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete custom field";
      set({ isDeleting: false, error: message });
      return false;
    }
  },

  // ==========================================================================
  // Tags
  // ==========================================================================

  fetchTags: async () => {
    try {
      const tags = await getTags();
      set({ tags });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch tags";
      set({ error: message });
    }
  },

  createTag: async (input) => {
    set({ isSaving: true, error: null });

    try {
      const tag = await createTag(input);
      set((state) => ({
        tags: [...state.tags, tag].sort((a, b) => a.name.localeCompare(b.name)),
        isSaving: false,
      }));
      return tag;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create tag";
      set({ isSaving: false, error: message });
      return null;
    }
  },

  updateTag: async (input) => {
    set({ isSaving: true, error: null });

    try {
      const tag = await updateTag(input);
      set((state) => ({
        tags: state.tags
          .map((t) => (t.id === tag.id ? tag : t))
          .sort((a, b) => a.name.localeCompare(b.name)),
        isSaving: false,
      }));
      return tag;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update tag";
      set({ isSaving: false, error: message });
      return null;
    }
  },

  deleteTag: async (id) => {
    set({ isDeleting: true, error: null });

    try {
      await deleteTag(id);
      set((state) => ({
        tags: state.tags.filter((t) => t.id !== id),
        isDeleting: false,
      }));
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete tag";
      set({ isDeleting: false, error: message });
      return false;
    }
  },

  // ==========================================================================
  // Utility
  // ==========================================================================

  setError: (error) => set({ error }),

  resetState: () => set(initialState),
}));
