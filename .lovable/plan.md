

# Yaad - Voice Call Reminder App
## Implementation Plan

### Overview
A mobile-first PWA that lets users schedule automated voice call reminders. The app features a polished iOS-inspired design with blue/white color scheme, bottom tab navigation, and card-based UI components.

---

## Phase 1: Foundation & Design System

**Setup the visual foundation:**
- Configure the design system with primary blue (#3B82F6), success green, error red, and warning amber colors
- Set up Inter font or system sans-serif
- Create reusable styled components matching iOS design language (rounded cards, subtle shadows)
- Configure PWA with vite-plugin-pwa, app manifest, and mobile meta tags
- Create app icon and splash screen assets

---

## Phase 2: Navigation & Layout

**Build the app shell:**
- Create bottom tab navigation with 4 tabs: Home, History, Voices, Profile
- Add the blue floating action button (+) centered above tabs
- Set up React Router for navigation between screens
- Create page layout wrapper with consistent header styling
- Add mobile viewport handling and safe area padding

---

## Phase 3: Authentication

**Implement user auth with Lovable Cloud:**
- Create Welcome/Landing screen with logo, tagline, and sign up/login buttons
- Build Sign Up screen with email, password, confirm password fields
- Build Login screen with email and password fields
- Set up Supabase authentication integration
- Add protected route handling to redirect unauthenticated users
- Create user profile on first sign up

---

## Phase 4: Database Schema

**Set up the database structure:**
- Create `profiles` table with user preferences and default voice selection
- Create `reminders` table for storing scheduled reminders
- Create `call_history` table for tracking call outcomes
- Configure Row Level Security so users can only access their own data
- Set up database trigger to auto-create profile on signup

---

## Phase 5: Home Screen (Reminders Dashboard)

**Build the main dashboard:**
- Header with user avatar, title, and settings icon
- Active/Upcoming tab switcher
- Reminder cards showing recipient, schedule, and toggle switch
- Card interactions: toggle to enable/disable, tap to edit
- Empty state with helpful message and call-to-action
- Real-time updates from Supabase

---

## Phase 6: Create Reminder Form

**Build the reminder creation flow:**
- Modal/full-screen form with proper header and close button
- Recipient section: name input and UK phone number with +44 prefix
- Schedule section: date/time picker and frequency selection (Once/Daily/Weekly)
- Message section: textarea with 500 character limit and counter
- Voice selection: two cards for Friendly Female and Friendly Male
- Form validation matching all specified rules
- Save to database and return to Home screen

---

## Phase 7: History Screen

**Build the call activity view:**
- Header with title and placeholder search icon
- Filter tabs: All, Answered, Missed, Voicemail
- Call history cards with status indicators (green/red/yellow dots)
- Status text showing outcome and timing
- Empty state for no history
- Mock data insertion for demo purposes (since actual calling is external)

---

## Phase 8: Voices Screen

**Build the voice gallery:**
- Currently active voice card with "ACTIVE" badge
- Voice grid with Friendly Female and Friendly Male options
- Select voice functionality to set user's default preference
- Play button placeholders showing "Preview coming soon" toast
- Filter pills (only "All" functional for MVP)

---

## Phase 9: Profile Screen

**Build user settings:**
- User info card with avatar and email
- Preferences section: default voice link, country display
- Account section: change password placeholder, logout functionality
- About section: help, privacy, terms placeholders
- App version display
- Logout confirmation and redirect to Welcome screen

---

## Phase 10: Polish & PWA

**Final touches:**
- Ensure responsive design works on all mobile screen sizes
- Add loading states and transitions
- Implement toast notifications for actions
- Test PWA install flow on mobile browsers
- Create install instructions page at `/install`
- Add offline support basics
- Review and polish all interactions

---

## What's Included in MVP

✅ Full authentication flow (signup, login, logout)
✅ Create, view, toggle, and edit reminders
✅ View call history (with mock data for demo)
✅ Select between 2 voices
✅ Mobile-first PWA that can be installed to home screen
✅ Polished iOS-inspired UI matching the design spec
✅ Secure database with proper RLS policies

## What's Deferred (External Integration)

🔲 Actual voice call execution (Twilio)
🔲 Text-to-speech conversion (ElevenLabs)
🔲 Voice preview playback
🔲 Real-time call status updates

