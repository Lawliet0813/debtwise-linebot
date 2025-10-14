# DebtWise LINE Bot

Minimal Express server for LINE Messaging API webhooks.

## Prerequisites

- Node.js 18 or later
- LINE Messaging API channel credentials

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
3. Update `.env` with your LINE channel access token and secret.

## Development

Start the webhook server locally:

```bash
npm run dev
```

The server listens on the port defined in `.env` (default `3000`) and exposes the `POST /webhook` endpoint.
