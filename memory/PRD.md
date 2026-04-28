# Family Care Organizer - PRD

## Architecture
- **Frontend**: React Native / Expo (iOS & Android)
- **Backend**: FastAPI on Railway + MongoDB
- **AI**: OpenAI SDK (gpt-4o-mini, gpt-4o, whisper-1) via OPENAI_API_KEY

## All Changes (Apr 13, 2026)

### Session 1 - Auth Bug Fixes
- Health check, demo account seeding, 422 handler, Apple auth hardening, identity token verification

### Session 2 - Code Quality
- XSS fix, 41 hook dependency fixes, useMemo on contexts, 6 index-as-key fixes

### Session 3 - Component Extraction
- AppointmentCard, AISummaryModal, LegalItemCard

### Session 4 - Console Removal
- Removed all 48 console statements from 26 frontend files

### Session 5 - Railway Build Fix
- **Root cause**: `emergentintegrations` is an Emergent-internal package not on PyPI
- Replaced all 5 AI usage sites with direct `openai` SDK (`AsyncOpenAI`):
  - STT: `openai.audio.transcriptions.create()` (whisper-1)
  - Chat: `openai.chat.completions.create()` (gpt-4o-mini / gpt-4o)
- Added `ai_chat_completion()` and `clean_json_response()` helpers
- Removed `emergentintegrations==0.1.0` from requirements.txt
- Env var: `OPENAI_API_KEY` (falls back to `EMERGENT_LLM_KEY`)

### Total: 33 files (30 modified + 3 new)

## Railway Deployment Checklist
1. Push to GitHub
2. Add `OPENAI_API_KEY` env var in Railway (standard OpenAI key)
3. Verify health: https://care-organizer-production.up.railway.app/api/health
