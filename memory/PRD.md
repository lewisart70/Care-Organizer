# Family Care Organizer - PRD

## Original Problem Statement
App rejected by Apple App Store (Guideline 2.1a - App Completeness) due to "Sign in with Apple" bug. 
Backend is on Railway, reviewer on iPad Air 11-inch (M3) running iPadOS 26.4 couldn't sign in.
Railway logs showed multiple 422 Unprocessable Entity errors on POST /api/auth/login.
A failed build from Apr 1 also existed but the active deployment from Mar 31 was running.

## Architecture
- **Frontend**: React Native / Expo (mobile app for iOS & Android)
- **Backend**: FastAPI (Python) deployed on Railway
- **Database**: MongoDB (on Railway)
- **Auth**: JWT tokens + Apple Sign-In + Google OAuth + Email/Password
- **Integrations**: OpenAI (Whisper STT, GPT-4o-mini), Resend (email), RevenueCat (subscriptions)

## User Personas
1. Primary Caregiver - manages care recipients, medications, appointments
2. Secondary Caregiver - views and updates shared care information
3. Apple App Reviewer - tests login flow with Sign in with Apple

## Core Requirements (Static)
- Multi-auth support: Email/Password, Apple Sign-In, Google Sign-In
- Care recipient management with medical records
- Medication tracking and reminders
- Appointment management with AI summarization
- Incident reporting and tracking
- PDF report generation and email delivery
- PIPEDA/HIPAA compliance

## What's Been Implemented (Apr 13, 2026)

### Bug Fixes Applied
1. **Added `/api/health` endpoint** - Health check for Railway monitoring and Apple review verification
2. **Added demo account seeding on startup** - Uses DEMO_ACCOUNT_EMAIL / DEMO_ACCOUNT_PASSWORD env vars to auto-create a demo account so Apple reviewers can test
3. **Custom validation error handler** - 422 errors now return clear messages like "Missing required fields: email, password" instead of raw Pydantic errors
4. **Hardened Apple auth endpoint** - Added input validation (empty user_id check), comprehensive logging, and try/catch for unexpected errors
5. **Hardened email/password login** - Added logging, better error messages indicating correct auth method (Apple/Google/email)
6. **Auth flow logging** - All auth endpoints now log attempts, successes, and failures for debugging

### Root Cause Analysis
- The 422 errors were from malformed login requests (likely Apple reviewer trying email/password without a demo account or with wrong format)
- No /api/auth/apple requests appeared in Railway logs, suggesting either: (a) the app's EXPO_PUBLIC_BACKEND_URL wasn't baked into the EAS build, or (b) the native Apple Sign-In step failed before reaching the backend
- The backend was confirmed to be running and responsive on Railway

## Prioritized Backlog
- **P0**: Push fixed server.py to GitHub so Railway auto-deploys (USER ACTION NEEDED)
- **P0**: Verify EXPO_PUBLIC_BACKEND_URL is correctly set in EAS build configuration
- **P1**: Add eas.json build config if missing (currently has placeholder projectId)
- **P1**: Add Railway health check configuration to auto-restart on failures
- **P2**: Add rate limiting on auth endpoints
- **P2**: Add Apple identity token verification (validate JWT from Apple)

## Next Tasks
1. User pushes code to GitHub -> Railway auto-deploys
2. User verifies the backend health at https://care-organizer-production.up.railway.app/api/health
3. User sets DEMO_ACCOUNT_EMAIL and DEMO_ACCOUNT_PASSWORD in Railway env vars (if not already set)
4. User rebuilds the iOS app with EAS and resubmits to Apple
