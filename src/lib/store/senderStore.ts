import { create } from "zustand";
import type {
  SenderEmail,
  SenderPhone,
  CreateSenderEmailInput,
  CreateSenderPhoneInput,
  UpdateSenderEmailInput,
  UpdateSenderPhoneInput,
} from "@/types/sender";
import {
  getSenderEmails as fetchSenderEmailsFromDb,
  getSenderPhones as fetchSenderPhonesFromDb,
  addSenderEmail as addSenderEmailToDb,
  addSenderPhone as addSenderPhoneToDb,
  updateSenderEmailIdentity as updateSenderEmailInDb,
  updateSenderPhoneIdentity as updateSenderPhoneInDb,
  removeSenderEmail as removeSenderEmailFromDb,
  removeSenderPhone as removeSenderPhoneFromDb,
} from "@/lib/supabase";

interface SenderState {
  // Data
  emails: SenderEmail[];
  phones: SenderPhone[];

  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  isDeleting: boolean;

  // Error state
  error: string | null;

  // Actions
  fetchSenders: () => Promise<void>;
  addEmail: (input: CreateSenderEmailInput) => Promise<SenderEmail | null>;
  addPhone: (input: CreateSenderPhoneInput) => Promise<SenderPhone | null>;
  updateEmail: (input: UpdateSenderEmailInput) => Promise<SenderEmail | null>;
  updatePhone: (input: UpdateSenderPhoneInput) => Promise<SenderPhone | null>;
  removeEmail: (id: string) => Promise<boolean>;
  removePhone: (id: string) => Promise<boolean>;

  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useSenderStore = create<SenderState>((set, get) => ({
  // Initial data
  emails: [],
  phones: [],

  // Initial loading states
  isLoading: false,
  isSaving: false,
  isDeleting: false,

  // Initial error state
  error: null,

  // =============================================================================
  // Fetch Actions
  // =============================================================================

  fetchSenders: async () => {
    set({ isLoading: true, error: null });

    try {
      const [emails, phones] = await Promise.all([
        fetchSenderEmailsFromDb(),
        fetchSenderPhonesFromDb(),
      ]);
      set({ emails, phones, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch sender identities";
      set({ error: message, isLoading: false });
    }
  },

  // =============================================================================
  // Email CRUD Actions
  // =============================================================================

  addEmail: async (input: CreateSenderEmailInput) => {
    set({ isSaving: true, error: null });

    try {
      const email = await addSenderEmailToDb(input);

      // Update local state - if this is default, update others
      set((state) => ({
        emails: email.is_default
          ? [email, ...state.emails.map((e) => ({ ...e, is_default: false }))]
          : [email, ...state.emails],
        isSaving: false,
      }));

      return email;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add email sender";
      set({ error: message, isSaving: false });
      return null;
    }
  },

  updateEmail: async (input: UpdateSenderEmailInput) => {
    set({ isSaving: true, error: null });

    try {
      const email = await updateSenderEmailInDb(input);

      // Update local state
      set((state) => ({
        emails: input.is_default
          ? state.emails.map((e) =>
              e.id === email.id ? email : { ...e, is_default: false }
            )
          : state.emails.map((e) => (e.id === email.id ? email : e)),
        isSaving: false,
      }));

      return email;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update email sender";
      set({ error: message, isSaving: false });
      return null;
    }
  },

  removeEmail: async (id: string) => {
    set({ isDeleting: true, error: null });

    try {
      await removeSenderEmailFromDb(id);

      set((state) => ({
        emails: state.emails.filter((e) => e.id !== id),
        isDeleting: false,
      }));

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to remove email sender";
      set({ error: message, isDeleting: false });
      return false;
    }
  },

  // =============================================================================
  // Phone CRUD Actions
  // =============================================================================

  addPhone: async (input: CreateSenderPhoneInput) => {
    set({ isSaving: true, error: null });

    try {
      const phone = await addSenderPhoneToDb(input);

      // Update local state
      set((state) => ({
        phones: phone.is_default
          ? [phone, ...state.phones.map((p) => ({ ...p, is_default: false }))]
          : [phone, ...state.phones],
        isSaving: false,
      }));

      return phone;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add phone sender";
      set({ error: message, isSaving: false });
      return null;
    }
  },

  updatePhone: async (input: UpdateSenderPhoneInput) => {
    set({ isSaving: true, error: null });

    try {
      const phone = await updateSenderPhoneInDb(input);

      // Update local state
      set((state) => ({
        phones: input.is_default
          ? state.phones.map((p) =>
              p.id === phone.id ? phone : { ...p, is_default: false }
            )
          : state.phones.map((p) => (p.id === phone.id ? phone : p)),
        isSaving: false,
      }));

      return phone;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update phone sender";
      set({ error: message, isSaving: false });
      return null;
    }
  },

  removePhone: async (id: string) => {
    set({ isDeleting: true, error: null });

    try {
      await removeSenderPhoneFromDb(id);

      set((state) => ({
        phones: state.phones.filter((p) => p.id !== id),
        isDeleting: false,
      }));

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to remove phone sender";
      set({ error: message, isDeleting: false });
      return false;
    }
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

export const selectDefaultEmail = (emails: SenderEmail[]): SenderEmail | null => {
  return emails.find((e) => e.is_default) || emails[0] || null;
};

export const selectDefaultPhone = (phones: SenderPhone[]): SenderPhone | null => {
  return phones.find((p) => p.is_default) || phones[0] || null;
};

export const selectVerifiedEmails = (emails: SenderEmail[]): SenderEmail[] => {
  return emails.filter((e) => e.verified);
};
