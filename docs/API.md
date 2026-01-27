# Yaad API Reference

This document describes the Supabase Edge Functions that power Yaad's backend.

## Authentication

All endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <supabase_jwt_token>
```

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

### Request Body

```json
{
  "reminderId": "uuid",
  "recipientName": "string (2-100 chars)",
  "phoneNumber": "string (E.164 format: +1234567890)",
  "message": "string (1-500 chars)",
  "voice": "friendly_female" | "friendly_male" | "custom",
  "customVoiceId": "uuid (optional, required if voice is 'custom')",
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

1. Validate authentication
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

Process due reminders and initiate calls. Typically called by cron job.

### Endpoint

```
POST /check-reminders
```

### Headers

```
Authorization: Bearer <service_role_key>
```

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

1. Query reminders where `scheduled_at <= now()` and `is_active = true`
2. For each reminder:
   - Call `make-call` function
   - Update `last_called_at`
   - Handle recurring logic (daily/weekly)
3. Return processing summary

---

## create-voice-clone

Create a custom voice clone from audio recording.

### Endpoint

```
POST /create-voice-clone
```

### Request Body

```json
{
  "audioBase64": "string (base64 encoded audio)",
  "voiceName": "string (1-50 chars)"
}
```

### Response

**Success (200)**
```json
{
  "success": true,
  "voiceId": "uuid",
  "message": "Voice created successfully"
}
```

**Errors**

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Missing audio data or voice name | Required fields missing |
| 400 | Voice name must be 1-50 characters | Invalid name length |
| 400 | Already have a voice clone | User limited to 1 voice |
| 401 | Unauthorized | Invalid token |
| 500 | Voice cloning failed | ElevenLabs error |

### Flow

1. Validate authentication
2. Check if user already has a voice (limit: 1)
3. Create user_voices record (status: processing)
4. Convert base64 to audio blob
5. Call ElevenLabs voice cloning API
6. Update record with voice ID (status: ready)
7. Return success

---

## delete-voice-clone

Delete a user's custom voice clone.

### Endpoint

```
DELETE /delete-voice-clone
```

### Request Body

```json
{
  "voiceId": "uuid"
}
```

### Response

**Success (200)**
```json
{
  "success": true,
  "message": "Voice deleted successfully"
}
```

**Errors**

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Missing voice ID | Required field missing |
| 401 | Unauthorized | Invalid token |
| 404 | Voice not found | Voice doesn't exist or not owned |
| 500 | Failed to delete voice | ElevenLabs error |

### Flow

1. Validate authentication
2. Fetch voice record (verify ownership)
3. Delete from ElevenLabs
4. Delete from user_voices table
5. Return success

---

## preview-voice

Generate a short voice preview without making a call.

### Endpoint

```
POST /preview-voice
```

### Request Body

```json
{
  "text": "string (preview text)",
  "voice": "friendly_female" | "friendly_male" | "custom",
  "customVoiceId": "uuid (optional)"
}
```

### Response

**Success (200)**
```json
{
  "success": true,
  "audioUrl": "signed URL to audio"
}
```

### Flow

1. Validate authentication
2. Generate speech via ElevenLabs
3. Upload to Storage
4. Return signed URL

---

## parse-voice-reminder

Use AI to parse natural language into reminder fields.

### Endpoint

```
POST /parse-voice-reminder
```

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

---

## twilio-status-callback

Webhook to receive Twilio call status updates.

### Endpoint

```
POST /twilio-status-callback
```

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

1. Validate request is from Twilio
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

All endpoints return errors in this format:

```json
{
  "error": "Human-readable error message"
}
```

## Rate Limits

- Supabase Edge Functions: 500 requests/minute per IP
- ElevenLabs: Based on subscription tier
- Twilio: Based on account settings
