"use client";

import { useState, useCallback, useMemo } from "react";
import type {
  AdvancedFilters,
  FilterCondition,
  FilterGroup,
  ContactWithRelations,
  FilterFieldType,
  FilterOperator,
  Contact,
} from "@/types/contact";
import {
  createEmptyAdvancedFilters,
  createEmptyFilterGroup,
  createEmptyFilterCondition,
  STANDARD_FILTERABLE_FIELDS,
} from "@/types/contact";

// =============================================================================
// Filter Evaluation Functions
// =============================================================================

function evaluateTextCondition(
  value: string | null | undefined,
  operator: string,
  filterValue: string | string[] | null
): boolean {
  const normalizedValue = (value || "").toLowerCase();
  const normalizedFilterValue = typeof filterValue === "string"
    ? filterValue.toLowerCase()
    : "";

  switch (operator) {
    case "equals":
      return normalizedValue === normalizedFilterValue;
    case "not_equals":
      return normalizedValue !== normalizedFilterValue;
    case "contains":
      return normalizedValue.includes(normalizedFilterValue);
    case "not_contains":
      return !normalizedValue.includes(normalizedFilterValue);
    case "starts_with":
      return normalizedValue.startsWith(normalizedFilterValue);
    case "ends_with":
      return normalizedValue.endsWith(normalizedFilterValue);
    case "is_empty":
      return !value || value.trim() === "";
    case "is_not_empty":
      return !!value && value.trim() !== "";
    default:
      return true;
  }
}

function evaluateDateCondition(
  value: string | null | undefined,
  operator: string,
  filterValue: string | string[] | null,
  filterValue2?: string | null
): boolean {
  if (operator === "is_empty") {
    return !value;
  }
  if (operator === "is_not_empty") {
    return !!value;
  }

  if (!value) return false;

  const dateValue = new Date(value);
  const now = new Date();

  switch (operator) {
    case "equals":
      if (!filterValue) return false;
      return dateValue.toDateString() === new Date(filterValue as string).toDateString();
    case "before":
      if (!filterValue) return false;
      return dateValue < new Date(filterValue as string);
    case "after":
      if (!filterValue) return false;
      return dateValue > new Date(filterValue as string);
    case "between":
      if (!filterValue || !filterValue2) return false;
      return dateValue >= new Date(filterValue as string) && dateValue <= new Date(filterValue2);
    case "last_7_days":
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return dateValue >= sevenDaysAgo && dateValue <= now;
    case "last_30_days":
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return dateValue >= thirtyDaysAgo && dateValue <= now;
    case "last_90_days":
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      return dateValue >= ninetyDaysAgo && dateValue <= now;
    case "this_month":
      return dateValue.getMonth() === now.getMonth() &&
             dateValue.getFullYear() === now.getFullYear();
    case "this_year":
      return dateValue.getFullYear() === now.getFullYear();
    default:
      return true;
  }
}

function evaluateStatusCondition(
  value: Contact["status"],
  operator: string,
  filterValue: string | string[] | null
): boolean {
  const statuses = Array.isArray(filterValue) ? filterValue : [filterValue];

  switch (operator) {
    case "is":
      return statuses.includes(value);
    case "is_not":
      return !statuses.includes(value);
    default:
      return true;
  }
}

function evaluateTagCondition(
  tags: { id: string }[],
  operator: string,
  filterValue: string | string[] | null
): boolean {
  const tagIds = tags.map(t => t.id);
  const filterTagIds = Array.isArray(filterValue) ? filterValue : [filterValue].filter(Boolean);

  switch (operator) {
    case "has_any":
      return filterTagIds.some(id => tagIds.includes(id as string));
    case "has_all":
      return filterTagIds.every(id => tagIds.includes(id as string));
    case "has_none":
      return !filterTagIds.some(id => tagIds.includes(id as string));
    default:
      return true;
  }
}

function evaluateBooleanCondition(
  value: boolean,
  operator: string
): boolean {
  switch (operator) {
    case "is_true":
      return value === true;
    case "is_false":
      return value === false;
    default:
      return true;
  }
}

function evaluateCondition(
  contact: ContactWithRelations,
  condition: FilterCondition
): boolean {
  const { field, fieldType, operator, value, value2 } = condition;

  switch (fieldType) {
    case "text":
      return evaluateTextCondition(
        contact[field as keyof Contact] as string | null,
        operator,
        value
      );
    case "date":
      return evaluateDateCondition(
        contact[field as keyof Contact] as string | null,
        operator,
        value,
        value2
      );
    case "status":
      return evaluateStatusCondition(contact.status, operator, value);
    case "tags":
      return evaluateTagCondition(contact.tags, operator, value);
    case "boolean":
      return evaluateBooleanCondition(
        contact[field as keyof Contact] as boolean,
        operator
      );
    case "number":
      // For now, treat number like text (can be enhanced later)
      return evaluateTextCondition(
        String(contact[field as keyof Contact] || ""),
        operator,
        value
      );
    default:
      return true;
  }
}

function evaluateGroup(
  contact: ContactWithRelations,
  group: FilterGroup
): boolean {
  if (group.conditions.length === 0) return true;

  if (group.logic === "and") {
    return group.conditions.every(condition => evaluateCondition(contact, condition));
  } else {
    return group.conditions.some(condition => evaluateCondition(contact, condition));
  }
}

export function evaluateFilters(
  contact: ContactWithRelations,
  filters: AdvancedFilters
): boolean {
  if (filters.groups.length === 0) return true;

  if (filters.groupLogic === "and") {
    return filters.groups.every(group => evaluateGroup(contact, group));
  } else {
    return filters.groups.some(group => evaluateGroup(contact, group));
  }
}

export function filterContacts(
  contacts: ContactWithRelations[],
  filters: AdvancedFilters
): ContactWithRelations[] {
  if (filters.groups.length === 0) return contacts;
  return contacts.filter(contact => evaluateFilters(contact, filters));
}

// =============================================================================
// useContactFilters Hook
// =============================================================================

export function useContactFilters(initialFilters?: AdvancedFilters) {
  const [filters, setFilters] = useState<AdvancedFilters>(
    initialFilters || createEmptyAdvancedFilters()
  );

  // Add a new filter group
  const addGroup = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      groups: [...prev.groups, createEmptyFilterGroup()],
    }));
  }, []);

  // Remove a filter group
  const removeGroup = useCallback((groupId: string) => {
    setFilters(prev => ({
      ...prev,
      groups: prev.groups.filter(g => g.id !== groupId),
    }));
  }, []);

  // Update a filter group's logic
  const updateGroupLogic = useCallback((groupId: string, logic: "and" | "or") => {
    setFilters(prev => ({
      ...prev,
      groups: prev.groups.map(g =>
        g.id === groupId ? { ...g, logic } : g
      ),
    }));
  }, []);

  // Add a condition to a group
  const addCondition = useCallback((groupId: string) => {
    setFilters(prev => ({
      ...prev,
      groups: prev.groups.map(g =>
        g.id === groupId
          ? { ...g, conditions: [...g.conditions, createEmptyFilterCondition()] }
          : g
      ),
    }));
  }, []);

  // Remove a condition from a group
  const removeCondition = useCallback((groupId: string, conditionId: string) => {
    setFilters(prev => ({
      ...prev,
      groups: prev.groups.map(g =>
        g.id === groupId
          ? { ...g, conditions: g.conditions.filter(c => c.id !== conditionId) }
          : g
      ),
    }));
  }, []);

  // Update a condition
  const updateCondition = useCallback(
    (groupId: string, conditionId: string, updates: Partial<FilterCondition>) => {
      setFilters(prev => ({
        ...prev,
        groups: prev.groups.map(g =>
          g.id === groupId
            ? {
                ...g,
                conditions: g.conditions.map(c =>
                  c.id === conditionId ? { ...c, ...updates } : c
                ),
              }
            : g
        ),
      }));
    },
    []
  );

  // Update the field of a condition (and reset operator/value based on field type)
  const updateConditionField = useCallback(
    (groupId: string, conditionId: string, fieldId: string) => {
      const field = STANDARD_FILTERABLE_FIELDS.find(f => f.id === fieldId);
      if (!field) return;

      const defaultOperator = getDefaultOperator(field.type);

      updateCondition(groupId, conditionId, {
        field: field.field,
        fieldType: field.type,
        operator: defaultOperator,
        value: field.type === "tags" || field.type === "status" ? [] : "",
        value2: null,
      });
    },
    [updateCondition]
  );

  // Update group-level logic (between all groups)
  const updateGroupsLogic = useCallback((logic: "and" | "or") => {
    setFilters(prev => ({
      ...prev,
      groupLogic: logic,
    }));
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters(createEmptyAdvancedFilters());
  }, []);

  // Load filters (e.g., from a saved view)
  const loadFilters = useCallback((newFilters: AdvancedFilters) => {
    setFilters(newFilters);
  }, []);

  // Check if filters have any conditions
  const hasFilters = useMemo(() => {
    return filters.groups.length > 0 &&
      filters.groups.some(g => g.conditions.length > 0);
  }, [filters]);

  // Count total conditions
  const filterCount = useMemo(() => {
    return filters.groups.reduce((sum, g) => sum + g.conditions.length, 0);
  }, [filters]);

  return {
    filters,
    setFilters,
    addGroup,
    removeGroup,
    updateGroupLogic,
    addCondition,
    removeCondition,
    updateCondition,
    updateConditionField,
    updateGroupsLogic,
    clearFilters,
    loadFilters,
    hasFilters,
    filterCount,
    // Export filter evaluation functions
    evaluateFilters,
    filterContacts,
  };
}

// Helper to get default operator for a field type
function getDefaultOperator(fieldType: FilterFieldType): FilterOperator {
  switch (fieldType) {
    case "text":
      return "contains";
    case "date":
      return "last_30_days";
    case "status":
      return "is";
    case "tags":
      return "has_any";
    case "boolean":
      return "is_true";
    case "number":
      return "equals";
    default:
      return "contains";
  }
}

export type UseContactFiltersReturn = ReturnType<typeof useContactFilters>;
