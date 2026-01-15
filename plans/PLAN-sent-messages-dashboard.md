# PLAN: Sent Messages Dashboard

> Centralized view of all outbound SMS and Email messages with expandable row details.

## Objective

**Goal:** Create a `/messages/sent` page displaying all outbound messages in a filterable, sortable table with inline expandable rows showing full message details.

**Success Criteria:**
- [ ] New page accessible at `/messages/sent`
- [ ] Table displays all sent SMS and Email messages combined
- [ ] Rows expand inline to show full message details and contact info
- [ ] Filtering by type (SMS/Email), status, date range, and search
- [ ] Sorting by column headers (sent_at, recipient, status, type)
- [ ] Pagination with 25-50 messages per page
- [ ] Status badges with consistent styling
- [ ] Loading, empty, and error states handled

---

## Background / Context

### Why This Feature
Users need a centralized view of all outbound communications without navigating to individual contact pages. This enables:
- Quick overview of recent messaging activity
- Finding specific messages across all contacts
- Monitoring delivery success/failure rates
- Auditing bulk and workflow-triggered messages

### Key Discovery: Unified Messages Table
The codebase already uses a **single `messages` table** (not separate SMS/Email tables as the spec suggested). This significantly simplifies implementation - no database VIEW or application-layer merge is needed.

**Existing `messages` table structure:**
| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | Primary key |
| `contact_id` | UUID | FK to contacts |
| `channel` | TEXT | 'sms' or 'email' |
| `direction` | TEXT | 'inbound' or 'outbound' |
| `subject` | TEXT | Email subject (null for SMS) |
| `body` | TEXT | Message content |
| `status` | TEXT | scheduled/queued/sending/sent/delivered/failed/bounced |
| `source` | TEXT | manual/bulk/workflow |
| `sent_at` | TIMESTAMPTZ | When sent |
| `delivered_at` | TIMESTAMPTZ | When delivered |
| `failed_at` | TIMESTAMPTZ | When failed |

**Existing indexes:** `idx_messages_direction`, `idx_messages_channel`, `idx_messages_status`, `idx_messages_created_at`

---

## Implementation Phases

### Phase 1: Page & Route Setup

**Files to create/modify:**
- `src/app/messages/sent/page.tsx` (new)
- `src/components/layout/Sidebar.tsx` (modify - add nav link)

**Tasks:**
1. Create page at `/messages/sent` with basic structure
2. Add "Messages" link to sidebar navigation (Mail icon)
3. Page header: "Sent Messages" with subtitle showing total count
4. Implement loading skeleton and empty state

**Pattern to follow:** `/src/app/contacts/page.tsx` (table-based list page)

---

### Phase 2: Messages Table (Core)

**Files to create:**
- `src/components/messages/SentMessagesTable.tsx`
- `src/components/messages/SentMessageRow.tsx`
- `src/hooks/useSentMessages.ts`

**Tasks:**
1. Create `useSentMessages` hook using existing `getMessages()` from supabase.ts
2. Build table with columns: Type (icon), Recipient, Subject/Preview, Status, Sent At
3. Implement column header sorting (sent_at, recipient name, status, type)
4. Add visual chevron indicator for expandable rows
5. Alternating row colors for readability

**Default columns (collapsed view):**
| Column | Description |
|--------|-------------|
| Type | SMS/Email icon |
| Recipient | Contact name (or phone/email if no name) |
| Subject/Preview | Email subject OR first ~50 chars of SMS |
| Status | Delivery status badge |
| Sent At | Relative for recent, absolute for older |

---

### Phase 3: Expandable Row Details

**Files to create:**
- `src/components/messages/SentMessageRowExpanded.tsx`

**Tasks:**
1. Implement accordion-style expand/collapse (one row at a time)
2. Smooth animation on expand/collapse
3. Two-column layout for expanded content:
   - Left: Contact details, tags
   - Right: Message details, timestamps
4. Display full message body with "View Full Message" for long emails
5. Action buttons: View Contact, Resend Message, Copy Content

**Expanded view sections:**
- Contact Details: name, email, phone, link to contact page, tags
- Message Details: type, subject, status badge
- Timestamps: sent, delivered, failed (with error reason)
- Full message content

**Reusable components:**
- `TimelineEvent.tsx` expandable pattern
- `MESSAGE_STATUS_DISPLAY` / `MESSAGE_STATUS_COLORS` from `types/message.ts`
- `TimelineEventIcon` for status icons
- `getTimeAgo()`, `formatFullTimestamp()` from `timeline-utils.ts`

---

### Phase 4: Filtering & Search

**Files to create:**
- `src/components/messages/SentMessageFilters.tsx`

**Tasks:**
1. Type filter: All / SMS / Email
2. Status filter: All / Sent / Delivered / Failed / Pending
3. Date range picker (start/end dates)
4. Search box (debounced 300ms) - searches recipient name, email, phone, content
5. Show active filter count badge
6. Filters apply immediately with loading indicator
7. Maintain filter state across pagination

**Filter bar layout:**
```
[Search input...] [Type: All ▼] [Status: All ▼] [Date Range] [X active filters]
```

---

### Phase 5: Pagination

**Files to modify:**
- `src/hooks/useSentMessages.ts`
- `src/app/messages/sent/page.tsx`

**API design:**
```
GET /api/messages/sent
  ?page=1
  &limit=50
  &type=sms|email|all
  &status=delivered|failed|sent|pending|all
  &date_from=2025-01-01
  &date_to=2025-01-15
  &search=john
  &sort_by=sent_at
  &sort_order=desc
```

**Tasks:**
1. Create API endpoint at `/api/messages/sent/route.ts`
2. Display 25-50 messages per page
3. Pagination controls: Previous/Next, page number, total count
4. Pre-fetch next page for smoother UX
5. Display: "Showing 1-50 of 1,234 messages"

**Pattern to follow:** `/src/app/scheduled-messages/page.tsx` pagination

---

### Phase 6: Status Badges & Polish

**Files to create/modify:**
- `src/components/messages/MessageStatusBadge.tsx` (new - or extract from existing)

**Status badge colors (use existing constants):**
| Status | Color | Icon |
|--------|-------|------|
| Pending | Gray | Clock |
| Sent | Blue | Check |
| Delivered | Green | CheckCheck |
| Opened | Purple | Eye |
| Failed | Red | X |
| Bounced | Orange | CornerUpLeft |

**Tasks:**
1. Create reusable `MessageStatusBadge` component
2. Add tooltip on hover showing status details
3. Failed messages show error reason in expanded view
4. Source badges (Manual/Bulk/Workflow) using `MESSAGE_SOURCE_COLORS`
5. Empty state: "No messages sent yet" with CTA
6. Error state handling with retry option

---

## Technical Design

### Data Flow
```
useSentMessages hook
    ↓
GET /api/messages/sent (with filters/pagination)
    ↓
getMessages() from lib/supabase.ts (add outbound filter)
    ↓
Supabase messages table (direction = 'outbound')
    ↓
Return with pagination metadata
```

### Database Approach
**No VIEW needed** - the unified `messages` table already supports this feature. Query with `direction = 'outbound'` filter.

**New migration required** (Phase 1 prerequisite):
```sql
-- Add sent_by column for user tracking
ALTER TABLE messages ADD COLUMN sent_by UUID NULL;

-- Add generated tsvector column for full-text search
ALTER TABLE messages ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
  to_tsvector('english', COALESCE(body, '') || ' ' || COALESCE(subject, ''))
) STORED;

-- Create GIN index for fast full-text search
CREATE INDEX idx_messages_search_vector ON messages USING GIN (search_vector);
```

### File Structure (Final)
```
src/
├── app/
│   ├── messages/
│   │   └── sent/
│   │       └── page.tsx              # Main page
│   └── api/
│       └── messages/
│           └── sent/
│               └── route.ts          # API endpoint
├── components/
│   └── messages/
│       ├── SentMessagesTable.tsx     # Table container
│       ├── SentMessageRow.tsx        # Table row (collapsed)
│       ├── SentMessageRowExpanded.tsx# Expanded details
│       ├── SentMessageFilters.tsx    # Filter bar
│       └── MessageStatusBadge.tsx    # Reusable badge
├── hooks/
│   └── useSentMessages.ts            # Data fetching hook
└── types/
    └── message.ts                    # (existing - may extend)
```

---

## Dependencies & Shared Components

### Shared with Contact Timeline Feature
| Component/Utility | Location | Usage |
|-------------------|----------|-------|
| `MESSAGE_STATUS_DISPLAY` | `types/message.ts` | Status text labels |
| `MESSAGE_STATUS_COLORS` | `types/message.ts` | Badge colors |
| `MESSAGE_SOURCE_COLORS` | `types/message.ts` | Source badge colors |
| `getTimeAgo()` | `lib/timeline-utils.ts` | Relative timestamps |
| `formatFullTimestamp()` | `lib/timeline-utils.ts` | Absolute timestamps |
| `TimelineEventIcon` | `components/contacts/` | Status icons |
| `getMessages()` | `lib/supabase.ts` | Database query |

### UI Components (shadcn/ui)
- `Table`, `TableHeader`, `TableRow`, `TableCell`
- `Badge` - status and source badges
- `Button` - actions and pagination
- `Input` - search
- `Select` - type/status filters
- `Card` - container
- `Dialog` - full message view modal

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Performance with large message volumes | Medium | High | Add pagination, limit initial load, add database indexes for search |
| Search performance on body content | Medium | Medium | Add PostgreSQL full-text search index (GIN) |
| Expanded row re-renders causing slowness | Low | Medium | Memoize rows, lazy-load expanded content |
| Inconsistent styling with existing components | Low | Low | Reuse existing constants and components |

---

## Decisions (Resolved)

1. **Full-text search:** ✅ Yes. Add a `tsvector` generated column with GIN index on `subject + body`. Use PostgreSQL's built-in full-text search for efficient content searching.

2. **Resend action:** ✅ Opens composer pre-filled with original content. User can edit before sending. Creates a NEW message record (not duplicate/modification). This preserves audit trail and allows tweaks.

3. **Sent By tracking:** ✅ Yes. Add `sent_by UUID` column (nullable). NULL indicates system/automation sent it. This distinguishes manual sends from workflow-triggered sends, useful for debugging and filtering.

4. **Inbound messages:** Out of scope for this feature (future enhancement).

---

## Verification Plan

### Manual Testing
1. Navigate to `/messages/sent` - page loads with messages
2. Verify table shows SMS and Email messages combined
3. Click row to expand - details appear with animation
4. Test each filter (type, status, date range, search)
5. Verify pagination works and maintains filter state
6. Check status badges match expected colors
7. Click "View Contact" - navigates correctly
8. Test empty state (no messages)
9. Test error state (API failure)
10. Mobile responsiveness

### Performance Testing
- Load page with 1000+ messages - verify pagination works
- Search with partial text - verify debounce and results
- Rapidly expand/collapse rows - verify no performance issues

---

**Status:** Draft
**Last Updated:** 2025-01-15
