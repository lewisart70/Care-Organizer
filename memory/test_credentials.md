# Test Credentials

## Demo Account (for Apple Review)
- Email: demo@familycareorganizer.com
- Password: Demo2026!
- Note: Auto-seeded on backend startup when DEMO_ACCOUNT_EMAIL and DEMO_ACCOUNT_PASSWORD env vars are set

## Test Apple Auth
- Apple User ID: any valid Apple user ID from AppleAuthentication SDK
- Endpoint: POST /api/auth/apple
- Body: {"user_id": "<apple_user_id>", "email": "<optional>", "full_name": "<optional>"}

## Test Google Auth
- Endpoint: POST /api/auth/google
- Body: {"google_user_id": "<google_id>", "email": "<email>", "name": "<name>", "picture": "<url>"}
