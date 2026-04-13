# Family Care Organizer - PRD

## Original Problem Statement
App rejected by Apple App Store (Guideline 2.1a - App Completeness) due to "Sign in with Apple" bug. 
Backend is on Railway, reviewer on iPad Air 11-inch (M3) running iPadOS 26.4 couldn't sign in.
Railway logs showed multiple 422 Unprocessable Entity errors on POST /api/auth/login.

## Architecture
- **Frontend**: React Native / Expo (mobile app for iOS & Android)
- **Backend**: FastAPI (Python) deployed on Railway
- **Database**: MongoDB (on Railway)
- **Auth**: JWT tokens + Apple Sign-In (with identity token verification) + Google OAuth + Email/Password

## What's Been Implemented (Apr 13, 2026)

### Bug Fixes
1. Added `/api/health` health check endpoint
2. Added demo account auto-seeding on startup (DEMO_ACCOUNT_EMAIL/DEMO_ACCOUNT_PASSWORD env vars)
3. Custom 422 validation error handler with clear messages
4. Hardened Apple auth with input validation and logging
5. Hardened email/password login with better error messages
6. Auth flow logging on all endpoints

### Enhancement: Apple Identity Token Verification
- Backend fetches Apple's public keys from `https://appleid.apple.com/auth/keys` (cached 24h)
- Verifies JWT identity token using RS256 against Apple's keys
- Validates audience (`com.familycareorganizer.app`), issuer (`https://appleid.apple.com`), expiry
- Cross-checks `sub` claim matches the provided `user_id`
- **Graceful degradation**: If token verification fails, auth proceeds but logs a warning
- Response includes `token_verified: true/false` field
- Frontend updated to pass `credential.identityToken` to backend

### Files Modified
- `backend/server.py` - All backend fixes and Apple token verification
- `frontend/src/context/AuthContext.tsx` - Updated loginWithApple to pass identity token
- `frontend/app/index.tsx` - Updated handleAppleSignIn to send identity token

## Test Results
- 13/13 backend auth tests passing (100%)
- Health check, demo login, Apple auth (new/returning/empty/with-token), register, auth/me, Google auth

## Prioritized Backlog
- **P0**: Push all changes to GitHub -> Railway auto-deploys
- **P0**: Verify EXPO_PUBLIC_BACKEND_URL in EAS build config
- **P1**: Fix app.json placeholder projectId/owner
- **P2**: Add rate limiting on auth endpoints
- **P2**: Add Railway health check auto-restart config
