# Yaad - Voice Reminder Calls

<p align="center">
  <img src="public/yaad-logo.png" alt="Yaad Logo" width="120" />
</p>

<p align="center">
  <strong>Stay connected with the people who matter most</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#documentation">Documentation</a> •
  <a href="#contributing">Contributing</a>
</p>

---

## What is Yaad?

**Yaad** (meaning "memory" in Hindi/Urdu) is a voice reminder application that helps you stay connected with loved ones through personalized phone calls. Schedule reminders for yourself or others, and Yaad will call at the scheduled time with your custom message delivered in a natural, AI-generated voice.

### Why Yaad?

- 📞 **Voice Calls, Not Texts**: Sometimes a call means more than a message
- ⏰ **Flexible Scheduling**: One-time, daily, weekly, or custom frequency reminders
- 👨‍👩‍👧‍👦 **Family-Friendly**: Perfect for reminding elderly parents about medications or checking in
- 🌍 **International Support**: Works with phone numbers worldwide
- 🎙️ **Voice-to-Form**: Speak your reminder naturally and AI fills in the details

## Features

### Core Features
- ✅ Schedule voice reminder calls
- ✅ Choose from preset AI voices (friendly female/male)
- ✅ Recurring reminders (daily, weekly, custom frequencies)
- ✅ Voice-to-Form: speak a reminder and AI parses it into structured fields
- ✅ Medication reminder templates
- ✅ Call history tracking with detailed status
- ✅ Contact management with contact picker
- ✅ International phone number support with cost estimates
- ✅ Mobile-responsive PWA

### Voice Options
- **Friendly Female**: Natural-sounding AI voice
- **Friendly Male**: Natural-sounding AI voice

### Integrations
- **Twilio**: Reliable phone call delivery
- **ElevenLabs**: Advanced AI voice synthesis (text-to-speech)
- **Deepgram**: Real-time speech-to-text for voice input
- **Anthropic Claude**: AI-powered natural language parsing
- **Supabase**: Secure authentication, database, storage, and edge functions

## Quick Start

### Prerequisites
- Node.js 18+
- npm or bun
- Supabase account
- Twilio account
- ElevenLabs account
- Deepgram account
- Anthropic account

### Installation

```bash
# Clone the repository
git clone https://github.com/karanperi/call-me-back-soon.git
cd call-me-back-soon

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
```

See [SETUP.md](SETUP.md) for detailed setup instructions.

## Documentation

| Document | Description |
|----------|-------------|
| [SETUP.md](SETUP.md) | Local development setup |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture overview |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contribution guidelines |
| [docs/API.md](docs/API.md) | Edge function API reference |
| [docs/DATABASE.md](docs/DATABASE.md) | Database schema |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Deployment guide |
| [docs/TESTING.md](docs/TESTING.md) | Testing strategy |
| [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Common issues |

## Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library
- **React Router** - Navigation
- **TanStack Query** - Data fetching

### Backend
- **Supabase** - Database, Auth, Storage, Edge Functions
- **PostgreSQL** - Database (via Supabase)
- **Deno** - Edge function runtime

### External Services
- **Twilio** - Voice calls
- **ElevenLabs** - AI voice synthesis (TTS)
- **Deepgram** - Speech-to-text (voice input)
- **Anthropic Claude** - Natural language parsing

## Project Structure

```
call-me-back-soon/
├── src/
│   ├── components/       # React components
│   │   ├── auth/         # Authentication (ProtectedRoute)
│   │   ├── contacts/     # Contact management (ContactCard, ContactForm, ContactPicker)
│   │   ├── history/      # Call history (CallHistoryDetailDialog)
│   │   ├── layout/       # Layout (AppLayout, BottomNav, PageHeader)
│   │   ├── phone/        # Phone input (InternationalPhoneInput, CountryPicker, CallCostEstimate)
│   │   ├── reminders/    # Reminder scheduling (CreateReminderDialog, EditReminderDialog, MedicationReminderForm, VoiceInputSection, FrequencyPicker, TemplatePicker, etc.)
│   │   ├── ui/           # shadcn/ui components
│   │   └── voices/       # Voice selection (VoiceSelector)
│   ├── config/           # App configuration (countries, pricing)
│   ├── hooks/            # Custom React hooks (useAuth, useReminders, useContacts, useCallHistory, useVoiceRecorder, useVoiceReminderParser, etc.)
│   ├── integrations/     # Supabase client
│   ├── lib/              # Utilities (phoneUtils, medicationUtils, recurrenceUtils, timezones)
│   ├── pages/            # Route pages (Home, History, Contacts, Voices, Profile, Login, SignUp, Welcome)
│   └── test/             # Test utilities
├── supabase/
│   ├── functions/        # Edge functions
│   │   ├── check-reminders/
│   │   ├── deepgram-proxy/
│   │   ├── make-call/
│   │   ├── parse-voice-reminder/
│   │   └── twilio-status-callback/
│   └── migrations/       # Database migrations
└── docs/                 # Documentation
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Security

For security concerns, please see [SECURITY.md](SECURITY.md).

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [Lovable](https://lovable.dev) - AI-powered development
- [Twilio](https://twilio.com) - Voice API
- [ElevenLabs](https://elevenlabs.io) - Voice AI
- [Deepgram](https://deepgram.com) - Speech-to-text
- [Anthropic](https://anthropic.com) - AI language models
- [Supabase](https://supabase.com) - Backend infrastructure

---

<p align="center">
  Made with ❤️ for staying connected
</p>
