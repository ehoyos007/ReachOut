# CONTEXT.md

> Extended context and background information for ReachOut.

## Domain Knowledge

### Terminology / Glossary

| Term | Definition |
|------|------------|
| **Workflow** | An automated sequence of actions (nodes) that execute over time for enrolled contacts |
| **Node** | A single step in a workflow (e.g., send SMS, wait, branch) |
| **Edge** | A connection between two nodes defining the flow path |
| **Enrollment** | The act of adding a contact to a workflow, starting their journey through it |
| **Execution** | The runtime state of a contact progressing through a workflow |
| **Placeholder** | Dynamic variable in templates using `{{field_name}}` syntax, resolved per-contact |
| **Template** | A reusable message (SMS or email) with placeholders for personalization |
| **Contact** | A person record with standard fields (name, phone, email) and custom fields |
| **Custom Field** | User-defined data field that can be assigned to any contact |
| **Tag** | A label used to categorize and filter contacts (e.g., "High Intent", "Webinar Attendee") |
| **Inbound Message** | A reply received from a contact via SMS or email |
| **Outbound Message** | A message sent to a contact via SMS or email |
| **Channel** | The communication medium: SMS or Email |
| **Conditional Split** | A workflow node that branches based on contact properties or message history |
| **Time Delay** | A workflow node that pauses execution for a specified duration |
| **Stop on Reply** | A workflow behavior that exits a contact when they respond |

### Business Rules

- **Enrollment Rules:**
  - A contact can be enrolled in multiple workflows simultaneously
  - No global conflict resolution between workflows in v1
  - Track per-contact workflow progress (current node, next scheduled run)

- **Message Sending:**
  - Messages must be idempotent to prevent duplicate sends
  - Store delivery status for every outbound message
  - Match inbound replies to the correct contact thread

- **Contact Status Values:**
  - `new` - Newly imported contact
  - `contacted` - First message has been sent
  - `responded` - Contact has replied
  - `qualified` - Marked as a qualified lead
  - `disqualified` - Not a fit / do not contact

- **Placeholder Resolution:**
  - Placeholders must exist as contact fields (standard or custom)
  - Validation warns when templates reference undefined placeholders
  - Resolution happens at send time with current contact data

- **Compliance:**
  - Support "Do Not Contact" flag to exclude contacts from workflows
  - Respect STOP replies for SMS (opt-out)
  - Unsubscribe handling for email (future version)

### Workflow Node Types

| Node Type | Description | Inputs | Outputs |
|-----------|-------------|--------|---------|
| `trigger_start` | Entry point for workflow | 0 | 1 |
| `time_delay` | Wait specified duration (hours, days) | 1 | 1 |
| `conditional_split` | Branch based on condition | 1 | 2 (Yes/No) |
| `send_sms` | Send SMS using template | 1 | 1 |
| `send_email` | Send email using template | 1 | 1 |
| `update_status` | Update contact status field | 1 | 1 |
| `stop_on_reply` | Exit workflow if contact replied | 1 | 0 |

---

## System Context

### External Services / Integrations

| Service | Purpose | Documentation |
|---------|---------|---------------|
| **Twilio** | SMS sending and receiving | https://www.twilio.com/docs/sms |
| **SendGrid** | Email sending and receiving | https://docs.sendgrid.com/ |
| **Supabase** | PostgreSQL database + auth | https://supabase.com/docs |

### Twilio Integration Details
- **Outbound SMS:** Use Twilio Messages API to send
- **Inbound SMS:** Configure webhook URL in Twilio console for incoming messages
- **Delivery Status:** Configure status callback URL for delivery receipts
- **Required Config:** Account SID, Auth Token, Phone Number(s)

### SendGrid Integration Details
- **Outbound Email:** Use SendGrid Mail Send API
- **Inbound Email:** Configure Inbound Parse webhook for replies
- **Event Webhooks:** Delivery, open, click tracking (future)
- **Required Config:** API Key, From Email address

### Environment Variables

| Variable | Description | Example Format |
|----------|-------------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJ...` |
| `TWILIO_ACCOUNT_SID` | Twilio account identifier | `ACxxxxx` |
| `TWILIO_AUTH_TOKEN` | Twilio authentication token | (secret) |
| `TWILIO_PHONE_NUMBER` | Default SMS sender number | `+1234567890` |
| `SENDGRID_API_KEY` | SendGrid API key | `SG.xxxxx` |
| `SENDGRID_FROM_EMAIL` | Default email sender | `user@domain.com` |

> **Note:** Never commit actual credentials. Store in `.env.local` (git-ignored).

### Credentials Storage
- Twilio and SendGrid credentials stored in Supabase `settings` table
- Encrypted at rest using Supabase Vault or application-level encryption
- Settings page allows updating without code changes

---

## Data Context

### Key Data Entities

**Contact**
- Purpose: Represents a person to communicate with
- Key fields: `id`, `first_name`, `last_name`, `phone`, `email`, `status`, `do_not_contact`
- Relationships: Has many custom field values, has many tags, has many messages

**Template**
- Purpose: Reusable message content with placeholders
- Key fields: `id`, `name`, `channel` (sms/email), `subject` (email only), `body`
- Relationships: Referenced by workflow nodes

**Workflow**
- Purpose: Defines an automation sequence
- Key fields: `id`, `name`, `description`, `is_enabled`, `created_at`
- Relationships: Has many nodes, has many edges, has many enrollments

**Workflow Node**
- Purpose: Single step in a workflow
- Key fields: `id`, `workflow_id`, `type`, `position`, `data` (JSON config)
- Relationships: Belongs to workflow, connected via edges

**Message**
- Purpose: Record of sent/received communication
- Key fields: `id`, `contact_id`, `channel`, `direction`, `body`, `status`, `sent_at`
- Relationships: Belongs to contact, optionally belongs to workflow execution

**Workflow Enrollment**
- Purpose: Tracks a contact's participation in a workflow
- Key fields: `id`, `workflow_id`, `contact_id`, `status`, `enrolled_at`
- Relationships: Belongs to workflow, belongs to contact

**Workflow Execution**
- Purpose: Tracks progress through workflow nodes
- Key fields: `id`, `enrollment_id`, `current_node_id`, `next_run_at`, `status`
- Relationships: Belongs to enrollment

---

## Historical Context

### Why Decisions Were Made

**React Flow for Workflow Builder:**
> Provides a mature, feature-rich canvas with drag-and-drop, zoom/pan, and custom nodes out of the box. Alternatives like building custom SVG/Canvas would require significant effort.

**Supabase for Database:**
> Combines PostgreSQL with real-time subscriptions, auth, and storage. Row Level Security enables future multi-tenant support. Simpler than managing separate database + API.

**Zustand for State Management:**
> Lightweight alternative to Redux with simpler boilerplate. Workflow builder state is complex enough to warrant a store, but not so complex as to need Redux's middleware ecosystem.

**Twilio + SendGrid (not alternatives):**
> Industry standard APIs with reliable delivery, clear documentation, and reasonable pricing. User brings their own accounts for cost control and compliance.

### Known Technical Debt

| Item | Description | Priority |
|------|-------------|----------|
| No authentication | Single-user mode only; auth deferred | Medium |
| Credential storage | Currently using env vars; needs secure DB storage | High |
| No rate limiting | Could overwhelm Twilio/SendGrid on bulk sends | Medium |
| Basic deduplication | Only exact email/phone match on import | Low |

---

## User Context

### User Types / Personas

**Solo Founder / Sales Rep (Primary):**
- Who they are: Founder or salesperson doing cold outreach
- What they need: Quick campaign setup, bulk contact import, multi-step sequences
- Pain points: Manual follow-ups, forgetting to send, lack of personalization

**Customer Success Manager:**
- Who they are: CSM running lifecycle communications
- What they need: Re-engagement sequences, reply detection, status tracking
- Pain points: Tracking who replied, stopping campaigns for responders

### User Flows

**Initial Setup:**
1. User navigates to Settings
2. Configures Twilio credentials and tests SMS
3. Configures SendGrid credentials and tests email
4. System validates and stores credentials

**Import & Prepare Contacts:**
1. User uploads CSV file
2. Maps columns to standard/custom fields
3. Assigns tags for categorization
4. System validates and creates contacts

**Build a Workflow:**
1. User creates new workflow
2. Drags nodes from palette to canvas
3. Connects nodes to define flow
4. Configures each node (templates, delays, conditions)
5. Saves and enables workflow

**Run Campaign:**
1. User filters contacts by tag/status
2. Enrolls selected contacts in workflow
3. System executes nodes over time
4. Inbound replies update status and stop flow if configured

---

## Operational Context

### Deployment
- **Production:** Vercel (recommended for Next.js)
- **Database:** Supabase hosted PostgreSQL
- **Local:** `npm run dev` on port 3000

### Monitoring
- Logs: Vercel function logs / Supabase logs
- Metrics: Basic counts in dashboard (future)
- Alerts: None configured (future)

---

## Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| **Batch Size** | Support 5k+ contacts per campaign |
| **Page Load** | Contact/workflow pages in 2-3 seconds |
| **Idempotency** | Prevent duplicate message sends |
| **Security** | Encrypted credential storage |
| **Compliance** | Do-not-contact support, opt-out handling |

---

**Last Updated:** January 14, 2026
