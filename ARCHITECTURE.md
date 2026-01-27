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
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Supabase                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │    Auth     │  │  Database   │  │     Edge Functions      │  │
│  │             │  │ (PostgreSQL)│  │  ┌──────────────────┐  │  │
│  │ • Sign up   │  │             │  │  │   make-call      │  │  │
│  │ • Sign in   │  │ • profiles  │  │  │   check-reminders│  │  │
│  │ • Sessions  │  │ • reminders │  │  │   voice-clone    │  │  │
│  └─────────────┘  │ • history   │  │  │   preview-voice  │  │  │
│                   │ • voices    │  │  └──────────────────┘  │  │
│  ┌─────────────┐  └─────────────┘  └─────────────────────────┘  │
│  │   Storage   │                                                 │
│  │             │                                                 │
│  │ • Audio     │                                                 │
│  │ • Voices    │                                                 │
│  └─────────────┘                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
       ┌───────────┐   ┌───────────┐   ┌───────────┐
       │  Twilio   │   │ElevenLabs │   │  Cron Job │
       │           │   │           │   │           │
       │ • Calls   │   │ • TTS     │   │ • Check   │
       │ • Status  │   │ • Clone   │   │   due     │
       └───────────┘   └───────────┘   └───────────┘
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
├── Voices.tsx       # Voice selection & cloning
├── Profile.tsx      # User settings
└── NotFound.tsx     # 404 page
```

### Component Architecture

```
src/components/
├── auth/            # Authentication flows
│   ├── AuthGuard.tsx
│   └── LoginForm.tsx
├── contacts/        # Contact CRUD
│   ├── ContactCard.tsx
│   └── ContactForm.tsx
├── history/         # Call logs
│   ├── HistoryList.tsx
│   └── HistoryItem.tsx
├── layout/          # App shell
│   ├── Header.tsx
│   ├── Navigation.tsx
│   └── MobileNav.tsx
├── phone/           # Phone input
│   └── PhoneInput.tsx
├── reminders/       # Core feature
│   ├── ReminderForm.tsx
│   ├── ReminderCard.tsx
│   └── VoiceSelector.tsx
├── ui/              # shadcn components
└── voices/          # Voice features
    ├── VoiceRecorder.tsx
    └── VoicePreview.tsx
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

| Function | Trigger | Purpose |
|----------|---------|----------|
| `make-call` | HTTP POST | Initiate a voice call |
| `check-reminders` | Cron (1 min) | Process due reminders |
| `create-voice-clone` | HTTP POST | Clone user voice |
| `delete-voice-clone` | HTTP DELETE | Remove cloned voice |
| `preview-voice` | HTTP POST | Generate voice preview |
| `parse-voice-reminder` | HTTP POST | AI-parse reminder text |
| `twilio-status-callback` | Webhook | Update call status |

### Edge Function Flow

```
make-call Function:

1. Validate request & auth
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
├── voice (enum)
├── custom_voice_id (FK → user_voices)
├── scheduled_at
├── frequency (once/daily/weekly)
├── is_active
└── timestamps

-- Call history
call_history
├── id (UUID, PK)
├── reminder_id (FK → reminders)
├── user_id (FK → auth.users)
├── recipient_name
├── phone_number
├── message
├── voice
├── status (pending/in_progress/completed/missed/voicemail/failed)
├── twilio_call_sid
├── duration_seconds
├── error_message
└── timestamps

-- Cloned voices
user_voices
├── id (UUID, PK)
├── user_id (FK → auth.users)
├── name
├── elevenlabs_voice_id
├── status (processing/ready/failed)
├── error_message
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

**Purpose**: AI voice synthesis

**Endpoints Used**:
- `POST /v1/text-to-speech/{voice_id}` - Generate speech
- `POST /v1/voices/add` - Clone voice
- `DELETE /v1/voices/{voice_id}` - Delete voice

**Voice Options**:
- Preset: `friendly_female`, `friendly_male`
- Custom: User-cloned voices

## Data Flow

### Creating a Reminder

```
User fills form → Validate → Insert to reminders table → Show confirmation
```

### Processing a Due Reminder

```
Cron triggers check-reminders
         │
         ▼
Query due reminders (scheduled_at ≤ now)
         │
         ▼
For each reminder:
├── Call make-call function
├── Update last_called_at
└── Handle recurring logic
```

### Making a Call

```
make-call receives request
         │
         ▼
Validate auth & input
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
- Secure session management
- Password requirements enforced

### Authorization
- Row Level Security on all tables
- User can only access own data
- Service role for edge functions

### Data Protection
- All data encrypted at rest
- TLS for all connections
- Signed URLs for audio files (1-hour expiry)
- Phone numbers stored in E.164 format

### API Security
- Bearer token authentication
- Rate limiting via Supabase
- Input validation on all endpoints
- CORS configured appropriately

### Secrets Management
- Environment variables for all secrets
- Supabase Vault for edge function secrets
- No secrets in client code