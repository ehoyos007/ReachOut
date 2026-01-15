"use client";

import { useState, useCallback, useEffect } from "react";
import type {
  SavedView,
  CreateSavedViewInput,
  UpdateSavedViewInput,
  AdvancedFilters,
} from "@/types/contact";
import {
  getSavedViews,
  createSavedView,
  updateSavedView,
  deleteSavedView,
  reorderSavedViews,
} from "@/lib/supabase";

export function useSavedViews() {
  const [views, setViews] = useState<SavedView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);

  // Fetch all saved views
  const fetchViews = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getSavedViews();
      setViews(data);
    } catch (err) {
      console.error("Failed to fetch saved views:", err);
      setError("Failed to load saved views");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchViews();
  }, [fetchViews]);

  // Create a new view
  const create = useCallback(
    async (input: CreateSavedViewInput): Promise<SavedView | null> => {
      try {
        setIsSaving(true);
        setError(null);
        const newView = await createSavedView(input);
        setViews((prev) => [...prev, newView]);
        return newView;
      } catch (err) {
        console.error("Failed to create saved view:", err);
        setError("Failed to create view");
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  // Update an existing view
  const update = useCallback(
    async (input: UpdateSavedViewInput): Promise<SavedView | null> => {
      try {
        setIsSaving(true);
        setError(null);
        const updatedView = await updateSavedView(input);
        setViews((prev) =>
          prev.map((v) => (v.id === updatedView.id ? updatedView : v))
        );
        return updatedView;
      } catch (err) {
        console.error("Failed to update saved view:", err);
        setError("Failed to update view");
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  // Delete a view
  const remove = useCallback(async (id: string): Promise<boolean> => {
    try {
      setIsSaving(true);
      setError(null);
      await deleteSavedView(id);
      setViews((prev) => prev.filter((v) => v.id !== id));
      if (activeViewId === id) {
        setActiveViewId(null);
      }
      return true;
    } catch (err) {
      console.error("Failed to delete saved view:", err);
      setError("Failed to delete view");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [activeViewId]);

  // Reorder views
  const reorder = useCallback(async (viewIds: string[]): Promise<boolean> => {
    try {
      setIsSaving(true);
      setError(null);
      await reorderSavedViews(viewIds);

      // Update local state with new order
      setViews((prev) => {
        const viewMap = new Map(prev.map((v) => [v.id, v]));
        return viewIds
          .filter((id) => viewMap.has(id))
          .map((id, index) => ({
            ...viewMap.get(id)!,
            sort_order: index,
          }));
      });

      return true;
    } catch (err) {
      console.error("Failed to reorder saved views:", err);
      setError("Failed to reorder views");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Select a view
  const selectView = useCallback((viewId: string | null) => {
    setActiveViewId(viewId);
  }, []);

  // Get the active view
  const activeView = activeViewId
    ? views.find((v) => v.id === activeViewId) ?? null
    : null;

  // Save current filters as a new view
  const saveCurrentFilters = useCallback(
    async (name: string, filters: AdvancedFilters, icon?: string, color?: string) => {
      return create({
        name,
        filters,
        icon,
        color,
      });
    },
    [create]
  );

  // Update the filters of an existing view
  const updateViewFilters = useCallback(
    async (viewId: string, filters: AdvancedFilters) => {
      return update({
        id: viewId,
        filters,
      });
    },
    [update]
  );

  return {
    views,
    isLoading,
    isSaving,
    error,
    activeViewId,
    activeView,
    fetchViews,
    create,
    update,
    remove,
    reorder,
    selectView,
    saveCurrentFilters,
    updateViewFilters,
    setError,
  };
}

export type UseSavedViewsReturn = ReturnType<typeof useSavedViews>;
