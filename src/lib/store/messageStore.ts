import { create } from "zustand";
import type {
  Message,
  MessageChannel,
  MessageDirection,
  MessageStatus,
  MessageFilters,
  MessagePagination,
  CreateMessageInput,
  UpdateMessageInput,
  SendMessageInput,
} from "@/types/message";
import {
  getMessages as fetchMessagesFromDb,
  getMessagesByContact as fetchMessagesByContactFromDb,
  getMessage as fetchMessageFromDb,
  createMessage as createMessageInDb,
  updateMessage as updateMessageInDb,
  deleteMessage as deleteMessageFromDb,
  getMessageCount as getMessageCountFromDb,
} from "@/lib/supabase";

interface MessageState {
  // Data
  messages: Message[];
  selectedMessage: Message | null;
  contactMessages: Record<string, Message[]>; // Messages grouped by contact_id

  // Filters
  filters: MessageFilters;

  // Pagination
  pagination: MessagePagination;

  // Loading states
  isLoading: boolean;
  isSending: boolean;

  // Error state
  error: string | null;

  // Actions
  fetchMessages: (filters?: MessageFilters) => Promise<void>;
  fetchMessagesByContact: (contactId: string) => Promise<Message[]>;
  fetchMessage: (id: string) => Promise<Message | null>;
  createMessage: (input: CreateMessageInput) => Promise<Message | null>;
  updateMessage: (input: UpdateMessageInput) => Promise<Message | null>;
  deleteMessage: (id: string) => Promise<boolean>;

  // Send message action (creates message and triggers provider)
  sendMessage: (input: SendMessageInput) => Promise<Message | null>;

  // Pagination actions
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;

  // Filter actions
  setFilters: (filters: Partial<MessageFilters>) => void;
  clearFilters: () => void;

  // Selection
  setSelectedMessage: (message: Message | null) => void;

  // Contact messages cache
  addMessageToContact: (contactId: string, message: Message) => void;
  clearContactMessages: (contactId: string) => void;

  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;
}

const initialFilters: MessageFilters = {
  contact_id: undefined,
  channel: undefined,
  direction: undefined,
  status: undefined,
  dateFrom: undefined,
  dateTo: undefined,
};

const initialPagination: MessagePagination = {
  page: 1,
  pageSize: 25,
  total: 0,
  totalPages: 0,
};

export const useMessageStore = create<MessageState>((set, get) => ({
  // Initial data
  messages: [],
  selectedMessage: null,
  contactMessages: {},

  // Initial filters
  filters: initialFilters,

  // Initial pagination
  pagination: initialPagination,

  // Initial loading states
  isLoading: false,
  isSending: false,

  // Initial error state
  error: null,

  // =============================================================================
  // Fetch Actions
  // =============================================================================

  fetchMessages: async (filters?: MessageFilters) => {
    set({ isLoading: true, error: null });

    try {
      const currentFilters = filters || get().filters;
      const { pagination } = get();

      const [messages, total] = await Promise.all([
        fetchMessagesFromDb(currentFilters, {
          page: pagination.page,
          pageSize: pagination.pageSize,
        }),
        getMessageCountFromDb(currentFilters),
      ]);

      set({
        messages,
        pagination: {
          ...pagination,
          total,
          totalPages: Math.ceil(total / pagination.pageSize),
        },
        isLoading: false,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch messages";
      set({ error: message, isLoading: false });
    }
  },

  fetchMessagesByContact: async (contactId: string) => {
    set({ isLoading: true, error: null });

    try {
      const messages = await fetchMessagesByContactFromDb(contactId);

      // Update contact messages cache
      set((state) => ({
        contactMessages: {
          ...state.contactMessages,
          [contactId]: messages,
        },
        isLoading: false,
      }));

      return messages;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch messages";
      set({ error: message, isLoading: false });
      return [];
    }
  },

  fetchMessage: async (id: string) => {
    set({ isLoading: true, error: null });

    try {
      const message = await fetchMessageFromDb(id);
      set({ selectedMessage: message, isLoading: false });
      return message;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch message";
      set({ error: errorMessage, isLoading: false });
      return null;
    }
  },

  // =============================================================================
  // CRUD Actions
  // =============================================================================

  createMessage: async (input: CreateMessageInput) => {
    set({ isSending: true, error: null });

    try {
      const message = await createMessageInDb(input);

      // Add to local state and contact cache
      set((state) => {
        const newMessages = [message, ...state.messages];
        const contactMessages = { ...state.contactMessages };

        if (contactMessages[message.contact_id]) {
          contactMessages[message.contact_id] = [
            message,
            ...contactMessages[message.contact_id],
          ];
        }

        return {
          messages: newMessages,
          contactMessages,
          isSending: false,
        };
      });

      return message;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create message";
      set({ error: errorMessage, isSending: false });
      return null;
    }
  },

  updateMessage: async (input: UpdateMessageInput) => {
    try {
      const message = await updateMessageInDb(input);

      // Update in local state
      set((state) => {
        const newMessages = state.messages.map((m) =>
          m.id === message.id ? message : m
        );
        const contactMessages = { ...state.contactMessages };

        if (contactMessages[message.contact_id]) {
          contactMessages[message.contact_id] = contactMessages[
            message.contact_id
          ].map((m) => (m.id === message.id ? message : m));
        }

        return {
          messages: newMessages,
          contactMessages,
          selectedMessage:
            state.selectedMessage?.id === message.id
              ? message
              : state.selectedMessage,
        };
      });

      return message;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update message";
      set({ error: errorMessage });
      return null;
    }
  },

  deleteMessage: async (id: string) => {
    try {
      const message = get().messages.find((m) => m.id === id);
      await deleteMessageFromDb(id);

      // Remove from local state
      set((state) => {
        const newMessages = state.messages.filter((m) => m.id !== id);
        const contactMessages = { ...state.contactMessages };

        if (message && contactMessages[message.contact_id]) {
          contactMessages[message.contact_id] = contactMessages[
            message.contact_id
          ].filter((m) => m.id !== id);
        }

        return {
          messages: newMessages,
          contactMessages,
          selectedMessage:
            state.selectedMessage?.id === id ? null : state.selectedMessage,
        };
      });

      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete message";
      set({ error: errorMessage });
      return false;
    }
  },

  // =============================================================================
  // Send Message Action
  // =============================================================================

  sendMessage: async (input: SendMessageInput) => {
    set({ isSending: true, error: null });

    try {
      // Call API endpoint to send message via provider
      const response = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to send message");
      }

      const message = result.message as Message;

      // Add to local state and contact cache
      set((state) => {
        const newMessages = [message, ...state.messages];
        const contactMessages = { ...state.contactMessages };

        if (contactMessages[message.contact_id]) {
          contactMessages[message.contact_id] = [
            message,
            ...contactMessages[message.contact_id],
          ];
        }

        return {
          messages: newMessages,
          contactMessages,
          isSending: false,
        };
      });

      return message;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to send message";
      set({ error: errorMessage, isSending: false });
      return null;
    }
  },

  // =============================================================================
  // Pagination Actions
  // =============================================================================

  setPage: (page: number) => {
    set((state) => ({
      pagination: { ...state.pagination, page },
    }));
  },

  setPageSize: (pageSize: number) => {
    set((state) => ({
      pagination: { ...state.pagination, pageSize, page: 1 },
    }));
  },

  // =============================================================================
  // Filter Actions
  // =============================================================================

  setFilters: (newFilters: Partial<MessageFilters>) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
      pagination: { ...state.pagination, page: 1 },
    }));
  },

  clearFilters: () => {
    set({
      filters: initialFilters,
      pagination: { ...initialPagination },
    });
  },

  // =============================================================================
  // Selection Actions
  // =============================================================================

  setSelectedMessage: (message: Message | null) => {
    set({ selectedMessage: message });
  },

  // =============================================================================
  // Contact Messages Cache
  // =============================================================================

  addMessageToContact: (contactId: string, message: Message) => {
    set((state) => {
      const contactMessages = { ...state.contactMessages };
      const existing = contactMessages[contactId] || [];
      contactMessages[contactId] = [message, ...existing];
      return { contactMessages };
    });
  },

  clearContactMessages: (contactId: string) => {
    set((state) => {
      const contactMessages = { ...state.contactMessages };
      delete contactMessages[contactId];
      return { contactMessages };
    });
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

export const selectMessagesByChannel = (
  messages: Message[],
  channel: MessageChannel
): Message[] => {
  return messages.filter((m) => m.channel === channel);
};

export const selectMessagesByDirection = (
  messages: Message[],
  direction: MessageDirection
): Message[] => {
  return messages.filter((m) => m.direction === direction);
};

export const selectMessagesByStatus = (
  messages: Message[],
  status: MessageStatus
): Message[] => {
  return messages.filter((m) => m.status === status);
};

export const selectInboundMessages = (messages: Message[]): Message[] => {
  return selectMessagesByDirection(messages, "inbound");
};

export const selectOutboundMessages = (messages: Message[]): Message[] => {
  return selectMessagesByDirection(messages, "outbound");
};

export const selectFailedMessages = (messages: Message[]): Message[] => {
  return messages.filter((m) => m.status === "failed" || m.status === "bounced");
};

export const selectPendingMessages = (messages: Message[]): Message[] => {
  return messages.filter(
    (m) => m.status === "queued" || m.status === "sending"
  );
};
