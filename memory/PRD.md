# Family Care Organizer - PRD

## Architecture
- **Frontend**: React Native / Expo (iOS & Android)
- **Backend**: FastAPI on Railway + MongoDB
- **Auth**: JWT + Apple Sign-In (with identity token verification) + Google OAuth + Email/Password

## What's Been Implemented (Apr 13, 2026)

### Session 1 - Auth Bug Fixes
- Health check endpoint, demo account seeding, 422 error handler, Apple auth hardening, identity token JWT verification

### Session 2 - Code Quality Fixes
- XSS fix in +html.tsx, 41 hook dependency fixes, useMemo on context providers, 6 index-as-key fixes

### Session 3 - Component Extraction (Oversized Components)
**appointments.tsx**: 1055 → 856 lines (-199 lines)
- Extracted `AppointmentCard` (110 lines) → `src/components/appointments/AppointmentCard.tsx`
- Extracted `AISummaryModalContent` (47 lines) → `src/components/appointments/AISummaryModal.tsx`
- Removed duplicated card/summary styles from parent

**legal-financial.tsx**: 704 → 650 lines (-54 lines)
- Extracted `LegalItemCard` (107 lines) → `src/components/legal-financial/LegalItemCard.tsx`
- Removed duplicated card styles and helper functions from parent

### Files Changed (16 total across all sessions)
**Modified (13):** server.py, AuthContext.tsx, SubscriptionContext.tsx, +html.tsx, index.tsx, appointments.tsx, legal-financial.tsx, privacy-settings.tsx, nutrition.tsx, medication-checker.tsx, about-book.tsx, profile.tsx, paywall.tsx
**New (3):** AppointmentCard.tsx, AISummaryModal.tsx, LegalItemCard.tsx

## Remaining Backlog
- **P0**: Push all changes to GitHub → Railway auto-deploys
- **P1**: Remove 62 console.log statements before production
- **P1**: Further component extraction: emergency-contacts (449 lines), export-report (404 lines), notes-tab (409 lines)
- **P2**: Increase TypeScript/Python type coverage
