

## Plan: Update All Markdown Files for Open-Source Readiness

After reviewing every MD file against the current codebase, here are all the discrepancies and required updates.

---

### 1. README.md

| Issue | Fix |
|-------|-----|
| Lists "Custom Voice Clone" as a feature | Remove voice cloning references |
| Lists `create-voice-clone`, `delete-voice-clone`, `preview-voice` in project structure | Remove them |
| Missing edge functions: `deepgram-proxy`, `parse-voice-reminder` from structure | Add them |
| Missing features: Voice-to-Form (speech input), Medication reminders, Contact Picker, Custom frequencies | Add them |
| Lists Deepgram and Anthropic in integrations section | Add as external services |
| "Voice Options" section mentions "Custom Voice Clone" | Remove, keep only preset voices |
| Screenshots section has placeholder images | Note or remove |

---

### 2. SETUP.md

| Issue | Fix |
|-------|-----|
| Missing required accounts: Deepgram, Anthropic | Add to prerequisites table |
| Edge function deploy list includes deleted functions (`create-voice-clone`, `delete-voice-clone`, `preview-voice`) | Remove them, add `deepgram-proxy` |
| Missing secrets: `DEEPGRAM_API_KEY`, `ANTHROPIC_API_KEY`, `CRON_SECRET` | Add to `supabase secrets set` step |
| Step 5 for ElevenLabs mentions voice cloning setup | Remove cloning references |
| Step 8 cron job uses `Authorization: Bearer` but current code uses `X-Cron-Secret` header | Update to match actual implementation |
| No Deepgram setup section | Add section with account creation and API key steps |
| No Anthropic setup section | Add section |
| Verification checklist missing voice input test | Add |

---

### 3. ARCHITECTURE.md

| Issue | Fix |
|-------|-----|
| System diagram shows "Clone" under ElevenLabs | Remove, keep only "TTS" |
| Edge functions table lists `create-voice-clone`, `delete-voice-clone`, `preview-voice` | Remove them, add `deepgram-proxy` |
| Component tree is entirely wrong — lists files that don't exist (`AuthGuard`, `LoginForm`, `HistoryList`, `HistoryItem`, `Header`, `Navigation`, `MobileNav`, `PhoneInput`, `ReminderCard`, `VoiceRecorder`, `VoicePreview`) | Rewrite to match actual file structure |
| Missing component directories: `phone/` (has `CallCostEstimate`, `CountryPicker`, `InternationalPhoneInput`) | Fix |
| Database schema section still shows `user_voices` and `custom_voice_id` as active | Note as deprecated or remove |
| External integrations missing Deepgram and Anthropic | Add |
| ElevenLabs endpoints list voice clone/delete | Remove |
| Voice options list "Custom: User-cloned voices" | Remove |
| Missing: Voice-to-Form data flow | Add |

---

### 4. docs/API.md

| Issue | Fix |
|-------|-----|
| Documents `create-voice-clone`, `delete-voice-clone`, `preview-voice` endpoints | Remove entirely |
| `make-call` request body shows `"voice": "custom"` option and `customVoiceId` | Remove custom voice option |
| Missing `deepgram-proxy` endpoint documentation | Add (WebSocket, not HTTP) |
| `parse-voice-reminder` missing auth requirement (now requires JWT) | Update |
| `check-reminders` doesn't mention `X-Cron-Secret` header | Update auth section |

---

### 5. docs/DATABASE.md

| Issue | Fix |
|-------|-----|
| `user_voices` table documented as active | Mark as deprecated (table exists but feature removed) |
| `reminders.custom_voice_id` documented as active FK | Mark as deprecated |
| `reminders.voice` CHECK constraint still lists `'custom'` | Note it's unused |
| Missing `contacts` table documentation | Add (table exists and is actively used) |
| ER diagram shows `user_voices` relationship | Update |

---

### 6. docs/TROUBLESHOOTING.md

| Issue | Fix |
|-------|-----|
| "Voice Cloning Issues" section (lines 186-210) | Remove entirely |
| Missing: Voice input / Deepgram troubleshooting | Add section for speech-to-text issues |
| Edge function secrets list missing `DEEPGRAM_API_KEY`, `ANTHROPIC_API_KEY`, `CRON_SECRET` | Add |

---

### 7. docs/DEPLOYMENT.md

| Issue | Fix |
|-------|-----|
| Edge function secrets table missing `DEEPGRAM_API_KEY`, `ANTHROPIC_API_KEY`, `CRON_SECRET` | Add |
| Production checklist says "Test voice cloning" | Remove |
| Cron job setup uses `Authorization: Bearer` but code uses `X-Cron-Secret` | Update |

---

### 8. CHANGELOG.md

| Issue | Fix |
|-------|-----|
| Lists "Custom voice cloning via ElevenLabs" in Added | Move to a new "Removed" section |
| Missing recent additions: Voice-to-Form, Deepgram integration, medication reminders, contact picker, JWT auth on edge functions, log sanitization | Add |

---

### 9. CONTRIBUTING.md

| Issue | Fix |
|-------|-----|
| Code example shows `voice: 'custom'` in `ReminderPayload` interface (line 140) | Remove `'custom'` from union |
| Minor: component tree example is generic, not critical | Leave as-is |

---

### 10. SECURITY.md

| Issue | Fix |
|-------|-----|
| Contact email placeholder `[to be set up]` | Need actual email or GitHub security advisories link |
| "Voice Data" section references voice clones stored with ElevenLabs | Remove cloning references |
| Missing: Deepgram and Anthropic in third-party services | Add |

---

### 11. .env.example

| Issue | Fix |
|-------|-----|
| Missing: `DEEPGRAM_API_KEY`, `ANTHROPIC_API_KEY`, `CRON_SECRET` | Add as commented references |
| Uses `VITE_SUPABASE_ANON_KEY` but actual client uses `VITE_SUPABASE_PUBLISHABLE_KEY` | Fix variable name |

---

### Implementation approach

All 11 files will be updated in parallel. Changes are text-only with no functional code impact.

