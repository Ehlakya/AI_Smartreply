# AI Mail Reply Assistant - Backend

This backend powers the AI-Powered Smart Mail Reply Assistant. It provides secure Google OAuth integration, Gmail API syncing, and advanced AI email parsing via the **Groq SDK** (Llama 3.3).

## Prerequisites
- Node.js v18+
- MongoDB Community Server (Local) or MongoDB Atlas (Cloud)
- Google Cloud Platform Account
- Groq Console Account

## Setup Instructions

### 1. Configure Groq AI
We use Groq (Llama 3.3) for blazing-fast AI inference.
1. Go to the [Groq Console](https://console.groq.com/keys).
2. Create an API Key.
3. Open `Backend/.env` and paste your key into `GROQ_API_KEY`.

### 2. Configure Google Cloud
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Enable **Gmail API** and **Google People API**.
3. Create an **OAuth 2.0 Client ID (Web Application)**.
4. Set Authorized JavaScript Origins to `http://localhost:5173`.
5. Set Authorized Redirect URIs to `http://localhost:5000/api/auth/google/callback`.
6. Paste the Client ID and Secret into `Backend/.env`.

### 3. Run the Server
```bash
cd Backend
npm install
npm run dev
```

If everything is configured correctly, you will see a pristine list of checkmarks:
```text
✓ Environment Loaded
✓ Environment Validated
✓ MongoDB Connected
✓ Google OAuth Ready
✓ Express Initialized
✓ Express Server Running on Port 5000
```
