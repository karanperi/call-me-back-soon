# Yaad API Reference

This document describes the Supabase Edge Functions that power Yaad's backend.

## Authentication

Most endpoints require a Bearer token (JWT) in the Authorization header:

```
Authorization: Bearer <supabase_jwt_token>
```

Exceptions are noted per endpoint.

## Base URL

```
https://<your-project>.supabase.co/functions/v1
```

---

## make-call

Initiate a voice call with a TTS message.

### Endpoint

```
POST /make-call
```

### Authentication

Bearer JWT token (must match `userId`).

### Request Body

```json
{
  "reminderId": "uuid",
  "recipientName": "string (2-100 chars)",
  "phoneNumber": "string (E.164 format: +1234567890)",
  "message": "string (1-500 chars)",
  "voice": "friendly_female" | "friendly_male",
  "userId": "uuid"
}
```

### Response

**Success (200)**
```json
{
  "success": true,
  "callSid": "twilio_call_sid",
  "message": "Call initiated successfully"
}
```

**Errors**

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Missing required fields | Required fields not provided |
| 400 | Invalid phone number format | Phone not in E.164 format |
| 400 | Invalid voice selection | Voice not in allowed list |
| 401 | Unauthorized | Invalid or missing token |
| 403 | Forbidden | User ID mismatch |
| 500 | Server configuration error | Missing env variables |
| 500 | Failed to generate audio | ElevenLabs error |
| 500 | Failed to initiate call | Twilio error |

### Flow

1. Validate JWT authentication
2. Validate input (phone format, message length, voice)
3. Create call_history record (status: pending)
4. Generate speech via ElevenLabs
5. Upload audio to Supabase Storage
6. Create signed URL
7. Initiate Twilio call with TwiML
8. Update history (status: in_progress)
9. Return call SID

---

## check-reminders

Process due reminders and initiate calls. Called by cron job.

### Endpoint

```
POST /check-reminders
```

### Authentication

Requires `X-Cron-Secret` header matching the `CRON_SECRET` environment variable:

```
X-Cron-Secret: <your_cron_secret>
```

> **Note**: This endpoint does NOT use Bearer token auth. It uses a shared secret for cron job authentication.

### Request Body

None required.

### Response

**Success (200)**
```json
{
  "processed": 5,
  "successful": 4,
  "failed": 1
}
```

### Flow

1. Validate `X-Cron-Secret` header
2. Query reminders where `scheduled_at <= now()` and `is_active = true`
3. For each reminder:
   - Call `make-call` function
   - Update `scheduled_at` for recurring reminders
   - Deactivate one-time reminders
4. Return processing summary

---

## deepgram-proxy

WebSocket proxy for real-time speech-to-text via Deepgram.

### Protocol

```
WebSocket wss://<your-project>.supabase.co/functions/v1/deepgram-proxy?language=en&token=<jwt_token>
```

### Authentication

JWT token passed as a `token` query parameter. The function validates the token before establishing the Deepgram connection.

### Query Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `token` | Yes | Supabase JWT token |
| `language` | No | Language code (default: `en`) |

### Communication

- **Client → Server**: Raw audio bytes (WebM/Opus format)
- **Server → Client**: JSON transcript messages from Deepgram

### Transcript Message Format

```json
{
  "type": "Results",
  "channel": {
    "alternatives": [
      {
        "transcript": "call mom tomorrow at 9am",
        "confidence": 0.98
      }
    ]
  },
  "is_final": true
}
```

---

## parse-voice-reminder

Use AI (Anthropic Claude) to parse natural language into structured reminder fields.

### Endpoint

```
POST /parse-voice-reminder
```

### Authentication

Bearer JWT token required.

### Request Body

```json
{
  "text": "string (natural language reminder)"
}
```

### Response

**Success (200)**
```json
{
  "success": true,
  "parsed": {
    "recipientName": "Mom",
    "message": "Take your medicine",
    "scheduledAt": "2025-01-27T09:00:00Z",
    "frequency": "daily"
  }
}
```

**Errors**

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing or invalid JWT |
| 400 | Missing text | No transcript provided |
| 500 | Parsing failed | Anthropic API error |

---

## twilio-status-callback

Webhook to receive Twilio call status updates.

### Endpoint

```
POST /twilio-status-callback
```

### Authentication

This endpoint is called by Twilio. No Bearer token required — the function validates the request origin.

### Request (from Twilio)

Form-encoded:
```
CallSid=CA123...
CallStatus=completed|busy|no-answer|failed
CallDuration=45
AnsweredBy=human|machine
```

### Response

**Success (200)**
```xml
<Response></Response>
```

### Flow

1. Parse form-encoded Twilio request
2. Find call_history by twilio_call_sid
3. Update status based on CallStatus:
   - `completed` + human → `completed`
   - `completed` + machine → `voicemail`
   - `no-answer` → `missed`
   - `busy` → `missed`
   - `failed` → `failed`
4. Update duration_seconds
5. Return empty TwiML response

---

## Error Response Format

All HTTP endpoints return errors in this format:

```json
{
  "error": "Human-readable error message"
}
```

## Rate Limits

- Supabase Edge Functions: 500 requests/minute per IP
- ElevenLabs: Based on subscription tier
- Twilio: Based on account settings
- Deepgram: Based on subscription tier
