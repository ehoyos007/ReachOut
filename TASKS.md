# TASKS.md

## Current Sprint/Focus
**Phase 5: Messaging**
Building the messaging integrations (Twilio, SendGrid) for SMS and Email.

---

## In Progress
*No tasks currently in progress*

---

## To Do

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

### Phase 3: Contact Management - Core (Completed Jan 14, 2026)
- [x] Database: Create contacts table
- [x] Database: Create custom fields tables
- [x] Database: Create tags tables
- [x] Types & Store: Contact management (types, Zustand store)
- [x] UI: Contacts list page with search, filters, pagination
- [x] UI: Bulk selection and delete
- [x] UI: Create contact dialog
- [x] UI: App navigation and home page

### Testing Infrastructure (Completed Jan 14, 2026)
- [x] Set up Jest + React Testing Library for Next.js
- [x] Write tests for workflowStore (31 tests)
- [x] Write tests for contactStore (31 tests)
- [x] Write tests for workflow helpers (28 tests)
- [x] Write tests for contact helpers (30 tests)
- [x] Write tests for Home page component (10 tests)
- [x] Set up GitHub Actions CI workflow (lint, test, build, typecheck)
- [x] Total: 130 tests passing

### Contact Detail Page (Completed Jan 14, 2026)
- [x] UI: Contact detail page with view/edit modes
- [x] Contact info section (name, email, phone, status)
- [x] Tags management (view, add, remove)
- [x] Custom fields display and editing
- [x] Do not contact toggle
- [x] Delete contact functionality
- [x] Message history placeholder (for Phase 5)

### CSV Import (Completed Jan 14, 2026)
- [x] Install papaparse for CSV parsing
- [x] CSV file upload with drag-and-drop
- [x] Automatic column detection and header parsing
- [x] Smart auto-mapping of common column names
- [x] Manual column-to-field mapping UI
- [x] Import preview with validation
- [x] Bulk import with progress indicator
- [x] Import results summary with error details
- [x] Import button added to contacts list page

### Custom Fields Management (Completed Jan 14, 2026)
- [x] Custom fields management page at `/contacts/fields`
- [x] List all custom fields with type icons
- [x] Create new field dialog (name, type, options, required)
- [x] Edit existing field dialog
- [x] Delete field with confirmation
- [x] Select field options management (add/remove)
- [x] Field type guide with descriptions
- [x] Settings dropdown in contacts header

### Tags Management (Completed Jan 14, 2026)
- [x] Tags management page at `/contacts/tags`
- [x] Tag list with color indicators
- [x] Create tag dialog with color picker
- [x] Edit tag dialog
- [x] Delete tag with confirmation
- [x] 14-color palette for tag colors
- [x] Live tag preview in dialog
- [x] Usage tips for organizing contacts

### Phase 4: Message Templates (Completed Jan 14, 2026)
- [x] Database: Create templates table migration
- [x] Types & Store: Template management (TypeScript types, Zustand store)
- [x] UI: Templates list page with search and channel filter
- [x] UI: Template editor with create/edit/duplicate
- [x] Feature: Placeholder insertion ({{first_name}}, {{last_name}}, etc.)
- [x] Feature: Template preview with sample contact data
- [x] Feature: SMS segment calculator (GSM vs Unicode detection)
- [x] Updated home page navigation with Templates link

---

## Phase 3: Contact Management - COMPLETE
## Phase 4: Message Templates - COMPLETE

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

**Current Priority:** Phase 5 (Messaging) - Twilio and SendGrid integrations.

**Dependencies:**
- Phase 5 (Messaging) requires Phase 6 (Settings) for credentials
- Phase 8 (Execution) requires Phases 3, 4, 5, 6

---

**Last Updated:** January 14, 2026
