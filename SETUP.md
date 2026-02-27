# Local Development Setup

This guide walks you through setting up Yaad for local development.

## Prerequisites

### Required Software

| Software | Version | Installation |
|----------|---------|---------------|
| Node.js | 18+ | [nvm](https://github.com/nvm-sh/nvm) (recommended) |
| npm | 9+ | Comes with Node.js |
| Git | Latest | [git-scm.com](https://git-scm.com) |

### Required Accounts

| Service | Purpose | Sign Up |
|---------|---------|----------|
| Supabase | Database, Auth, Functions | [supabase.com](https://supabase.com) |
| Twilio | Voice calls | [twilio.com](https://www.twilio.com) |
| ElevenLabs | Voice synthesis (TTS) | [elevenlabs.io](https://elevenlabs.io) |
| Deepgram | Speech-to-text (voice input) | [deepgram.com](https://deepgram.com) |
| Anthropic | AI parsing (voice-to-form) | [console.anthropic.com](https://console.anthropic.com) |

## Step 1: Clone the Repository

```bash
git clone https://github.com/karanperi/call-me-back-soon.git
cd call-me-back-soon
```

## Step 2: Install Dependencies

```bash
# Using npm
npm install

# Or using bun
bun install
```

## Step 3: Set Up Supabase

### Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be provisioned
3. Note your project URL and API keys from Settings > API

### Apply Database Migrations

Option A: **Via Supabase Dashboard**
1. Go to SQL Editor in your Supabase dashboard
2. Run each migration file from `supabase/migrations/` in order

Option B: **Via Supabase CLI**
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
supabase db push
```

### Create Storage Bucket

1. Go to Storage in your Supabase dashboard
2. Create a new bucket named `call-audio`
3. Set it to private (non-public)

### Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy

# Or deploy individually
supabase functions deploy make-call
supabase functions deploy check-reminders
supabase functions deploy deepgram-proxy
supabase functions deploy parse-voice-reminder
supabase functions deploy twilio-status-callback
```

### Set Edge Function Secrets

```bash
supabase secrets set ELEVENLABS_API_KEY=your_elevenlabs_key
supabase secrets set TWILIO_ACCOUNT_SID=your_twilio_sid
supabase secrets set TWILIO_AUTH_TOKEN=your_twilio_token
supabase secrets set TWILIO_PHONE_NUMBER=+1234567890
supabase secrets set DEEPGRAM_API_KEY=your_deepgram_key
supabase secrets set ANTHROPIC_API_KEY=your_anthropic_key
supabase secrets set CRON_SECRET=your_random_secret_string
```

## Step 4: Configure Twilio

### Get a Phone Number

1. Sign in to [Twilio Console](https://console.twilio.com)
2. Go to Phone Numbers > Manage > Buy a number
3. Purchase a number with Voice capability

### Note Your Credentials

From Twilio Console, note:
- Account SID
- Auth Token
- Phone Number (E.164 format: +1234567890)

### Configure Webhook (for status callbacks)

The `twilio-status-callback` edge function receives call status updates. Twilio is configured to call this webhook in the `make-call` function automatically.

## Step 5: Configure ElevenLabs

### Get API Key

1. Sign in to [ElevenLabs](https://elevenlabs.io)
2. Go to Profile > API Keys
3. Create and copy your API key

### Note Voice IDs (Optional)

The app uses these preset voices:
- `friendly_female`: `caMurMrvWp0v3NFJALhl`
- `friendly_male`: `VR6AewLTigWG4xSOukaG`

You can customize these in `supabase/functions/make-call/index.ts`.

## Step 6: Configure Deepgram

### Get API Key

1. Sign up at [deepgram.com](https://deepgram.com)
2. Go to your Dashboard > API Keys
3. Create a new API key with **Usage** permissions
4. Copy the key — it is shown only once

Deepgram powers the voice input feature, enabling users to speak reminders that are transcribed in real-time via WebSocket.

## Step 7: Configure Anthropic

### Get API Key

1. Sign up at [console.anthropic.com](https://console.anthropic.com)
2. Go to API Keys
3. Create a new key and copy it

Anthropic Claude is used by the `parse-voice-reminder` edge function to convert natural language transcripts into structured reminder fields (recipient, message, time, frequency).

## Step 8: Environment Variables

### Create .env File

```bash
cp .env.example .env
```

### Configure Variables

Edit `.env` with your values:

```env
# Supabase (from Project Settings > API)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key

# Edge function secrets are set via `supabase secrets set`, NOT in .env
```

## Step 9: Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Step 10: Set Up Cron Job (Optional)

The `check-reminders` function needs to run periodically. Options:

### Option A: Supabase Cron (Recommended)

1. Go to Database > Extensions
2. Enable `pg_cron` and `pg_net`
3. Run in SQL Editor:

```sql
SELECT cron.schedule(
  'check-reminders',
  '* * * * *',  -- Every minute
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Cron-Secret', 'YOUR_CRON_SECRET'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

> **Note**: The `X-Cron-Secret` header value must match the `CRON_SECRET` you set in edge function secrets.

### Option B: External Cron Service

Use services like:
- [cron-job.org](https://cron-job.org)
- [EasyCron](https://www.easycron.com)
- GitHub Actions scheduled workflows

## Verification Checklist

- [ ] App loads at localhost:5173
- [ ] Can create account and sign in
- [ ] Can navigate to all pages
- [ ] Can create a reminder (test with your own phone)
- [ ] Voice input works (microphone icon on home page)
- [ ] Receive test call successfully
- [ ] Call history shows the call

## Common Issues

See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) for solutions to common problems.

### "Missing Supabase URL or Key"

Ensure `.env` file exists with correct values and restart the dev server.

### "Edge function returns 500"

Check that all secrets are set:
```bash
supabase secrets list
```

Required secrets: `ELEVENLABS_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `DEEPGRAM_API_KEY`, `ANTHROPIC_API_KEY`, `CRON_SECRET`

### "Twilio call fails"

- Verify phone number format (E.164: +1234567890)
- Check Twilio account has sufficient balance
- Ensure number has Voice capability

### "Voice input not working"

- Ensure the app is served over HTTPS (required for microphone access)
- Check browser microphone permissions
- Verify `DEEPGRAM_API_KEY` is set in edge function secrets
- Check `deepgram-proxy` function is deployed

## Next Steps

- Read [ARCHITECTURE.md](ARCHITECTURE.md) to understand the codebase
- Review [CONTRIBUTING.md](CONTRIBUTING.md) before making changes
- Check [docs/API.md](docs/API.md) for edge function details
