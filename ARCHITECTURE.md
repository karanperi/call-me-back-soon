# Yaad Architecture

This document provides a technical overview of Yaad's architecture, including system components, data flow, and integration patterns.

## Table of Contents

- [System Overview](#system-overview)
- [Frontend Architecture](#frontend-architecture)
- [Backend Architecture](#backend-architecture)
- [Database Schema](#database-schema)
- [External Integrations](#external-integrations)
- [Data Flow](#data-flow)
- [Security](#security)

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    React Application                      │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │    │
│  │  │  Pages   │  │Components│  │  Hooks   │  │  Utils   │ │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS / WSS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Supabase                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │    Auth     │  │  Database   │  │     Edge Functions      │  │
│  │             │  │ (PostgreSQL)│  │  ┌──────────────────┐  │  │
│  │ • Sign up   │  │             │  │  │   make-call      │  │  │
│  │ • Sign in   │  │ • profiles  │  │  │   check-reminders│  │  │
│  │ • Sessions  │  │ • reminders │  │  │   deepgram-proxy │  │  │
│  └─────────────┘  │ • history   │  │  │   parse-voice    │  │  │
│                   │ • contacts  │  │  │   twilio-callback │  │  │
│  ┌─────────────┐  └─────────────┘  │  └──────────────────┘  │  │
│  │   Storage   │                   └─────────────────────────┘  │
│  │ • Audio     │                                                 │
│  └─────────────┘                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┬───────────────┐
              │               │               │               │
              ▼               ▼               ▼               ▼
       ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐
       │  Twilio   │   │ElevenLabs │   │ Deepgram  │   │ Anthropic │
       │           │   │           │   │           │   │           │
       │ • Calls   │   │ • TTS     │   │ • STT     │   │ • NLP     │
       │ • Status  │   │           │   │ • WebSocket│   │ • Parsing │
       └───────────┘   └───────────┘   └───────────┘   └───────────┘
```

## Frontend Architecture

### Technology Stack

| Technology | Purpose |
|------------|----------|
| React 18 | UI framework |
| TypeScript | Type safety |
| Vite | Build tool & dev server |
| Tailwind CSS | Utility-first styling |
| shadcn/ui | Component library |
| React Router | Client-side routing |
| TanStack Query | Server state management |
| React Hook Form | Form handling |
| Zod | Schema validation |

### Page Structure

```
src/pages/
├── Welcome.tsx      # Landing page (unauthenticated)
├── Login.tsx        # Login form
├── SignUp.tsx       # Registration form
├── Home.tsx         # Main dashboard (create reminders)
├── History.tsx      # Call history view
├── Contacts.tsx     # Contact management
├── Voices.tsx       # Voice selection
├── Profile.tsx      # User settings
└── NotFound.tsx     # 404 page
```

### Component Architecture

```
src/components/
├── auth/                  # Authentication
│   └── ProtectedRoute.tsx
├── contacts/              # Contact management
│   ├── ContactCard.tsx
│   ├── ContactForm.tsx
│   ├── ContactPickerIcon.tsx
│   ├── ContactPickerModal.tsx
│   └── EmptyContactsState.tsx
├── history/               # Call history
│   └── CallHistoryDetailDialog.tsx
├── layout/                # App shell
│   ├── AppLayout.tsx
│   ├── BottomNav.tsx
│   └── PageHeader.tsx
├── phone/                 # Phone input
│   ├── CallCostEstimate.tsx
│   ├── CountryPicker.tsx
│   └── InternationalPhoneInput.tsx
├── reminders/             # Core feature
│   ├── CreateReminderDialog.tsx
│   ├── CustomFrequencyDialog.tsx
│   ├── EditReminderDialog.tsx
│   ├── FrequencyPicker.tsx
│   ├── MedicationChip.tsx
│   ├── MedicationExpandedForm.tsx
│   ├── MedicationList.tsx
│   ├── MedicationReminderForm.tsx
│   ├── MessagePreview.tsx
│   ├── TemplatePicker.tsx
│   ├── TestCallConfirmation.tsx
│   └── VoiceInputSection.tsx
├── ui/                    # shadcn components
└── voices/                # Voice selection
    └── VoiceSelector.tsx
```

### Custom Hooks

```
src/hooks/
├── useAuth.tsx              # Authentication state & methods
├── useCallHistory.ts        # Call history CRUD
├── useContacts.ts           # Contact CRUD
├── useMakeCall.ts           # Initiate calls
├── useProfile.ts            # User profile management
├── useReminders.ts          # Reminder CRUD
├── useVoiceDisableStatus.ts # Voice availability check
├── useVoiceRecorder.ts      # Microphone recording & Deepgram STT
├── useVoiceReminderParser.ts # AI-powered voice-to-form parsing
└── use-mobile.tsx           # Mobile breakpoint detection
```

### State Management

- **Server State**: TanStack Query for all Supabase data
- **Form State**: React Hook Form with Zod validation
- **Auth State**: Supabase Auth with React context
- **UI State**: React useState for local component state

## Backend Architecture

### Supabase Services

#### Authentication
- Email/password authentication
- Session management
- Row Level Security (RLS) integration

#### Database (PostgreSQL)
- Managed PostgreSQL instance
- RLS for data isolation
- Triggers for automation

#### Storage
- `call-audio` bucket: Generated TTS audio files
- Signed URLs for secure access

#### Edge Functions (Deno)

| Function | Trigger | Purpose | Auth |
|----------|---------|----------|------|
| `make-call` | HTTP POST | Initiate a voice call | JWT |
| `check-reminders` | Cron (1 min) | Process due reminders | X-Cron-Secret |
| `deepgram-proxy` | WebSocket | Real-time speech-to-text | JWT (via query param) |
| `parse-voice-reminder` | HTTP POST | AI-parse natural language into reminder fields | JWT |
| `twilio-status-callback` | Webhook | Update call status from Twilio | Twilio signature |

### Edge Function Flow

```
make-call Function:

1. Validate request & JWT auth
         │
         ▼
2. Create call_history (status: pending)
         │
         ▼
3. Generate audio (ElevenLabs TTS)
         │
         ▼
4. Upload to Supabase Storage
         │
         ▼
5. Create signed URL
         │
         ▼
6. Initiate Twilio call
         │
         ▼
7. Update history (status: in_progress)
         │
         ▼
8. Twilio callback updates final status
```

### Voice-to-Form Data Flow

```
User speaks into microphone
         │
         ▼
useVoiceRecorder opens WebSocket to deepgram-proxy
         │
         ▼
deepgram-proxy validates JWT, connects to Deepgram STT API
         │
         ▼
Real-time transcript returned to client
         │
         ▼
useVoiceReminderParser sends transcript to parse-voice-reminder
         │
         ▼
parse-voice-reminder uses Anthropic Claude to extract:
  • recipientName, phoneNumber, message
  • scheduledAt, frequency
         │
         ▼
Parsed fields auto-fill the reminder form
```

## Database Schema

See [docs/DATABASE.md](docs/DATABASE.md) for complete schema documentation.

### Core Tables

```sql
-- User profiles (extends auth.users)
profiles
├── id (UUID, PK, FK → auth.users)
├── email
├── default_voice
├── created_at
└── updated_at

-- Scheduled reminders
reminders
├── id (UUID, PK)
├── user_id (FK → auth.users)
├── recipient_name
├── phone_number (E.164 format)
├── message (max 500 chars)
├── voice (friendly_female | friendly_male)
├── scheduled_at
├── frequency (once/daily/weekly + custom recurrence fields)
├── recurrence_interval, recurrence_days_of_week, etc.
├── is_active
├── max_occurrences, repeat_until
└── timestamps

-- Call history
call_history
├── id (UUID, PK)
├── reminder_id (FK → reminders)
├── user_id (FK → auth.users)
├── recipient_name, phone_number, message, voice
├── status (pending/in_progress/completed/missed/voicemail/failed)
├── twilio_call_sid
├── duration_seconds, error_message, attempts
└── timestamps

-- Contacts
contacts
├── id (UUID, PK)
├── user_id (FK → auth.users)
├── name
├── phone_number
└── timestamps
```

### Row Level Security

All tables have RLS enabled with policies ensuring:
- Users can only read/write their own data
- Service role bypasses RLS for edge functions

## External Integrations

### Twilio

**Purpose**: Voice call delivery

**Endpoints Used**:
- `POST /Calls.json` - Initiate calls
- Status callback webhook - Receive call outcomes

**Features**:
- TwiML for call flow
- Machine detection (voicemail)
- Status callbacks

### ElevenLabs

**Purpose**: AI voice synthesis (text-to-speech)

**Endpoints Used**:
- `POST /v1/text-to-speech/{voice_id}` - Generate speech audio

**Voice Options**:
- `friendly_female` (voice ID: `caMurMrvWp0v3NFJALhl`)
- `friendly_male` (voice ID: `VR6AewLTigWG4xSOukaG`)

### Deepgram

**Purpose**: Real-time speech-to-text for voice input

**Protocol**: WebSocket (proxied via `deepgram-proxy` edge function)

**Features**:
- Streaming transcription
- Multiple language support
- Interim results for real-time feedback

### Anthropic Claude

**Purpose**: Natural language parsing for voice-to-form

**Model**: Claude (via `parse-voice-reminder` edge function)

**Features**:
- Extracts structured reminder fields from natural language
- Handles relative time expressions ("tomorrow at 9am")
- Identifies recipient, message, schedule, and frequency

## Data Flow

### Creating a Reminder

```
User fills form (or uses voice input) → Validate → Insert to reminders table → Show confirmation
```

### Processing a Due Reminder

```
Cron triggers check-reminders (via X-Cron-Secret)
         │
         ▼
Query due reminders (scheduled_at ≤ now, is_active = true)
         │
         ▼
For each reminder:
├── Call make-call function
├── Update scheduled_at for recurring
└── Deactivate if one-time or past repeat_until
```

### Making a Call

```
make-call receives request
         │
         ▼
Validate JWT auth & input
         │
         ▼
Create call_history (pending)
         │
         ▼
Generate speech via ElevenLabs
         │
         ▼
Upload audio to Storage
         │
         ▼
Initiate Twilio call with TwiML
         │
         ▼
Update history (in_progress)
         │
         ▼
Twilio webhook updates final status
```

## Security

### Authentication
- JWT-based auth via Supabase
- All edge functions require authentication (JWT or cron secret)
- Secure session management

### Authorization
- Row Level Security on all tables
- User can only access own data
- Service role for edge functions

### Data Protection
- All data encrypted at rest
- TLS for all connections
- Signed URLs for audio files (1-hour expiry)
- Phone numbers stored in E.164 format
- Sensitive data sanitized from edge function logs

### API Security
- JWT token authentication on all user-facing endpoints
- X-Cron-Secret header for cron-triggered functions
- Rate limiting via Supabase
- Input validation on all endpoints
- CORS configured appropriately

### Secrets Management
- Environment variables for all secrets
- Supabase Vault for edge function secrets
- No secrets in client code
