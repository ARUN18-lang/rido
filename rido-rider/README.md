# Rido Rider App

React Native (Expo) rider app for the Rido ride-sharing platform.

## Quick Start

```bash
cd rido-rider
npm install
npm start
```

## Features

- OTP authentication with profile setup
- Onboarding flow (3 slides)
- Home screen with map, destination search, recent places
- Solo / Shared / Women's Ride booking flow
- Pool matching, driver search, live ride tracking
- SOS safety (long-press), emergency contacts
- Profile, ride history, wallet
- Tamil + English (i18next)
- Mock API mode enabled by default (`USE_MOCK_API: true` in `app.config.js`)

## Configuration

Edit `app.config.js`:

- `API_BASE_URL` — backend URL (default `http://localhost:3000/api/v1`)
- `SOCKET_URL` — Socket.io server
- `USE_MOCK_API` — set `false` to use live backend
- `GOOGLE_MAPS_API_KEY` — for Places/Directions

## Project Structure

```
src/
├── theme/          Design system (shared with driver app)
├── constants/      API endpoints, ride enums
├── store/          Zustand (auth, ride, app prefs)
├── services/       API, socket, location, mock data
├── hooks/
├── navigation/
├── screens/
├── components/
└── i18n/
```
