# TASKS.md

## Current Sprint/Focus
**Phase 3: Contact Management**
Building the contact system foundation that workflows will operate on.

---

## In Progress
*No tasks currently in progress*

---

## To Do

### High Priority (Phase 3: Contact Management)

- [ ] **Database: Create contacts table**
  - Description: Core contacts table with standard fields (first_name, last_name, phone, email, status, do_not_contact)
  - Branch: `feature/contacts-db`
  - Blockers: None

- [ ] **Database: Create custom fields tables**
  - Description: `contact_custom_fields` (definitions) and `contact_field_values` (per-contact values)
  - Branch: `feature/contacts-db`
  - Blockers: Contacts table

- [ ] **Database: Create tags tables**
  - Description: `tags` and `contact_tags` junction table
  - Branch: `feature/contacts-db`
  - Blockers: Contacts table

- [ ] **Types & Store: Contact management**
  - Description: TypeScript types and Zustand store for contacts, custom fields, tags
  - Branch: `feature/contacts-store`
  - Blockers: Database tables

- [ ] **UI: Contacts list page**
  - Description: List view with search, filter, pagination, bulk select
  - Branch: `feature/contacts-ui`
  - Blockers: Store

- [ ] **UI: Contact detail page**
  - Description: View/edit contact with custom fields, tags, status
  - Branch: `feature/contacts-ui`
  - Blockers: Contacts list

- [ ] **Feature: CSV import**
  - Description: Upload, parse, column mapping, validation, import
  - Branch: `feature/csv-import`
  - Blockers: Contact detail page

- [ ] **UI: Custom fields management**
  - Description: CRUD for custom field definitions
  - Branch: `feature/custom-fields`
  - Blockers: Store

- [ ] **UI: Tags management**
  - Description: CRUD for tags with color picker
  - Branch: `feature/tags`
  - Blockers: Store

### Medium Priority (Phase 4: Message Templates)

- [ ] **Database: Create templates table**
  - Description: Templates with name, channel, subject, body fields
  - Blockers: None

- [ ] **Types & Store: Template management**
  - Description: TypeScript types and Zustand store for templates
  - Blockers: Templates table

- [ ] **UI: Templates list page**
  - Description: List with channel filter and search
  - Blockers: Store

- [ ] **UI: Template editor**
  - Description: Create/edit form with placeholder insertion
  - Blockers: Templates list

- [ ] **Feature: Template preview**
  - Description: Preview with sample contact, validate placeholders
  - Blockers: Template editor, contacts

### Medium Priority (Phase 5: Messaging)

- [ ] **Database: Create messages table**
  - Description: Messages with contact_id, channel, direction, body, status
  - Blockers: Contacts table

- [ ] **Integration: Twilio SMS sending**
  - Description: Service module to send SMS via Twilio API
  - Blockers: Settings configuration

- [ ] **Integration: Twilio webhooks**
  - Description: Inbound SMS + delivery status callbacks
  - Blockers: SMS sending

- [ ] **Integration: SendGrid email sending**
  - Description: Service module to send email via SendGrid API
  - Blockers: Settings configuration

- [ ] **Integration: SendGrid webhooks**
  - Description: Inbound Parse + event webhooks
  - Blockers: Email sending

- [ ] **UI: Contact message thread**
  - Description: Chat-style thread in contact detail page
  - Blockers: Messages table, integrations

- [ ] **Feature: Manual message sending**
  - Description: Send single SMS/email from contact page
  - Blockers: Message thread

### Medium Priority (Phase 6: Settings)

- [ ] **Database: Create settings table**
  - Description: Encrypted storage for API credentials
  - Blockers: None

- [ ] **UI: Settings page**
  - Description: Tabbed interface for Twilio/SendGrid config
  - Blockers: Settings table

- [ ] **Feature: Twilio test function**
  - Description: Send test SMS and display result
  - Blockers: Settings page

- [ ] **Feature: SendGrid test function**
  - Description: Send test email and display result
  - Blockers: Settings page

### Lower Priority (Phase 7: Notifications)

- [ ] **Database: Create notifications table**
  - Description: Notifications with contact_id, type, read status
  - Blockers: Messages table

- [ ] **Types & Store: Notification management**
  - Description: TypeScript types and Zustand store
  - Blockers: Notifications table

- [ ] **UI: Notifications panel**
  - Description: Dropdown with unread items, click to navigate
  - Blockers: Store

### Lower Priority (Phase 8: Workflow Execution)

- [ ] **Database: Create enrollment tables**
  - Description: `workflow_enrollments` and `workflow_executions`
  - Blockers: Workflows + Contacts

- [ ] **Feature: Contact enrollment**
  - Description: Enroll single/bulk contacts in workflow
  - Blockers: Enrollment tables

- [ ] **Engine: Workflow executor**
  - Description: Process each node type, handle scheduling
  - Blockers: All messaging integrations

- [ ] **Engine: Scheduled job runner**
  - Description: Process due workflow steps on interval
  - Blockers: Executor

- [ ] **Feature: Stop on reply**
  - Description: Exit workflow when contact replies
  - Blockers: Inbound message handling

### Backlog (Phase 9: Polish)

- [ ] **UI: App shell/navigation**
  - Description: Sidebar, header, breadcrumbs
  - Blockers: None

- [ ] **UI: Dashboard**
  - Description: Stats, recent activity, quick actions
  - Blockers: Data to display

- [ ] **UX: Loading states**
  - Description: Skeletons, spinners, transitions
  - Blockers: None

- [ ] **UX: Empty states**
  - Description: Helpful empty state illustrations/text
  - Blockers: None

- [ ] **UX: Error handling**
  - Description: Toast notifications, error boundaries
  - Blockers: None

---

## Done

### Phase 1: Project Foundation (Completed Jan 14, 2026)
- [x] Initialize Next.js 14 project with TypeScript
- [x] Configure Tailwind CSS + shadcn/ui
- [x] Install React Flow, Zustand, Supabase client
- [x] Set up project folder structure
- [x] Create Supabase project and initial tables

### Phase 2: Visual Workflow Builder (Completed Jan 14, 2026)
- [x] Define workflow TypeScript types
- [x] Create Zustand workflow store with CRUD
- [x] Build WorkflowCanvas with React Flow
- [x] Implement all 7 custom node components
- [x] Create NodePalette sidebar with drag-to-canvas
- [x] Build configuration panels for each node type
- [x] Implement workflow persistence to Supabase
- [x] Create workflows list page with CRUD operations

---

## Known Issues

| Issue | Description | Workaround |
|-------|-------------|------------|
| No auth | Single-user mode only | Use locally or add auth layer |
| Env-based credentials | Twilio/SendGrid in .env only | Settings page will fix |

---

## Ideas / Future Enhancements

- [ ] Multi-user authentication (Supabase Auth)
- [ ] Role-based permissions
- [ ] Workflow analytics dashboard
- [ ] A/B testing for message variants
- [ ] Rich HTML email editor
- [ ] MMS / email attachments
- [ ] Webhook integrations for external triggers
- [ ] Public API for programmatic access
- [ ] Import from Google Sheets
- [ ] Unsubscribe link management
- [ ] Rate limiting across workflows

---

## Notes

**Next Priority:** Phase 3 (Contact Management) is the critical path. Workflows need contacts to operate on.

**Dependencies:**
- Phase 5 (Messaging) requires Phase 6 (Settings) for credentials
- Phase 8 (Execution) requires Phases 3, 4, 5, 6

---

**Last Updated:** January 14, 2026
