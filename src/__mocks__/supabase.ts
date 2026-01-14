// Mock Supabase operations for testing

import type { DbWorkflow } from '@/types/workflow';
import type {
  ContactWithRelations,
  CustomField,
  Tag,
  ContactListResponse,
} from '@/types/contact';

// Mock data
export const mockWorkflow: DbWorkflow = {
  id: 'test-workflow-1',
  name: 'Test Workflow',
  description: 'A test workflow',
  is_enabled: false,
  created_at: '2026-01-14T00:00:00Z',
  updated_at: '2026-01-14T00:00:00Z',
};

export const mockContact: ContactWithRelations = {
  id: 'test-contact-1',
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

export const mockTag: Tag = {
  id: 'test-tag-1',
  name: 'VIP',
  color: '#ef4444',
  created_at: '2026-01-14T00:00:00Z',
};

export const mockCustomField: CustomField = {
  id: 'test-field-1',
  name: 'Company',
  field_type: 'text',
  options: null,
  is_required: false,
  created_at: '2026-01-14T00:00:00Z',
};

// Mock implementations
export const loadWorkflowWithNodesAndEdges = jest.fn().mockResolvedValue({
  workflow: mockWorkflow,
  nodes: [],
  edges: [],
});

export const saveWorkflowNodesAndEdges = jest.fn().mockResolvedValue(undefined);

export const updateWorkflow = jest.fn().mockImplementation((id, data) => {
  return Promise.resolve({ ...mockWorkflow, ...data });
});

export const createWorkflow = jest.fn().mockResolvedValue(mockWorkflow);

export const deleteWorkflow = jest.fn().mockResolvedValue(undefined);

// Contact operations
export const getContacts = jest.fn().mockResolvedValue({
  contacts: [mockContact],
  total: 1,
  page: 1,
  pageSize: 25,
  totalPages: 1,
} as ContactListResponse);

export const getContact = jest.fn().mockResolvedValue(mockContact);

export const createContact = jest.fn().mockResolvedValue(mockContact);

export const updateContact = jest.fn().mockImplementation((input) => {
  return Promise.resolve({ ...mockContact, ...input });
});

export const deleteContact = jest.fn().mockResolvedValue(undefined);

export const deleteContacts = jest.fn().mockResolvedValue(undefined);

// Custom field operations
export const getCustomFields = jest.fn().mockResolvedValue([mockCustomField]);

export const createCustomField = jest.fn().mockResolvedValue(mockCustomField);

export const updateCustomField = jest.fn().mockImplementation((input) => {
  return Promise.resolve({ ...mockCustomField, ...input });
});

export const deleteCustomField = jest.fn().mockResolvedValue(undefined);

// Tag operations
export const getTags = jest.fn().mockResolvedValue([mockTag]);

export const createTag = jest.fn().mockResolvedValue(mockTag);

export const updateTag = jest.fn().mockImplementation((input) => {
  return Promise.resolve({ ...mockTag, ...input });
});

export const deleteTag = jest.fn().mockResolvedValue(undefined);

// Reset all mocks helper
export const resetAllMocks = () => {
  loadWorkflowWithNodesAndEdges.mockClear();
  saveWorkflowNodesAndEdges.mockClear();
  updateWorkflow.mockClear();
  createWorkflow.mockClear();
  deleteWorkflow.mockClear();
  getContacts.mockClear();
  getContact.mockClear();
  createContact.mockClear();
  updateContact.mockClear();
  deleteContact.mockClear();
  deleteContacts.mockClear();
  getCustomFields.mockClear();
  createCustomField.mockClear();
  updateCustomField.mockClear();
  deleteCustomField.mockClear();
  getTags.mockClear();
  createTag.mockClear();
  updateTag.mockClear();
  deleteTag.mockClear();
};
