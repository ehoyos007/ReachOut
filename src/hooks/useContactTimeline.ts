"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type {
  TimelineEvent,
  TimelineResponse,
  TimelineDateGroup,
} from "@/types/timeline";
import { groupEventsByDate } from "@/lib/timeline-utils";

interface UseContactTimelineOptions {
  contactId: string;
  contactCreatedAt?: string;
  initialLimit?: number;
}

interface UseContactTimelineReturn {
  events: TimelineEvent[];
  dateGroups: TimelineDateGroup[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useContactTimeline({
  contactId,
  contactCreatedAt,
  initialLimit = 30,
}: UseContactTimelineOptions): UseContactTimelineReturn {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);

  // Track if component is mounted
  const isMounted = useRef(true);

  // Fetch timeline data
  const fetchTimeline = useCallback(
    async (before?: string, append = false) => {
      if (!contactId) return;

      try {
        const params = new URLSearchParams();
        params.set("limit", initialLimit.toString());
        if (before) params.set("before", before);
        if (contactCreatedAt) params.set("contactCreatedAt", contactCreatedAt);

        const response = await fetch(
          `/api/contacts/${contactId}/timeline?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch timeline: ${response.statusText}`);
        }

        const data: TimelineResponse = await response.json();

        if (!isMounted.current) return;

        if (append) {
          setEvents((prev) => [...prev, ...data.events]);
        } else {
          setEvents(data.events);
        }

        setHasMore(data.hasMore);
        setCursor(data.nextCursor);
        setError(null);
      } catch (err) {
        if (!isMounted.current) return;
        setError(err instanceof Error ? err : new Error("Unknown error"));
      }
    },
    [contactId, contactCreatedAt, initialLimit]
  );

  // Initial load
  useEffect(() => {
    isMounted.current = true;

    const loadInitial = async () => {
      setIsLoading(true);
      setError(null);
      await fetchTimeline();
      if (isMounted.current) {
        setIsLoading(false);
      }
    };

    loadInitial();

    return () => {
      isMounted.current = false;
    };
  }, [fetchTimeline]);

  // Auto-refresh on window focus
  useEffect(() => {
    const handleFocus = () => {
      // Only refresh if not currently loading
      if (!isLoading && !isLoadingMore) {
        fetchTimeline();
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchTimeline, isLoading, isLoadingMore]);

  // Load more events
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || !cursor) return;

    setIsLoadingMore(true);
    await fetchTimeline(cursor, true);
    if (isMounted.current) {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, cursor, fetchTimeline]);

  // Manual refresh
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setCursor(null);
    await fetchTimeline();
    if (isMounted.current) {
      setIsLoading(false);
    }
  }, [fetchTimeline]);

  // Group events by date
  const dateGroups = groupEventsByDate(events);

  return {
    events,
    dateGroups,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    refresh,
  };
}
