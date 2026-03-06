# Family Care Organizer - PRD

## Overview
A comprehensive mobile app for families managing elder care, based on "The Family Care Organizer" book. Enables multiple caregivers to collaborate on managing care for elderly loved ones with features covering medical, daily, legal, and financial aspects.

## Tech Stack
- **Frontend**: Expo (React Native) with Expo Router
- **Backend**: FastAPI (Python)
- **Database**: MongoDB (via motor async)
- **AI**: OpenAI GPT-4o-mini via emergentintegrations (medication interactions, smart reminders)
- **Auth**: JWT (email/password) + Emergent Google OAuth

## Features

### Authentication
- Email/password registration & login with JWT tokens
- Google OAuth via Emergent Auth
- Session management with 7-day expiry

### Care Recipient Management
- Create & edit care recipient profiles (personal info, medical conditions, allergies, blood type, health card, insurance, interests)
- Support for multiple care recipients per user
- Multi-caregiver collaboration (invite by email)

### Medical Management
- **Medications**: Track name, dosage, frequency, time, doctor, instructions
- **AI Medication Interaction Checker**: GPT-4o-mini powered drug interaction analysis
- **Doctors & Specialists**: Track doctor info, specialty, contact details

### Daily Care Tracking
- **Caregiver Notes**: Categorized notes (general, medical, behavior, dietary, activity, mood)
- **Daily Routine**: Time-of-day grouped activities (morning, afternoon, evening, night)
- **Bathing Tracker**: Bath type (full, sponge, shower, partial), assisted by
- **Nutrition & Meals**: Meal type, food items, dietary restrictions

### Safety & Incidents
- **Incident/Fall Logs**: Type, severity, description, injuries, action taken
- **Emergency Contacts**: Primary contact designation, relationships

### Planning & Admin
- **Appointments Calendar**: Date, time, doctor, location, type
- **Legal & Financial Checklist**: Legal/financial/insurance/estate items with status tracking
- **AI Smart Reminders**: GPT-4o-mini generated care reminders based on profile data

### Dashboard
- Overview stats (medications, appointments, notes, caregivers count)
- Quick action buttons
- Upcoming appointments
- Recent notes
- AI smart reminders

## Design
- Warm & caring theme: Terracotta (#D97757) primary, Sage (#5D8C7B) secondary
- Cream background (#FFFDF7) with clean white surface cards
- Tab-based navigation: Home, Profile, Meds, Notes, More
- 8pt spacing grid, minimum 44px touch targets

## API Endpoints
- `/api/auth/*` - Authentication
- `/api/care-recipients/*` - Care recipient CRUD
- `/api/care-recipients/{id}/medications/*` - Medications
- `/api/care-recipients/{id}/emergency-contacts/*` - Emergency contacts
- `/api/care-recipients/{id}/doctors/*` - Doctors
- `/api/care-recipients/{id}/notes/*` - Caregiver notes
- `/api/care-recipients/{id}/incidents/*` - Incidents
- `/api/care-recipients/{id}/bathing/*` - Bathing tracker
- `/api/care-recipients/{id}/appointments/*` - Appointments
- `/api/care-recipients/{id}/routines/*` - Daily routines
- `/api/care-recipients/{id}/nutrition/*` - Nutrition
- `/api/care-recipients/{id}/legal-financial/*` - Legal/financial
- `/api/ai/medication-interactions` - AI drug interaction check
- `/api/ai/smart-reminders` - AI smart reminders
- `/api/dashboard/{id}` - Dashboard data
