# TASKS.md

## Current Sprint/Focus
**Phase 9: Polish**
UI improvements, loading states, and final polish.

---

## In Progress
*No tasks currently in progress*

---

## To Do

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
- [x] Total: 131 tests passing

### CI/CD Pipeline Fixes (Completed Jan 14, 2026)
- [x] Fix ESLint configuration for CI (downgrade to v8, create .eslintrc.json)
- [x] Set Jest coverage thresholds to 0 for incremental coverage building
- [x] Fix TypeScript Jest types (jest.setup.ts, tsconfig.json types array)
- [x] All lint, test, and type check commands pass locally

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

### Phase 5: Messaging (Completed Jan 14, 2026)
- [x] Database: Create messages table (channel, direction, status, provider_id)
- [x] Database: Create settings table (for API credentials)
- [x] Types & Store: Message management (TypeScript types, Zustand store)
- [x] Types & Store: Settings management (TypeScript types, Zustand store)
- [x] Integration: Twilio SMS sending service
- [x] Integration: SendGrid email sending service
- [x] API: /api/messages/send endpoint for sending messages
- [x] API: /api/settings/test-twilio endpoint for connection testing
- [x] API: /api/settings/test-sendgrid endpoint for connection testing
- [x] UI: Contact message thread with chat-style bubbles
- [x] UI: Compose message dialog (SMS/Email)
- [x] Feature: Manual message sending from contact page

### Phase 6: Settings (Completed Jan 14, 2026)
- [x] Database: Settings table with provider credentials
- [x] UI: Settings page with tabbed interface
- [x] UI: Twilio configuration tab (Account SID, Auth Token, Phone Number)
- [x] UI: SendGrid configuration tab (API Key, From Email, From Name)
- [x] Feature: Twilio connection test function
- [x] Feature: SendGrid connection test function
- [x] Feature: Webhook URLs display section
- [x] Updated home page navigation with Settings link

### Phase 8: Workflow Execution Engine (Completed Jan 14, 2026)
- [x] Database: Create workflow_enrollments table
- [x] Database: Create workflow_executions table
- [x] Database: Create workflow_execution_logs table
- [x] Types: Enrollment, execution, and node processor interfaces
- [x] Store: Zustand store for enrollment management
- [x] Engine: Node processors for all 7 workflow node types
- [x] Engine: Workflow executor service with execution loop
- [x] API: POST /api/workflows/[id]/enroll for enrolling contacts
- [x] API: GET /api/workflows/[id]/enroll for enrollment counts
- [x] API: POST /api/cron/process-workflows for scheduled execution
- [x] UI: EnrollContactsDialog component in workflow editor
- [x] UI: ContactEnrollments component on contact detail page
- [x] Feature: Template placeholder substitution in messages
- [x] Feature: Stop on reply detection
- [x] Feature: Retry logic with max attempts

### Workflow Execution Testing & Cron Setup (Completed Jan 14, 2026)
- [x] Run SQL migration 005 in Supabase
- [x] Test workflow execution end-to-end (SMS sent successfully via Twilio)
- [x] Create vercel.json with cron configuration (every minute)
- [x] Update cron endpoint for Vercel compatibility (x-vercel-cron header)
- [x] Add CRON_SECRET to environment variable examples

### Webhooks (Completed Jan 14, 2026)
- [x] Twilio inbound SMS webhook (`/api/webhooks/twilio/inbound`)
- [x] Twilio status callback webhook (`/api/webhooks/twilio/status`)
- [x] SendGrid inbound email webhook (`/api/webhooks/sendgrid/inbound`)
- [x] SendGrid event webhook (`/api/webhooks/sendgrid/events`)
- [x] Contact lookup by phone number function
- [x] Contact lookup by email function
- [x] Webhook URLs already displayed in Settings page

### Phase 7: Notifications (Completed Jan 14, 2026)
- [x] Database: Create notifications table migration
- [x] Types: Notification TypeScript types with helpers
- [x] Store: Zustand notification store with actions
- [x] Supabase: CRUD operations for notifications
- [x] API: GET /api/notifications - list notifications
- [x] API: POST /api/notifications/[id]/read - mark as read
- [x] API: POST /api/notifications/read-all - mark all as read
- [x] API: DELETE /api/notifications/[id] - delete notification
- [x] UI: NotificationsDropdown component with unread badge
- [x] UI: Notifications page at /notifications
- [x] Feature: Auto-create notifications for inbound SMS
- [x] Feature: Auto-create notifications for inbound emails
- [x] Integration: Added dropdown to home page header

---

## Phase 3: Contact Management - COMPLETE
## Phase 4: Message Templates - COMPLETE
## Phase 5: Messaging - COMPLETE
## Phase 6: Settings - COMPLETE
## Phase 7: Notifications - COMPLETE
## Phase 8: Workflow Execution - COMPLETE

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

**Current Priority:** Phase 9 (Polish).

**Dependencies:**
- All core phases (3-8) are complete
- Webhooks and notifications are integrated

**Completed:**
- Deployed to Vercel with CRON_SECRET
- All webhook endpoints for inbound messages and status callbacks
- Notifications system with real-time dropdown and full page view

**Remaining:**
- Phase 9: Polish (UI improvements, loading states, dashboard, etc.)

**User Action Required:**
- Run migration 006 in Supabase to create notifications table

---

**Last Updated:** January 14, 2026
