import { act } from '@testing-library/react';
import { useContactStore } from '@/lib/store/contactStore';
import type { ContactWithRelations, Tag, CustomField } from '@/types/contact';

// Mock the supabase module
jest.mock('@/lib/supabase', () => ({
  getContacts: jest.fn(),
  getContact: jest.fn(),
  createContact: jest.fn(),
  updateContact: jest.fn(),
  deleteContact: jest.fn(),
  deleteContacts: jest.fn(),
  getCustomFields: jest.fn(),
  createCustomField: jest.fn(),
  updateCustomField: jest.fn(),
  deleteCustomField: jest.fn(),
  getTags: jest.fn(),
  createTag: jest.fn(),
  updateTag: jest.fn(),
  deleteTag: jest.fn(),
}));

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
} from '@/lib/supabase';

const mockGetContacts = getContacts as jest.Mock;
const mockGetContact = getContact as jest.Mock;
const mockCreateContact = createContact as jest.Mock;
const mockUpdateContact = updateContact as jest.Mock;
const mockDeleteContact = deleteContact as jest.Mock;
const mockDeleteContacts = deleteContacts as jest.Mock;
const mockGetCustomFields = getCustomFields as jest.Mock;
const mockCreateCustomField = createCustomField as jest.Mock;
const mockUpdateCustomField = updateCustomField as jest.Mock;
const mockDeleteCustomField = deleteCustomField as jest.Mock;
const mockGetTags = getTags as jest.Mock;
const mockCreateTag = createTag as jest.Mock;
const mockUpdateTag = updateTag as jest.Mock;
const mockDeleteTag = deleteTag as jest.Mock;

describe('contactStore', () => {
  const mockContact: ContactWithRelations = {
    id: 'contact-1',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    phone: '+15551234567',
    status: 'new',
    do_not_contact: false,
    created_at: '2026-01-14T00:00:00Z',
    updated_at: '2026-01-14T00:00:00Z',
    tags: [],
    custom_fields: [],
  };

  const mockContact2: ContactWithRelations = {
    id: 'contact-2',
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane.smith@example.com',
    phone: '+15559876543',
    status: 'contacted',
    do_not_contact: false,
    created_at: '2026-01-14T00:00:00Z',
    updated_at: '2026-01-14T00:00:00Z',
    tags: [],
    custom_fields: [],
  };

  const mockTag: Tag = {
    id: 'tag-1',
    name: 'VIP',
    color: '#ef4444',
    created_at: '2026-01-14T00:00:00Z',
  };

  const mockCustomField: CustomField = {
    id: 'field-1',
    name: 'Company',
    field_type: 'text',
    options: null,
    is_required: false,
    created_at: '2026-01-14T00:00:00Z',
  };

  beforeEach(() => {
    // Reset store to initial state before each test
    act(() => {
      useContactStore.getState().resetState();
    });
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = useContactStore.getState();

      expect(state.contacts).toEqual([]);
      expect(state.totalContacts).toBe(0);
      expect(state.currentPage).toBe(1);
      expect(state.pageSize).toBe(25);
      expect(state.totalPages).toBe(0);
      expect(state.filters).toEqual({});
      expect(state.sortBy).toBe('created_at');
      expect(state.sortOrder).toBe('desc');
      expect(state.selectedContactIds).toEqual(new Set());
      expect(state.currentContact).toBeNull();
      expect(state.customFields).toEqual([]);
      expect(state.tags).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('fetchContacts', () => {
    it('should fetch contacts successfully', async () => {
      mockGetContacts.mockResolvedValueOnce({
        contacts: [mockContact, mockContact2],
        total: 2,
        page: 1,
        pageSize: 25,
        totalPages: 1,
      });

      await act(async () => {
        await useContactStore.getState().fetchContacts();
      });

      const state = useContactStore.getState();
      expect(state.contacts).toHaveLength(2);
      expect(state.totalContacts).toBe(2);
      expect(state.totalPages).toBe(1);
      expect(state.isLoading).toBe(false);
    });

    it('should handle fetch errors', async () => {
      mockGetContacts.mockRejectedValueOnce(new Error('Database error'));

      await act(async () => {
        await useContactStore.getState().fetchContacts();
      });

      const state = useContactStore.getState();
      expect(state.error).toBe('Database error');
      expect(state.isLoading).toBe(false);
    });

    it('should pass filters and pagination to getContacts', async () => {
      mockGetContacts.mockResolvedValueOnce({
        contacts: [],
        total: 0,
        page: 2,
        pageSize: 10,
        totalPages: 0,
      });

      act(() => {
        useContactStore.setState({
          filters: { status: ['new'] },
          currentPage: 2,
          pageSize: 10,
          sortBy: 'first_name',
          sortOrder: 'asc',
        });
      });

      await act(async () => {
        await useContactStore.getState().fetchContacts();
      });

      expect(mockGetContacts).toHaveBeenCalledWith(
        { status: ['new'] },
        { page: 2, pageSize: 10, sortBy: 'first_name', sortOrder: 'asc' }
      );
    });
  });

  describe('fetchContact', () => {
    it('should fetch single contact successfully', async () => {
      mockGetContact.mockResolvedValueOnce(mockContact);

      await act(async () => {
        await useContactStore.getState().fetchContact('contact-1');
      });

      const state = useContactStore.getState();
      expect(state.currentContact).toEqual(mockContact);
      expect(state.isLoadingContact).toBe(false);
    });

    it('should handle fetch errors', async () => {
      mockGetContact.mockRejectedValueOnce(new Error('Not found'));

      await act(async () => {
        await useContactStore.getState().fetchContact('invalid-id');
      });

      const state = useContactStore.getState();
      expect(state.error).toBe('Not found');
      expect(state.isLoadingContact).toBe(false);
    });
  });

  describe('createContact', () => {
    beforeEach(() => {
      mockGetContacts.mockResolvedValue({
        contacts: [mockContact],
        total: 1,
        page: 1,
        pageSize: 25,
        totalPages: 1,
      });
    });

    it('should create contact successfully', async () => {
      mockCreateContact.mockResolvedValueOnce(mockContact);

      let result: ContactWithRelations | null;
      await act(async () => {
        result = await useContactStore.getState().createContact({
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com',
        });
      });

      expect(result!).toEqual(mockContact);
      expect(useContactStore.getState().isSaving).toBe(false);
      expect(mockGetContacts).toHaveBeenCalled(); // Refreshes list
    });

    it('should handle create errors', async () => {
      mockCreateContact.mockRejectedValueOnce(new Error('Create failed'));

      let result: ContactWithRelations | null;
      await act(async () => {
        result = await useContactStore.getState().createContact({
          first_name: 'John',
        });
      });

      expect(result!).toBeNull();
      expect(useContactStore.getState().error).toBe('Create failed');
    });
  });

  describe('updateContact', () => {
    it('should update contact successfully', async () => {
      const updatedContact = { ...mockContact, first_name: 'Johnny' };
      mockUpdateContact.mockResolvedValueOnce(updatedContact);

      // Set initial state with contact in list
      act(() => {
        useContactStore.setState({ contacts: [mockContact] });
      });

      let result: ContactWithRelations | null;
      await act(async () => {
        result = await useContactStore.getState().updateContact({
          id: 'contact-1',
          first_name: 'Johnny',
        });
      });

      expect(result!.first_name).toBe('Johnny');
      const state = useContactStore.getState();
      expect(state.contacts[0].first_name).toBe('Johnny');
      expect(state.isSaving).toBe(false);
    });

    it('should update currentContact if it matches', async () => {
      const updatedContact = { ...mockContact, first_name: 'Johnny' };
      mockUpdateContact.mockResolvedValueOnce(updatedContact);

      act(() => {
        useContactStore.setState({
          contacts: [mockContact],
          currentContact: mockContact,
        });
      });

      await act(async () => {
        await useContactStore.getState().updateContact({
          id: 'contact-1',
          first_name: 'Johnny',
        });
      });

      expect(useContactStore.getState().currentContact?.first_name).toBe('Johnny');
    });
  });

  describe('deleteContact', () => {
    it('should delete contact successfully', async () => {
      mockDeleteContact.mockResolvedValueOnce(undefined);

      act(() => {
        useContactStore.setState({
          contacts: [mockContact, mockContact2],
          totalContacts: 2,
        });
      });

      let result: boolean;
      await act(async () => {
        result = await useContactStore.getState().deleteContact('contact-1');
      });

      expect(result!).toBe(true);
      const state = useContactStore.getState();
      expect(state.contacts).toHaveLength(1);
      expect(state.contacts[0].id).toBe('contact-2');
      expect(state.totalContacts).toBe(1);
    });

    it('should remove from selection when deleted', async () => {
      mockDeleteContact.mockResolvedValueOnce(undefined);

      act(() => {
        useContactStore.setState({
          contacts: [mockContact],
          selectedContactIds: new Set(['contact-1']),
        });
      });

      await act(async () => {
        await useContactStore.getState().deleteContact('contact-1');
      });

      expect(useContactStore.getState().selectedContactIds.has('contact-1')).toBe(false);
    });

    it('should clear currentContact if deleted', async () => {
      mockDeleteContact.mockResolvedValueOnce(undefined);

      act(() => {
        useContactStore.setState({
          contacts: [mockContact],
          currentContact: mockContact,
        });
      });

      await act(async () => {
        await useContactStore.getState().deleteContact('contact-1');
      });

      expect(useContactStore.getState().currentContact).toBeNull();
    });
  });

  describe('deleteSelectedContacts', () => {
    beforeEach(() => {
      mockGetContacts.mockResolvedValue({
        contacts: [],
        total: 0,
        page: 1,
        pageSize: 25,
        totalPages: 0,
      });
    });

    it('should delete selected contacts successfully', async () => {
      mockDeleteContacts.mockResolvedValueOnce(undefined);

      act(() => {
        useContactStore.setState({
          contacts: [mockContact, mockContact2],
          selectedContactIds: new Set(['contact-1', 'contact-2']),
        });
      });

      let result: boolean;
      await act(async () => {
        result = await useContactStore.getState().deleteSelectedContacts();
      });

      expect(result!).toBe(true);
      expect(mockDeleteContacts).toHaveBeenCalledWith(['contact-1', 'contact-2']);
      expect(useContactStore.getState().selectedContactIds.size).toBe(0);
    });

    it('should return false if no contacts selected', async () => {
      let result: boolean;
      await act(async () => {
        result = await useContactStore.getState().deleteSelectedContacts();
      });

      expect(result!).toBe(false);
      expect(mockDeleteContacts).not.toHaveBeenCalled();
    });
  });

  describe('pagination', () => {
    beforeEach(() => {
      mockGetContacts.mockResolvedValue({
        contacts: [],
        total: 0,
        page: 1,
        pageSize: 25,
        totalPages: 0,
      });
    });

    it('setPage should update page and fetch contacts', async () => {
      await act(async () => {
        useContactStore.getState().setPage(3);
      });

      expect(useContactStore.getState().currentPage).toBe(3);
      expect(mockGetContacts).toHaveBeenCalled();
    });

    it('setPageSize should reset to page 1 and fetch contacts', async () => {
      act(() => {
        useContactStore.setState({ currentPage: 5 });
      });

      await act(async () => {
        useContactStore.getState().setPageSize(50);
      });

      const state = useContactStore.getState();
      expect(state.pageSize).toBe(50);
      expect(state.currentPage).toBe(1);
      expect(mockGetContacts).toHaveBeenCalled();
    });
  });

  describe('filters', () => {
    beforeEach(() => {
      mockGetContacts.mockResolvedValue({
        contacts: [],
        total: 0,
        page: 1,
        pageSize: 25,
        totalPages: 0,
      });
    });

    it('setFilters should update filters and reset to page 1', async () => {
      act(() => {
        useContactStore.setState({ currentPage: 5 });
      });

      await act(async () => {
        useContactStore.getState().setFilters({ status: ['new', 'contacted'] });
      });

      const state = useContactStore.getState();
      expect(state.filters.status).toEqual(['new', 'contacted']);
      expect(state.currentPage).toBe(1);
      expect(mockGetContacts).toHaveBeenCalled();
    });

    it('clearFilters should reset filters and page', async () => {
      act(() => {
        useContactStore.setState({
          filters: { status: ['new'], search: 'test' },
          currentPage: 3,
        });
      });

      await act(async () => {
        useContactStore.getState().clearFilters();
      });

      const state = useContactStore.getState();
      expect(state.filters).toEqual({});
      expect(state.currentPage).toBe(1);
    });

    it('setSorting should update sort options and fetch', async () => {
      await act(async () => {
        useContactStore.getState().setSorting('email', 'asc');
      });

      const state = useContactStore.getState();
      expect(state.sortBy).toBe('email');
      expect(state.sortOrder).toBe('asc');
      expect(mockGetContacts).toHaveBeenCalled();
    });
  });

  describe('selection', () => {
    beforeEach(() => {
      act(() => {
        useContactStore.setState({
          contacts: [mockContact, mockContact2],
        });
      });
    });

    it('selectContact should add to selection', () => {
      act(() => {
        useContactStore.getState().selectContact('contact-1');
      });

      expect(useContactStore.getState().selectedContactIds.has('contact-1')).toBe(true);
    });

    it('deselectContact should remove from selection', () => {
      act(() => {
        useContactStore.setState({
          selectedContactIds: new Set(['contact-1', 'contact-2']),
        });
      });

      act(() => {
        useContactStore.getState().deselectContact('contact-1');
      });

      const selected = useContactStore.getState().selectedContactIds;
      expect(selected.has('contact-1')).toBe(false);
      expect(selected.has('contact-2')).toBe(true);
    });

    it('selectAllContacts should select all contacts in list', () => {
      act(() => {
        useContactStore.getState().selectAllContacts();
      });

      const selected = useContactStore.getState().selectedContactIds;
      expect(selected.has('contact-1')).toBe(true);
      expect(selected.has('contact-2')).toBe(true);
    });

    it('deselectAllContacts should clear selection', () => {
      act(() => {
        useContactStore.setState({
          selectedContactIds: new Set(['contact-1', 'contact-2']),
        });
      });

      act(() => {
        useContactStore.getState().deselectAllContacts();
      });

      expect(useContactStore.getState().selectedContactIds.size).toBe(0);
    });

    it('toggleContactSelection should toggle selection state', () => {
      act(() => {
        useContactStore.getState().toggleContactSelection('contact-1');
      });
      expect(useContactStore.getState().selectedContactIds.has('contact-1')).toBe(true);

      act(() => {
        useContactStore.getState().toggleContactSelection('contact-1');
      });
      expect(useContactStore.getState().selectedContactIds.has('contact-1')).toBe(false);
    });
  });

  describe('custom fields', () => {
    it('fetchCustomFields should load custom fields', async () => {
      mockGetCustomFields.mockResolvedValueOnce([mockCustomField]);

      await act(async () => {
        await useContactStore.getState().fetchCustomFields();
      });

      expect(useContactStore.getState().customFields).toEqual([mockCustomField]);
    });

    it('createCustomField should add to list', async () => {
      mockCreateCustomField.mockResolvedValueOnce(mockCustomField);

      let result: CustomField | null;
      await act(async () => {
        result = await useContactStore.getState().createCustomField({
          name: 'Company',
          field_type: 'text',
        });
      });

      expect(result!).toEqual(mockCustomField);
      expect(useContactStore.getState().customFields).toContainEqual(mockCustomField);
    });

    it('updateCustomField should update in list', async () => {
      const updatedField = { ...mockCustomField, name: 'Organization' };
      mockUpdateCustomField.mockResolvedValueOnce(updatedField);

      act(() => {
        useContactStore.setState({ customFields: [mockCustomField] });
      });

      await act(async () => {
        await useContactStore.getState().updateCustomField({
          id: 'field-1',
          name: 'Organization',
        });
      });

      expect(useContactStore.getState().customFields[0].name).toBe('Organization');
    });

    it('deleteCustomField should remove from list', async () => {
      mockDeleteCustomField.mockResolvedValueOnce(undefined);

      act(() => {
        useContactStore.setState({ customFields: [mockCustomField] });
      });

      let result: boolean;
      await act(async () => {
        result = await useContactStore.getState().deleteCustomField('field-1');
      });

      expect(result!).toBe(true);
      expect(useContactStore.getState().customFields).toHaveLength(0);
    });
  });

  describe('tags', () => {
    it('fetchTags should load tags', async () => {
      mockGetTags.mockResolvedValueOnce([mockTag]);

      await act(async () => {
        await useContactStore.getState().fetchTags();
      });

      expect(useContactStore.getState().tags).toEqual([mockTag]);
    });

    it('createTag should add to list sorted by name', async () => {
      const existingTag: Tag = { ...mockTag, id: 'tag-0', name: 'Beta' };
      const newTag: Tag = { ...mockTag, id: 'tag-2', name: 'Alpha' };
      mockCreateTag.mockResolvedValueOnce(newTag);

      act(() => {
        useContactStore.setState({ tags: [existingTag] });
      });

      await act(async () => {
        await useContactStore.getState().createTag({ name: 'Alpha' });
      });

      const tags = useContactStore.getState().tags;
      expect(tags[0].name).toBe('Alpha');
      expect(tags[1].name).toBe('Beta');
    });

    it('updateTag should update and re-sort', async () => {
      const updatedTag = { ...mockTag, name: 'ZZZ' };
      mockUpdateTag.mockResolvedValueOnce(updatedTag);

      act(() => {
        useContactStore.setState({ tags: [mockTag] });
      });

      await act(async () => {
        await useContactStore.getState().updateTag({
          id: 'tag-1',
          name: 'ZZZ',
        });
      });

      expect(useContactStore.getState().tags[0].name).toBe('ZZZ');
    });

    it('deleteTag should remove from list', async () => {
      mockDeleteTag.mockResolvedValueOnce(undefined);

      act(() => {
        useContactStore.setState({ tags: [mockTag] });
      });

      let result: boolean;
      await act(async () => {
        result = await useContactStore.getState().deleteTag('tag-1');
      });

      expect(result!).toBe(true);
      expect(useContactStore.getState().tags).toHaveLength(0);
    });
  });

  describe('resetState', () => {
    it('should reset all state to initial values', () => {
      act(() => {
        useContactStore.setState({
          contacts: [mockContact],
          currentPage: 5,
          filters: { search: 'test' },
          selectedContactIds: new Set(['contact-1']),
          tags: [mockTag],
          customFields: [mockCustomField],
          error: 'Some error',
        });
      });

      act(() => {
        useContactStore.getState().resetState();
      });

      const state = useContactStore.getState();
      expect(state.contacts).toEqual([]);
      expect(state.currentPage).toBe(1);
      expect(state.filters).toEqual({});
      expect(state.selectedContactIds.size).toBe(0);
      expect(state.tags).toEqual([]);
      expect(state.customFields).toEqual([]);
      expect(state.error).toBeNull();
    });
  });
});
