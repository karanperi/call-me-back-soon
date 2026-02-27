# Changelog

All notable changes to Yaad will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project setup with Vite + React + TypeScript
- User authentication (sign up, sign in, sign out)
- Reminder scheduling with one-time, daily, weekly options
- Custom frequency scheduling (every N days/weeks/months, specific days of week)
- Voice selection (friendly female, friendly male)
- Phone call delivery via Twilio
- Call history tracking with detailed status dialog
- Contact management with contact picker
- Medication reminder templates
- Voice-to-Form: speak a reminder and AI parses it into structured fields
- Deepgram integration for real-time speech-to-text (voice input)
- Anthropic Claude integration for natural language parsing
- International phone number input with country picker and cost estimates
- Mobile-responsive design
- PWA support

### Security
- JWT authentication on all user-facing edge functions
- X-Cron-Secret header authentication for cron-triggered functions
- Sensitive data sanitized from edge function logs
- Row Level Security (RLS) on all database tables

### Removed
- Custom voice cloning via ElevenLabs (feature and edge functions removed)

### Technical
- Supabase integration for database, auth, storage, and edge functions
- ElevenLabs integration for text-to-speech
- Twilio integration for voice calls
- Deepgram integration for speech-to-text
- Anthropic integration for AI parsing
- Row Level Security (RLS) for data isolation
- Status callback webhooks for call tracking

## [0.1.0] - 2025-01-24

### Added
- Initial release
- Core reminder functionality
- Basic voice options

---

## Version History Legend

- **Added**: New features
- **Changed**: Changes in existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security improvements
