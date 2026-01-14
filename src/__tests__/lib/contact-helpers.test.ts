import {
  getContactDisplayName,
  getContactInitials,
  formatPhoneNumber,
  normalizePhoneNumber,
  STATUS_DISPLAY_NAMES,
  FIELD_TYPE_DISPLAY_NAMES,
  DEFAULT_TAG_COLORS,
  STANDARD_CONTACT_FIELDS,
} from '@/types/contact';
import type { Contact } from '@/types/contact';

describe('contact helpers', () => {
  describe('getContactDisplayName', () => {
    it('should return full name when both first and last name exist', () => {
      const contact = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        phone: '+15551234567',
      } as Contact;

      expect(getContactDisplayName(contact)).toBe('John Doe');
    });

    it('should return first name only when last name is null', () => {
      const contact = {
        first_name: 'John',
        last_name: null,
        email: 'john@example.com',
        phone: null,
      } as Contact;

      expect(getContactDisplayName(contact)).toBe('John');
    });

    it('should return last name only when first name is null', () => {
      const contact = {
        first_name: null,
        last_name: 'Doe',
        email: 'john@example.com',
        phone: null,
      } as Contact;

      expect(getContactDisplayName(contact)).toBe('Doe');
    });

    it('should return email when no name is available', () => {
      const contact = {
        first_name: null,
        last_name: null,
        email: 'john@example.com',
        phone: '+15551234567',
      } as Contact;

      expect(getContactDisplayName(contact)).toBe('john@example.com');
    });

    it('should return phone when only phone is available', () => {
      const contact = {
        first_name: null,
        last_name: null,
        email: null,
        phone: '+15551234567',
      } as Contact;

      expect(getContactDisplayName(contact)).toBe('+15551234567');
    });

    it('should return "Unknown Contact" when nothing is available', () => {
      const contact = {
        first_name: null,
        last_name: null,
        email: null,
        phone: null,
      } as Contact;

      expect(getContactDisplayName(contact)).toBe('Unknown Contact');
    });
  });

  describe('getContactInitials', () => {
    it('should return both initials when first and last name exist', () => {
      const contact = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
      } as Contact;

      expect(getContactInitials(contact)).toBe('JD');
    });

    it('should return first initial only when last name is null', () => {
      const contact = {
        first_name: 'John',
        last_name: null,
        email: 'john@example.com',
      } as Contact;

      expect(getContactInitials(contact)).toBe('J');
    });

    it('should return last initial only when first name is null', () => {
      const contact = {
        first_name: null,
        last_name: 'Doe',
        email: 'john@example.com',
      } as Contact;

      expect(getContactInitials(contact)).toBe('D');
    });

    it('should return first letter of email when no name', () => {
      const contact = {
        first_name: null,
        last_name: null,
        email: 'john@example.com',
      } as Contact;

      expect(getContactInitials(contact)).toBe('J');
    });

    it('should return "?" when nothing is available', () => {
      const contact = {
        first_name: null,
        last_name: null,
        email: null,
      } as Contact;

      expect(getContactInitials(contact)).toBe('?');
    });

    it('should uppercase initials', () => {
      const contact = {
        first_name: 'john',
        last_name: 'doe',
        email: null,
      } as Contact;

      expect(getContactInitials(contact)).toBe('JD');
    });
  });

  describe('formatPhoneNumber', () => {
    it('should return empty string for null input', () => {
      expect(formatPhoneNumber(null)).toBe('');
    });

    it('should format 10-digit US number correctly', () => {
      expect(formatPhoneNumber('5551234567')).toBe('(555) 123-4567');
    });

    it('should format 11-digit US number with country code', () => {
      expect(formatPhoneNumber('15551234567')).toBe('+1 (555) 123-4567');
    });

    it('should handle already formatted numbers', () => {
      expect(formatPhoneNumber('(555) 123-4567')).toBe('(555) 123-4567');
    });

    it('should return as-is for non-standard formats', () => {
      expect(formatPhoneNumber('+44 7911 123456')).toBe('+44 7911 123456');
    });

    it('should strip non-numeric characters before formatting', () => {
      expect(formatPhoneNumber('555-123-4567')).toBe('(555) 123-4567');
    });
  });

  describe('normalizePhoneNumber', () => {
    it('should remove all non-numeric characters', () => {
      expect(normalizePhoneNumber('(555) 123-4567')).toBe('5551234567');
    });

    it('should preserve leading plus sign', () => {
      expect(normalizePhoneNumber('+1 (555) 123-4567')).toBe('+15551234567');
    });

    it('should handle already normalized numbers', () => {
      expect(normalizePhoneNumber('5551234567')).toBe('5551234567');
    });

    it('should handle international format with plus', () => {
      expect(normalizePhoneNumber('+44 7911 123456')).toBe('+447911123456');
    });
  });

  describe('STATUS_DISPLAY_NAMES', () => {
    it('should have display names for all statuses', () => {
      expect(STATUS_DISPLAY_NAMES.new).toBe('New');
      expect(STATUS_DISPLAY_NAMES.contacted).toBe('Contacted');
      expect(STATUS_DISPLAY_NAMES.responded).toBe('Responded');
      expect(STATUS_DISPLAY_NAMES.qualified).toBe('Qualified');
      expect(STATUS_DISPLAY_NAMES.disqualified).toBe('Disqualified');
    });

    it('should have exactly 5 status types', () => {
      expect(Object.keys(STATUS_DISPLAY_NAMES)).toHaveLength(5);
    });
  });

  describe('FIELD_TYPE_DISPLAY_NAMES', () => {
    it('should have display names for all field types', () => {
      expect(FIELD_TYPE_DISPLAY_NAMES.text).toBe('Text');
      expect(FIELD_TYPE_DISPLAY_NAMES.number).toBe('Number');
      expect(FIELD_TYPE_DISPLAY_NAMES.date).toBe('Date');
      expect(FIELD_TYPE_DISPLAY_NAMES.select).toBe('Select');
    });

    it('should have exactly 4 field types', () => {
      expect(Object.keys(FIELD_TYPE_DISPLAY_NAMES)).toHaveLength(4);
    });
  });

  describe('DEFAULT_TAG_COLORS', () => {
    it('should have 14 default colors', () => {
      expect(DEFAULT_TAG_COLORS).toHaveLength(14);
    });

    it('should have valid hex color format', () => {
      const hexColorRegex = /^#[0-9a-f]{6}$/i;
      DEFAULT_TAG_COLORS.forEach((color) => {
        expect(color).toMatch(hexColorRegex);
      });
    });

    it('should have unique colors', () => {
      const uniqueColors = new Set(DEFAULT_TAG_COLORS);
      expect(uniqueColors.size).toBe(DEFAULT_TAG_COLORS.length);
    });
  });

  describe('STANDARD_CONTACT_FIELDS', () => {
    it('should have 5 standard fields', () => {
      expect(STANDARD_CONTACT_FIELDS).toHaveLength(5);
    });

    it('should include required fields', () => {
      const fieldValues = STANDARD_CONTACT_FIELDS.map((f) => f.value);
      expect(fieldValues).toContain('first_name');
      expect(fieldValues).toContain('last_name');
      expect(fieldValues).toContain('email');
      expect(fieldValues).toContain('phone');
      expect(fieldValues).toContain('status');
    });

    it('should have labels for all fields', () => {
      STANDARD_CONTACT_FIELDS.forEach((field) => {
        expect(field.label).toBeDefined();
        expect(field.label.length).toBeGreaterThan(0);
      });
    });
  });
});
