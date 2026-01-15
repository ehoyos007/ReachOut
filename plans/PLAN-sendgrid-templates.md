# PLAN: SendGrid Template Integration

> Enable users to select SendGrid dynamic templates, extract variables, map to contacts, preview, and send.

## Objective

Build a feature that allows users to:
1. Select pre-existing SendGrid dynamic templates
2. Automatically detect required Handlebars variables
3. Map variables to contact fields (with auto-suggestions)
4. Preview the rendered email before sending
5. Send to one or more contacts with per-recipient personalization

### Success Criteria (from Acceptance Criteria)

- [ ] Can view list of available SendGrid dynamic templates
- [ ] Selecting a template extracts all Handlebars variables
- [ ] Variables auto-map to contact fields where possible
- [ ] Can manually fill or override any variable value
- [ ] Preview shows rendered email with filled variables
- [ ] Preview indicates missing/unfilled required variables
- [ ] Can toggle preview between desktop and mobile widths
- [ ] Can send to single contact with template
- [ ] Can send to multiple contacts (batch) with per-contact data
- [ ] Send errors display clear, actionable messages
- [ ] Sent emails logged to database with template reference
- [ ] Sent emails appear in Sent Messages Dashboard
- [ ] Template list cached locally with manual refresh option
- [ ] Loading states shown during API calls
- [ ] Empty states handled (no templates, no contacts selected)

---

## Implementation Phases

### Phase 1: Types & SendGrid Service (Features 1-3)

**Goal:** Establish type definitions and API integration for fetching templates.

**Tasks:**
1. Create `src/types/sendgrid.ts` with template-related types
2. Extend `src/lib/sendgrid.ts` with template functions:
   - `listDynamicTemplates()` - GET /templates?generations=dynamic
   - `getTemplateDetails(templateId)` - GET /templates/{id}
3. Create API routes:
   - `src/app/api/sendgrid/templates/route.ts` - List templates
   - `src/app/api/sendgrid/templates/[id]/route.ts` - Get template details

**Files to modify/create:**
- `src/types/sendgrid.ts` (new)
- `src/lib/sendgrid.ts` (extend)
- `src/app/api/sendgrid/templates/route.ts` (new)
- `src/app/api/sendgrid/templates/[id]/route.ts` (new)

---

### Phase 2: Variable Extraction & Auto-Mapping (Feature 4)

**Goal:** Parse template HTML/subject to extract Handlebars variables.

**Tasks:**
1. Create `src/utils/templateParser.ts` with:
   - `extractTemplateVariables(html, subject)` - regex-based extraction
   - `HANDLEBARS_BUILT_INS` - set of helpers to exclude
   - `CONTACT_FIELD_MAPPINGS` - auto-mapping suggestions
   - `getAutoMapping(variableName)` - suggest contact field
2. Handle edge cases: nested paths, block helpers, triple braces

**Files to create:**
- `src/utils/templateParser.ts` (new)

---

### Phase 3: Database Schema & Caching (Partial Feature 1)

**Goal:** Cache templates locally and track email sends.

**Tasks:**
1. Create migration for `email_templates` table (cache)
2. Integrate with existing `messages` table for send logging
   - Add `sendgrid_template_id` column if needed
   - Use existing `template_id` for local template reference
3. Create Supabase functions for template caching

**Database Changes:**
- Migration: `XXX_create_email_templates_table.sql`
- Existing `messages` table already tracks sends adequately

**Note:** The existing `messages` table has `template_id` and can track SendGrid sends. We'll use it rather than creating a separate `email_sends` table.

---

### Phase 4: React Hooks & State Management (Features 2-3)

**Goal:** Create hooks for fetching and managing template data.

**Tasks:**
1. Create `src/hooks/useSendGridTemplates.ts` - list with caching
2. Create `src/hooks/useTemplateDetails.ts` - single template fetch
3. Create `src/hooks/useSendTemplateEmail.ts` - send mutation
4. Optionally create Zustand store for template state

**Files to create:**
- `src/hooks/useSendGridTemplates.ts` (new)
- `src/hooks/useTemplateDetails.ts` (new)
- `src/hooks/useSendTemplateEmail.ts` (new)

---

### Phase 5: UI Components (Features 5-6)

**Goal:** Build the template selection, variable form, and preview UI.

**Tasks:**
1. Create `src/components/email/TemplateSelector.tsx` - dropdown/search
2. Create `src/components/email/TemplateVariableForm.tsx` - dynamic form
3. Create `src/components/email/VariableField.tsx` - single field
4. Create `src/components/email/ContactFieldMapper.tsx` - mapping UI
5. Create `src/components/email/TemplatePreview.tsx` - iframe preview
6. Add desktop/mobile toggle, missing variable highlighting

**Files to create:**
- `src/components/email/TemplateSelector.tsx`
- `src/components/email/TemplateVariableForm.tsx`
- `src/components/email/VariableField.tsx`
- `src/components/email/ContactFieldMapper.tsx`
- `src/components/email/TemplatePreview.tsx`

---

### Phase 6: Send Functionality & Compose Page (Feature 7)

**Goal:** Wire up sending and create the main compose page.

**Tasks:**
1. Create `src/app/api/sendgrid/send/route.ts` - send endpoint
2. Implement single and batch send with personalizations
3. Create `src/app/email/compose/page.tsx` - main composition page
4. Integrate template selection, variable form, preview, and send
5. Log sent emails to `messages` table
6. Integrate template selection into existing `BulkEmailModal.tsx`

**Files to create/modify:**
- `src/app/api/sendgrid/send/route.ts` (new)
- `src/app/email/compose/page.tsx` (new)
- `src/components/contacts/BulkEmailModal.tsx` (modify - add template option)

---

### Phase 7: Error Handling & Polish (Feature 8)

**Goal:** Implement robust error handling and UX polish.

**Tasks:**
1. Create error parser for SendGrid responses
2. Implement retry logic with exponential backoff
3. Add loading states, empty states, error displays
4. Connect to existing Sent Messages Dashboard
5. Test edge cases and fix bugs

**Files to modify:**
- `src/lib/sendgrid.ts` (add error handling)
- Various components (add loading/error states)

---

## Technical Design

### File Structure (New Files)

```
src/
├── types/
│   └── sendgrid.ts                    # Template types (NEW)
│
├── utils/
│   └── templateParser.ts              # Variable extraction (NEW)
│
├── hooks/
│   ├── useSendGridTemplates.ts        # List templates hook (NEW)
│   ├── useTemplateDetails.ts          # Single template hook (NEW)
│   └── useSendTemplateEmail.ts        # Send mutation hook (NEW)
│
├── components/
│   └── email/
│       ├── TemplateSelector.tsx       # Template picker (NEW)
│       ├── TemplateVariableForm.tsx   # Dynamic form (NEW)
│       ├── VariableField.tsx          # Form field (NEW)
│       ├── ContactFieldMapper.tsx     # Variable mapping (NEW)
│       └── TemplatePreview.tsx        # Email preview (NEW)
│
├── app/
│   ├── api/
│   │   └── sendgrid/
│   │       ├── templates/
│   │       │   ├── route.ts           # List templates (NEW)
│   │       │   └── [id]/route.ts      # Get template (NEW)
│   │       └── send/
│   │           └── route.ts           # Send email (NEW)
│   └── email/
│       └── compose/
│           └── page.tsx               # Compose page (NEW)
│
└── lib/
    └── sendgrid.ts                    # Extend with template funcs
```

### Files to Modify

| File | Changes |
|------|---------|
| `src/lib/sendgrid.ts` | Add `listDynamicTemplates()`, `getTemplateDetails()`, `sendTemplateEmail()`, `sendTemplateBatch()`, error handling |
| `src/types/message.ts` | Potentially add `sendgrid_template_id` field |
| `src/lib/supabase.ts` | Add template caching functions |
| `src/components/layout/Sidebar.tsx` | Add navigation link to compose page |

### Database Schema

**New Table: `email_templates` (cache)**
```sql
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sendgrid_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  subject TEXT,
  variables JSONB DEFAULT '[]',
  thumbnail_url TEXT,
  is_active BOOLEAN DEFAULT true,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_templates_sendgrid_id ON email_templates(sendgrid_id);
CREATE INDEX idx_email_templates_active ON email_templates(is_active) WHERE is_active = true;
```

**Existing `messages` table** - already has:
- `template_id` - can reference local templates
- `channel` - 'email'
- `status` - tracking lifecycle
- `contact_id` - recipient reference
- Full logging capabilities

### Key Type Definitions

```typescript
// src/types/sendgrid.ts
export interface SendGridTemplate {
  id: string;
  name: string;
  generation: 'dynamic';
  updated_at: string;
  versions: SendGridTemplateVersion[];
}

export interface SendGridTemplateVersion {
  id: string;
  template_id: string;
  active: 0 | 1;
  name: string;
  subject: string;
  html_content?: string;
  plain_content?: string;
  thumbnail_url?: string;
}

export interface TemplateVariable {
  name: string;
  fullPath: string;
  locations: ('subject' | 'body')[];
  isRequired: boolean;
  suggestedMapping?: string;
}

export interface SendTemplateParams {
  templateId: string;
  to: { email: string; name?: string };
  dynamicData: Record<string, any>;
}
```

---

## Dependencies

### Connection to Contacts System

- Uses existing `Contact` type from `src/types/contact.ts`
- Leverages `getContactDisplayName()` helper
- Auto-mapping uses contact fields: `first_name`, `last_name`, `email`, `phone`, `company` (custom field)
- Batch send iterates over contact array

### Connection to Sent Messages Dashboard

- Sent emails logged to existing `messages` table
- Uses existing `channel: 'email'` and status tracking
- Appears automatically in `/messages/sent` dashboard
- Source field set to `'manual'` or `'bulk'` based on send type

### External Dependencies

- SendGrid API v3 (already configured)
- Existing settings system for API key (`sendgrid_api_key`)
- shadcn/ui components for form elements

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| SendGrid API rate limits | Medium | Medium | Implement caching, batch size limits (1000), delay between batches |
| Complex Handlebars patterns not parsed | Low | Low | Focus on common patterns, document limitations |
| Large templates slow preview rendering | Low | Medium | Use iframe sandboxing, lazy load |
| Template sync gets stale | Medium | Low | Add manual refresh button, show sync timestamp |

---

## Decisions Made

1. **Compose page location:** Standalone `/email/compose` page + integrate into existing `BulkEmailModal`
   - Create dedicated compose page accessible from sidebar
   - Add template selection to existing bulk email flow in contacts

2. **Template caching strategy:** Auto-sync if cache older than 1 hour, plus manual refresh button

3. **Custom field support:** Auto-mapping supports both standard fields AND custom contact fields by name match

---

## Verification Plan

### Manual Testing Steps

1. **Template Listing:**
   - Navigate to compose page
   - Verify templates load from SendGrid
   - Verify caching works (fast reload)
   - Test manual refresh

2. **Variable Extraction:**
   - Select a template with known variables
   - Verify all variables extracted
   - Verify built-ins excluded
   - Test auto-mapping suggestions

3. **Preview:**
   - Fill in variables
   - Verify preview renders correctly
   - Test desktop/mobile toggle
   - Verify missing variable highlighting

4. **Single Send:**
   - Select one contact
   - Fill variables
   - Send email
   - Verify appears in Sent Messages Dashboard
   - Check recipient inbox

5. **Batch Send:**
   - Select multiple contacts
   - Verify per-contact data handling
   - Send batch
   - Verify all logged correctly

6. **Error Handling:**
   - Test with invalid API key
   - Test with unverified sender
   - Verify error messages display

---

**Status:** Ready for Review
**Author:** Claude
**Last Updated:** 2026-01-15
