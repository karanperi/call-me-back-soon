

# Feature: Duplicate Call from History

## Overview

Add a "Duplicate" button to the call history detail dialog that opens the create reminder form pre-filled with the call's metadata.

---

## Data Mapping

| Call History Field | Create Reminder Field | Notes |
|-------------------|----------------------|-------|
| `recipient_name` | Recipient Name | Direct copy |
| `phone_number` | Phone Number | Already E.164 format |
| `message` | Message | Direct copy |
| `voice` | Voice | Direct copy |
| N/A | Date/Time | Fresh default (now + 1 min) |
| N/A | Frequency | Default to "once" |

---

## Technical Changes

### 1. Update CreateReminderDialog to Accept Initial Data

**File:** `src/components/reminders/CreateReminderDialog.tsx`

Add an optional `initialData` prop to pre-populate form fields:

```typescript
interface InitialReminderData {
  recipientName?: string;
  phoneNumber?: string;
  message?: string;
  voice?: "friendly_female" | "friendly_male";
}

interface CreateReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: InitialReminderData;  // New prop
}
```

Use `useEffect` to populate form state when `initialData` changes:

```typescript
useEffect(() => {
  if (initialData && open) {
    if (initialData.recipientName) setRecipientName(initialData.recipientName);
    if (initialData.phoneNumber) {
      setPhoneNumber(initialData.phoneNumber);
      setIsPhoneValid(true); // Trust the existing E.164 format
    }
    if (initialData.message) setMessage(initialData.message);
    if (initialData.voice) setVoice(initialData.voice);
  }
}, [initialData, open]);
```

### 2. Add Duplicate Button to CallHistoryDetailDialog

**File:** `src/components/history/CallHistoryDetailDialog.tsx`

Add a callback prop for the duplicate action:

```typescript
interface CallHistoryDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callHistory: CallHistory | null;
  onDuplicate?: (callHistory: CallHistory) => void;  // New prop
}
```

Add a "Duplicate" button at the bottom of the dialog:

```tsx
<Button
  onClick={() => {
    onDuplicate?.(callHistory);
    onOpenChange(false);
  }}
  className="w-full"
  variant="outline"
>
  <Copy className="h-4 w-4 mr-2" />
  Duplicate as New Reminder
</Button>
```

### 3. Wire Up in History Page

**File:** `src/pages/History.tsx`

Add state and handlers:

```typescript
const [createDialogOpen, setCreateDialogOpen] = useState(false);
const [duplicateData, setDuplicateData] = useState<InitialReminderData | undefined>();

const handleDuplicate = (call: CallHistory) => {
  setDuplicateData({
    recipientName: call.recipient_name,
    phoneNumber: call.phone_number,
    message: call.message,
    voice: call.voice as "friendly_female" | "friendly_male",
  });
  setCreateDialogOpen(true);
};
```

Render the CreateReminderDialog:

```tsx
<CreateReminderDialog
  open={createDialogOpen}
  onOpenChange={setCreateDialogOpen}
  initialData={duplicateData}
/>
```

---

## User Flow

```text
History Page
    |
    v
Click call card --> CallHistoryDetailDialog opens
    |
    v
Click "Duplicate" button
    |
    v
CallHistoryDetailDialog closes
    |
    v
CreateReminderDialog opens with pre-filled:
  - Recipient Name
  - Phone Number  
  - Message
  - Voice
  (Date/Time defaults to now + 1 minute)
```

---

## Summary of File Changes

| File | Change |
|------|--------|
| `src/components/reminders/CreateReminderDialog.tsx` | Add `initialData` prop, useEffect to populate form |
| `src/components/history/CallHistoryDetailDialog.tsx` | Add `onDuplicate` prop, add "Duplicate" button |
| `src/pages/History.tsx` | Add state for create dialog, pass `onDuplicate` handler |

