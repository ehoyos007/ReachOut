import { create } from "zustand";
import type {
  WorkflowEnrollment,
  WorkflowEnrollmentWithRelations,
  EnrollmentStatus,
  EnrollmentFilters,
  EnrollContactsResult,
} from "@/types/execution";

// =============================================================================
// Store State Type
// =============================================================================

interface EnrollmentState {
  // Data
  enrollments: WorkflowEnrollmentWithRelations[];
  selectedEnrollment: WorkflowEnrollmentWithRelations | null;

  // Loading states
  isLoading: boolean;
  isEnrolling: boolean;
  error: string | null;

  // Filters
  filters: EnrollmentFilters;

  // Counts by status
  counts: {
    active: number;
    paused: number;
    completed: number;
    stopped: number;
    failed: number;
    total: number;
  };

  // Actions
  setEnrollments: (enrollments: WorkflowEnrollmentWithRelations[]) => void;
  setSelectedEnrollment: (enrollment: WorkflowEnrollmentWithRelations | null) => void;
  setLoading: (loading: boolean) => void;
  setEnrolling: (enrolling: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: Partial<EnrollmentFilters>) => void;
  setCounts: (counts: Partial<EnrollmentState["counts"]>) => void;

  // API Actions
  fetchEnrollments: (filters?: EnrollmentFilters) => Promise<void>;
  fetchEnrollmentCounts: (workflowId: string) => Promise<void>;
  enrollContacts: (
    workflowId: string,
    contactIds: string[],
    skipDuplicates?: boolean
  ) => Promise<EnrollContactsResult>;
  stopEnrollment: (enrollmentId: string, reason?: string) => Promise<void>;

  // Helpers
  getEnrollmentById: (id: string) => WorkflowEnrollmentWithRelations | undefined;
  getEnrollmentsByWorkflow: (workflowId: string) => WorkflowEnrollmentWithRelations[];
  getEnrollmentsByContact: (contactId: string) => WorkflowEnrollmentWithRelations[];
}

// =============================================================================
// Zustand Store
// =============================================================================

export const useEnrollmentStore = create<EnrollmentState>((set, get) => ({
  // Initial state
  enrollments: [],
  selectedEnrollment: null,
  isLoading: false,
  isEnrolling: false,
  error: null,
  filters: {},
  counts: {
    active: 0,
    paused: 0,
    completed: 0,
    stopped: 0,
    failed: 0,
    total: 0,
  },

  // Basic setters
  setEnrollments: (enrollments) => set({ enrollments }),
  setSelectedEnrollment: (enrollment) => set({ selectedEnrollment: enrollment }),
  setLoading: (loading) => set({ isLoading: loading }),
  setEnrolling: (enrolling) => set({ isEnrolling: enrolling }),
  setError: (error) => set({ error }),
  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),
  setCounts: (counts) =>
    set((state) => ({ counts: { ...state.counts, ...counts } })),

  // API Actions
  fetchEnrollments: async (filters) => {
    set({ isLoading: true, error: null });

    try {
      const { getEnrollments } = await import("@/lib/supabase");
      const enrollments = await getEnrollments(filters || get().filters);
      set({ enrollments, isLoading: false });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch enrollments";
      set({ error: errorMessage, isLoading: false });
    }
  },

  fetchEnrollmentCounts: async (workflowId) => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}/enroll`);
      const data = await response.json();

      if (data.counts) {
        set({ counts: data.counts });
      }
    } catch (error) {
      console.error("Failed to fetch enrollment counts:", error);
    }
  },

  enrollContacts: async (workflowId, contactIds, skipDuplicates = true) => {
    set({ isEnrolling: true, error: null });

    try {
      const response = await fetch(`/api/workflows/${workflowId}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_ids: contactIds,
          skip_duplicates: skipDuplicates,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to enroll contacts");
      }

      set({ isEnrolling: false });

      // Refresh enrollments
      await get().fetchEnrollments({ workflow_id: workflowId });
      await get().fetchEnrollmentCounts(workflowId);

      return {
        total: data.total,
        enrolled: data.enrolled,
        skipped: data.skipped,
        errors: [],
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to enroll contacts";
      set({ error: errorMessage, isEnrolling: false });
      throw error;
    }
  },

  stopEnrollment: async (enrollmentId, reason) => {
    try {
      const { updateEnrollment } = await import("@/lib/supabase");
      await updateEnrollment(enrollmentId, {
        status: "stopped",
        stopped_at: new Date().toISOString(),
        stop_reason: reason || "Manually stopped",
      });

      // Update local state
      set((state) => ({
        enrollments: state.enrollments.map((e) =>
          e.id === enrollmentId
            ? {
                ...e,
                status: "stopped" as EnrollmentStatus,
                stopped_at: new Date().toISOString(),
                stop_reason: reason || "Manually stopped",
              }
            : e
        ),
      }));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to stop enrollment";
      set({ error: errorMessage });
      throw error;
    }
  },

  // Helpers
  getEnrollmentById: (id) => {
    return get().enrollments.find((e) => e.id === id);
  },

  getEnrollmentsByWorkflow: (workflowId) => {
    return get().enrollments.filter((e) => e.workflow_id === workflowId);
  },

  getEnrollmentsByContact: (contactId) => {
    return get().enrollments.filter((e) => e.contact_id === contactId);
  },
}));
