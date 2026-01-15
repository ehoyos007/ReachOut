# PLAN.md — ReachOut Technical Architecture

> Strategic technical plan for the ReachOut outreach automation platform.

## Objective

**Goal:** Build a self-hosted outreach automation tool that enables multi-step SMS and email campaigns with visual workflow design, contact management, and message tracking.

**Success Criteria:**
- [ ] Import and manage 5k+ contacts with custom fields
- [ ] Create visual workflows with 7 node types
- [ ] Send SMS via Twilio, email via SendGrid
- [ ] Track message delivery and replies
- [ ] Execute workflows over time with scheduling

---

## Background / Context

ReachOut solves the problem of manual, repetitive outreach. Sales reps and founders need to:
1. Import lead lists and enrich with custom data
2. Design multi-step sequences (email → wait → SMS → branch)
3. Personalize messages with contact data
4. Stop sequences when contacts reply
5. Track all communication in one place

The existing project has Phase 1-2 complete: Next.js foundation and visual workflow builder using React Flow.

---

## Requirements

### Functional Requirements
- CSV import with column mapping
- CRUD for contacts, tags, custom fields
- CRUD for SMS and email templates with placeholders
- Visual workflow builder (DONE)
- Workflow execution engine with scheduling
- Twilio SMS integration (send/receive)
- SendGrid email integration (send/receive)
- Message history per contact
- Notifications for inbound messages

### Non-Functional Requirements
- Support 5k+ contacts per batch
- Page loads under 3 seconds
- Idempotent message sending
- Encrypted credential storage
- Single-user (no auth required for v1)

---

## Constraints

- **Solo developer** — prioritize simplicity over enterprise features
- **Self-hosted** — user brings their own Twilio/SendGrid accounts
- **No external workflow engine** — build lightweight scheduler (n8n considered but adds complexity)
- **Supabase PostgreSQL** — already configured, use for all persistence

---

## Tech Stack

### Chosen Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Frontend** | Next.js 14 (App Router) | React + SSR, excellent DX |
| **Language** | TypeScript | Type safety across stack |
| **Styling** | Tailwind CSS + shadcn/ui | Rapid UI development |
| **Workflow Canvas** | React Flow (@xyflow/react) | Mature drag-drop canvas |
| **State Management** | Zustand | Lightweight, less boilerplate than Redux |
| **Database** | Supabase (PostgreSQL) | Hosted DB + real-time + future auth |
| **SMS Provider** | Twilio | Industry standard, reliable |
| **Email Provider** | SendGrid | Reliable, good inbound parsing |
| **Hosting** | Vercel | Optimized for Next.js |

### Why Not n8n?

Initially considered n8n for workflow execution, but:
- Adds deployment complexity (separate service)
- Overkill for single-purpose automation
- Custom engine gives full control over execution model
- Supabase + cron/serverless can handle scheduling

---

## Database Schema Design

### Core Tables

```sql
-- Contacts
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  status TEXT DEFAULT 'new', -- new, contacted, responded, qualified, disqualified
  do_not_contact BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(email),
  UNIQUE(phone)
);

-- Custom Field Definitions
CREATE TABLE contact_custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  field_type TEXT NOT NULL, -- text, number, date, select
  options JSONB, -- for select type
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Custom Field Values
CREATE TABLE contact_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  field_id UUID REFERENCES contact_custom_fields(id) ON DELETE CASCADE,
  value TEXT,
  UNIQUE(contact_id, field_id)
);

-- Tags
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Contact-Tag Junction
CREATE TABLE contact_tags (
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (contact_id, tag_id)
);

-- Message Templates
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  channel TEXT NOT NULL, -- sms, email
  subject TEXT, -- email only
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Messages (sent and received)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  channel TEXT NOT NULL, -- sms, email
  direction TEXT NOT NULL, -- inbound, outbound
  subject TEXT, -- email only
  body TEXT NOT NULL,
  status TEXT DEFAULT 'queued', -- queued, sent, delivered, failed
  provider_id TEXT, -- Twilio SID or SendGrid message ID
  workflow_execution_id UUID, -- optional link to workflow
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Workflow Enrollments
CREATE TABLE workflow_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active', -- active, completed, stopped, failed
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(workflow_id, contact_id)
);

-- Workflow Execution State
CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID REFERENCES workflow_enrollments(id) ON DELETE CASCADE,
  current_node_id TEXT NOT NULL,
  status TEXT DEFAULT 'waiting', -- waiting, processing, completed, failed
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- App Settings (credentials)
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL, -- encrypted
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- inbound_sms, inbound_email
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Indexes

```sql
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_phone ON contacts(phone);
CREATE INDEX idx_contacts_status ON contacts(status);
CREATE INDEX idx_messages_contact_id ON messages(contact_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_workflow_executions_next_run ON workflow_executions(next_run_at)
  WHERE status = 'waiting';
CREATE INDEX idx_notifications_unread ON notifications(is_read, created_at DESC)
  WHERE is_read = false;
```

---

## Workflow Execution Engine Architecture

### Design Approach

**Option A: Polling-based Scheduler (Recommended)**
- Vercel Cron or external cron hits `/api/cron/process-workflows`
- Query `workflow_executions` where `next_run_at <= now()` and `status = 'waiting'`
- Process each execution, update state, schedule next step

**Option B: Edge Function per Execution**
- Schedule individual Vercel serverless functions per execution
- More precise timing but higher complexity

**Recommendation:** Option A is simpler and sufficient for 5k contacts.

### Execution Flow

```
1. Enrollment
   - Create workflow_enrollments record
   - Create initial workflow_executions at trigger_start node
   - Set next_run_at = now()

2. Cron Job (every minute)
   - SELECT * FROM workflow_executions
     WHERE next_run_at <= now() AND status = 'waiting'
     LIMIT 100

3. Process Each Execution
   - Load workflow definition (nodes, edges)
   - Get current node from current_node_id
   - Execute node logic:

     trigger_start: Move to next node immediately
     time_delay: Set next_run_at = now() + delay duration
     conditional_split: Evaluate condition, pick Yes/No edge
     send_sms: Call Twilio, create message record, move to next
     send_email: Call SendGrid, create message record, move to next
     update_status: Update contact.status, move to next
     stop_on_reply: Check for inbound messages, exit if found

4. Update State
   - Update current_node_id to next node
   - Update next_run_at based on node type
   - If no next node, mark enrollment completed
```

### Node Processing Logic

```typescript
interface NodeProcessor {
  execute(
    node: WorkflowNode,
    contact: Contact,
    execution: WorkflowExecution
  ): Promise<{
    nextNodeId: string | null;
    nextRunAt: Date | null;
  }>;
}

// Example: TimeDelayProcessor
class TimeDelayProcessor implements NodeProcessor {
  async execute(node, contact, execution) {
    const { duration, unit } = node.data;
    const delayMs = convertToMs(duration, unit);
    return {
      nextNodeId: getNextNodeId(node),
      nextRunAt: new Date(Date.now() + delayMs)
    };
  }
}
```

---

## Visual Workflow Builder

### Implementation (Completed)

Using React Flow (@xyflow/react) with:
- Custom node components for each node type
- Configuration panels that update node data
- Zustand store for workflow state
- Persistence to Supabase

### Why React Flow over Custom Canvas

| Factor | React Flow | Custom Canvas |
|--------|------------|---------------|
| Development time | Days | Weeks |
| Drag-drop | Built-in | Build from scratch |
| Zoom/pan | Built-in | Build from scratch |
| Node selection | Built-in | Build from scratch |
| Edge routing | Built-in | Complex algorithms |
| Accessibility | Handled | Manual work |

React Flow was the clear choice for rapid development.

---

## API Routes Structure

```
/api
  /contacts
    GET    / - List contacts (with pagination, filters)
    POST   / - Create contact
    GET    /[id] - Get single contact
    PUT    /[id] - Update contact
    DELETE /[id] - Delete contact
    POST   /import - CSV import

  /templates
    GET    / - List templates
    POST   / - Create template
    GET    /[id] - Get template
    PUT    /[id] - Update template
    DELETE /[id] - Delete template

  /messages
    GET    /contact/[id] - Get messages for contact
    POST   /send - Send manual message

  /workflows
    (already implemented)
    POST   /[id]/enroll - Enroll contacts

  /settings
    GET    / - Get settings (masked)
    PUT    / - Update settings
    POST   /test-twilio - Test Twilio config
    POST   /test-sendgrid - Test SendGrid config

  /webhooks
    POST   /twilio/inbound - Inbound SMS
    POST   /twilio/status - Delivery status
    POST   /sendgrid/inbound - Inbound email
    POST   /sendgrid/events - Email events

  /cron
    POST   /process-workflows - Workflow scheduler
```

---

## Implementation Phases

### Phase 3: Contact Management
1. Database migrations for contact tables
2. TypeScript types and Zustand store
3. Contacts list page with DataTable
4. Contact detail page
5. CSV import with Papa Parse
6. Custom fields CRUD
7. Tags CRUD

### Phase 4: Message Templates
1. Database migration for templates
2. Types and store
3. Templates list page
4. Template editor with placeholder UI
5. Preview with sample data

### Phase 5: Messaging
1. Database migration for messages
2. Twilio service module
3. SendGrid service module
4. Webhook endpoints
5. Message thread UI
6. Manual send from contact page

### Phase 6: Settings
1. Database migration for settings
2. Settings page UI
3. Credential storage (consider encryption)
4. Test functions

### Phase 7: Notifications
1. Database migration
2. Notification creation on inbound
3. Notifications panel UI

### Phase 8: Workflow Execution
1. Database migrations for enrollments/executions
2. Node processor implementations
3. Cron endpoint
4. Enrollment UI
5. Stop-on-reply logic

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Duplicate messages | Medium | High | Idempotency keys, check before send |
| Webhook failures | Medium | Medium | Retry logic, dead letter logging |
| Rate limits (Twilio/SG) | Low | Medium | Batch processing with delays |
| Large CSV imports | Medium | Low | Stream processing, progress indicator |
| Credential exposure | Low | High | Never log, mask in UI, encrypt at rest |

---

## Open Questions

- [ ] Should credentials be encrypted in Supabase or use Vault?
- [ ] What's the cron interval (1 min vs 5 min)?
- [ ] How to handle timezone for time delays?
- [ ] Max contacts per workflow enrollment batch?

---

## References

- [Twilio SMS API](https://www.twilio.com/docs/sms/api)
- [SendGrid Mail Send](https://docs.sendgrid.com/api-reference/mail-send/mail-send)
- [SendGrid Inbound Parse](https://docs.sendgrid.com/for-developers/parsing-email/setting-up-the-inbound-parse-webhook)
- [React Flow Docs](https://reactflow.dev/docs/introduction)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)

---

**Status:** Approved (Phases 1-2 Complete)
**Author:** Enzo Hoyos
**Last Updated:** January 14, 2026

---

# Feature Plan: Bulk Tag Assignment in Contact Import Wizard

> Enable bulk tag assignment during CSV import for automatic contact categorization.

## Objective

**Goal:** Allow users to bulk assign tags to contacts during the CSV import process, enabling automatic categorization without manual post-processing.

**Success Criteria:**
- [ ] Users can select multiple existing tags during import
- [ ] Users can create new tags inline if needed
- [ ] Selected tags display clearly before import confirmation
- [ ] All imported contacts receive the selected tags
- [ ] (Optional) Conditional tagging based on column values

## Background

The import wizard currently supports:
- CSV upload with drag-and-drop
- Auto-column detection and manual mapping
- Row validation and preview
- Progress tracking during import
- Error reporting with row details

**Key insight:** The `createContact()` function already accepts a `tags?: string[]` parameter—this is primarily a UI feature.

## Requirements

### Functional
- Select multiple tags from existing tags list
- Create new tags inline (name + color) without leaving wizard
- Display selected tags with remove capability
- Show impact preview ("Apply 3 tags to 250 contacts")
- Apply tags to all successfully imported contacts
- (Phase 2) Conditional tagging based on column values

### Non-Functional
- Smooth UX that doesn't disrupt existing wizard flow
- Fast tag search/filter for large tag lists
- Consistent styling with existing tag management UI

## Proposed Approach: Section in Mapping Step ⭐

Add a "Tags to Apply" collapsible section at the bottom of the Mapping step (step 2). Users configure column mappings and tag assignments in one place before previewing.

**Pros:**
- No new wizard steps required
- Natural workflow: "What fields? What tags?"
- Keeps import wizard streamlined

## Technical Design

### Component Changes

#### Import Wizard (`src/app/contacts/import/page.tsx`)

**New State:**
```typescript
const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
const [showCreateTag, setShowCreateTag] = useState(false);
const [newTagName, setNewTagName] = useState("");
const [newTagColor, setNewTagColor] = useState("#6366f1");
```

**Modified Import Logic:**
```typescript
// In executeImport(), pass tags to each contact
const contactInput: CreateContactInput = {
  // ... existing fields
  tags: selectedTagIds, // Add this
};
```

### No Database Changes Required

Existing schema fully supports this:
- `createContact()` already accepts `tags?: string[]`
- Junction table `contact_tags` handles relationships

## Implementation Phases

### Phase 1: Basic Bulk Tagging (MVP)

| Task | Description | Effort |
|------|-------------|--------|
| 1.1 | Add `selectedTagIds` state, fetch tags on mount | Small |
| 1.2 | Create searchable multi-select tag dropdown | Medium |
| 1.3 | Add inline tag creation (name + color picker) | Medium |
| 1.4 | Update Preview step to show tags summary | Small |
| 1.5 | Pass tags to `createContact()` during import | Small |
| 1.6 | Testing & polish | Medium |

### Phase 2: Conditional Tagging (Enhancement)

| Task | Description | Effort |
|------|-------------|--------|
| 2.1 | Rule builder: "If [column] [operator] [value], apply [tag]" | Large |
| 2.2 | Evaluate rules per row, merge with bulk tags | Medium |
| 2.3 | Preview which rules apply to which contacts | Medium |

## File Changes

| File | Changes |
|------|---------|
| `src/app/contacts/import/page.tsx` | Add tag state, selector UI, modify import logic |
| `src/types/contact.ts` | (Optional) Add `ConditionalTagRule` type for Phase 2 |

---

**Feature Status:** Planning
**Last Updated:** January 14, 2026
