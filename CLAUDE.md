# ReachOut - Project Guide

## Overview

**Product Name:** ReachOut
**Owner:** Enzo Hoyos
**Version:** 1.0

ReachOut is an app to set up custom, automated outreach campaigns that send personalized SMS and email messages to contacts in bulk, based on preset logic and visual workflows.

## Tech Stack

- **Frontend:** Next.js 14 (App Router) with TypeScript
- **Database:** Supabase (PostgreSQL)
- **UI Components:** shadcn/ui + Tailwind CSS
- **Workflow Canvas:** React Flow (@xyflow/react)
- **State Management:** Zustand
- **SMS Provider:** Twilio
- **Email Provider:** SendGrid

## Project Structure

```
/src
  /app
    /                         # Landing/dashboard
    /workflows                # Workflow list and builder
      /page.tsx              # List all workflows
      /[id]/page.tsx         # Edit workflow
    /contacts                 # Contact management
      /page.tsx              # Contact list
      /[id]/page.tsx         # Contact detail
      /import/page.tsx       # CSV import
    /templates               # Message templates
      /page.tsx              # Template list
    /settings                # API configuration
      /page.tsx              # Twilio/SendGrid settings
    /notifications           # Notifications panel
      /page.tsx
  /components
    /ui                      # shadcn components
    /workflow                # Workflow builder components
      /WorkflowCanvas.tsx
      /NodePalette.tsx
      /nodes/                # Custom node components
      /panels/               # Node configuration panels
    /contacts                # Contact components
    /templates               # Template components
  /lib
    /supabase.ts            # Supabase client
    /twilio.ts              # Twilio integration
    /sendgrid.ts            # SendGrid integration
    /store/                 # Zustand stores
  /types
    /workflow.ts            # Workflow types
    /contact.ts             # Contact types
    /template.ts            # Template types
```

## Features by Module

### 1. Automation Workflows (COMPLETED)
- Visual drag-and-drop workflow builder
- Node types: Trigger Start, Time Delay, Conditional Split, Send SMS, Send Email, Update Status, Stop on Reply
- CRUD for workflows (create, edit, delete, enable/disable)
- Workflow persistence to Supabase

### 2. Contact Management (TODO)
- Import contacts from CSV with column mapping
- CRUD for contacts
- Custom fields per contact
- Tags/categories for grouping
- Contact detail page with message thread
- Contact status tracking

### 3. Message Templates (TODO)
- CRUD for SMS and email templates
- Dynamic placeholders ({{first_name}}, {{company}}, etc.)
- Template preview with sample contact data
- Channel-aware (SMS vs Email)

### 4. Messaging (TODO)
- Send SMS via Twilio
- Send Email via SendGrid
- Message status tracking (Queued, Sent, Delivered, Failed)
- Inbound SMS/Email handling
- Message history per contact

### 5. Integrations & Settings (TODO)
- Twilio configuration (Account SID, Auth Token, Phone Number)
- SendGrid configuration (API Key, From Email)
- Test functions for both integrations
- Secure credential storage

### 6. Notifications (TODO)
- Global notifications panel
- New inbound SMS/Email alerts
- Mark as read functionality
- Click to navigate to contact

### 7. Workflow Execution Engine (TODO)
- Schedule and execute workflow steps
- Track per-contact workflow progress
- Handle time delays
- Evaluate conditional branches
- Stop on reply logic

## Database Schema

### Existing Tables
- `workflows` - Workflow metadata
- `workflow_nodes` - Nodes in each workflow
- `workflow_edges` - Connections between nodes

### Tables to Create
- `contacts` - Contact records
- `contact_custom_fields` - Custom field definitions
- `contact_field_values` - Custom field values per contact
- `tags` - Tag definitions
- `contact_tags` - Contact-tag associations
- `templates` - Message templates
- `messages` - Message history (SMS/Email)
- `workflow_enrollments` - Contact enrollment in workflows
- `workflow_executions` - Execution state per contact
- `settings` - API credentials (encrypted)
- `notifications` - Notification records

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Twilio (stored in DB, but can use env for defaults)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# SendGrid
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=
```

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint
```

## Workflow Node Types

| Node Type | Description | Inputs | Outputs |
|-----------|-------------|--------|---------|
| trigger_start | Entry point | None | 1 |
| time_delay | Wait duration | 1 | 1 |
| conditional_split | Branch on condition | 1 | 2 (Yes/No) |
| send_sms | Send SMS message | 1 | 1 |
| send_email | Send email message | 1 | 1 |
| update_status | Update contact status | 1 | 1 |
| stop_on_reply | Exit if contact replied | 1 | 0 |

## Contact Status Values

- `new` - Newly imported
- `contacted` - First message sent
- `responded` - Contact replied
- `qualified` - Qualified lead
- `disqualified` - Not a fit

## API Integrations

### Twilio
- Outbound SMS sending
- Inbound SMS webhooks
- Delivery status callbacks

### SendGrid
- Outbound email sending
- Inbound email parsing (Inbound Parse)
- Event webhooks for delivery status

## Non-Functional Requirements

- **Reliability:** Idempotent messaging, clear error handling
- **Performance:** Support 5k+ contacts, pages load in 2-3 seconds
- **Security:** Encrypted credential storage, authenticated access only
- **Compliance:** Do-not-contact support, opt-out handling

## File Naming Conventions

- Components: PascalCase (e.g., `WorkflowCanvas.tsx`)
- Utilities: camelCase (e.g., `supabase.ts`)
- Types: camelCase with descriptive names (e.g., `workflow.ts`)
- Pages: lowercase with hyphens for routes

## Testing Approach

- Manual testing for UI components
- Test Twilio/SendGrid integrations with test credentials
- Verify workflow execution with sample contacts
