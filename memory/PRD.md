# Family Care Organizer - PRD

## Original Problem Statement
App rejected by Apple App Store (Guideline 2.1a) due to "Sign in with Apple" bug.

## Architecture
- **Frontend**: React Native / Expo (iOS & Android)
- **Backend**: FastAPI on Railway + MongoDB
- **Auth**: JWT + Apple Sign-In (with identity token verification) + Google OAuth + Email/Password

## What's Been Implemented (Apr 13, 2026)

### Session 1 - Auth Bug Fixes
- Added `/api/health` health check endpoint
- Added demo account auto-seeding on startup
- Custom 422 validation error handler with clear messages
- Hardened Apple auth with input validation, logging, error handling
- Apple identity token JWT verification (RS256 via Apple public keys)

### Session 2 - Code Quality Fixes (from code review)
**Critical:**
- Fixed XSS vulnerability in `app/+html.tsx` — extracted static CSS to module constant
- Fixed 41 missing React hook dependencies across AuthContext, SubscriptionContext, and app files

**Important:**
- Added `useMemo` to AuthContext.Provider and SubscriptionContext.Provider values (prevents unnecessary re-renders)
- Fixed 6 instances of index-as-key in lists (profile.tsx, nutrition.tsx, medication-checker.tsx, about-book.tsx, paywall.tsx, privacy-settings.tsx)
- Removed stale closure risk by using functional updater in `acceptDisclaimer` (`setUser(prev => ...)`)
- Converted `loadDataPolicy` to useCallback in privacy-settings.tsx

### Files Modified (11 total)
- `backend/server.py` — Auth hardening + Apple token verification
- `frontend/src/context/AuthContext.tsx` — Hook deps, useMemo, extracted helper
- `frontend/src/context/SubscriptionContext.tsx` — Hook deps, useMemo, cleanup
- `frontend/app/+html.tsx` — XSS fix
- `frontend/app/index.tsx` — Hook deps, identity token passthrough
- `frontend/app/privacy-settings.tsx` — useCallback, key fix
- `frontend/app/nutrition.tsx` — Key fix
- `frontend/app/medication-checker.tsx` — Key fix
- `frontend/app/about-book.tsx` — Key fix
- `frontend/app/(tabs)/profile.tsx` — Key fixes (3)
- `frontend/app/paywall.tsx` — Key fix

## Test Results
- 7/7 backend auth tests passing (100%) after all code quality fixes

## Remaining Backlog
- **P0**: Push changes to GitHub -> Railway auto-deploys
- **P0**: Verify EXPO_PUBLIC_BACKEND_URL in EAS build config
- **P1**: Extract large components into smaller sub-components (appointments: 610 lines, legal-financial: 591 lines)
- **P1**: Remove 62 console.log statements before production
- **P2**: Add rate limiting on auth endpoints
- **P2**: Increase TypeScript/Python type coverage
