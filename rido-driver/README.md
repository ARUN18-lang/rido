# Rido Driver App

React Native (Expo) driver app for the Rido ride-sharing platform.

## Quick Start

```bash
cd rido-driver
npm install
npm start
```

## Features

- Driver OTP login
- KYC onboarding (personal details, document upload, vehicle registration)
- Online/offline toggle with background location tracking
- Incoming ride requests with countdown accept/decline
- Active ride state machine (pickup → OTP → in progress → cash collection)
- Earnings dashboard with weekly chart
- Mock API mode enabled by default

## Demo Flow (Mock Mode)

1. Login with any 10-digit phone (e.g. `9876543210` for approved driver)
2. Use `9000000000` to simulate new driver → KYC flow
3. Go **Online** on Home screen
4. Incoming ride appears after ~5 seconds
5. Accept → complete ride flow

## Configuration

Edit `app.config.js` — same as rider app (`API_BASE_URL`, `SOCKET_URL`, `USE_MOCK_API`).

## Project Structure

```
src/
├── theme/          Same design system as rider app
├── store/          auth, ride, earnings
├── services/       API, socket, locationTracker
├── navigation/     Auth, KYC, Main
├── screens/        auth, kyc, main, ride, earnings
└── components/     OnlineToggle, RideRequestCard, etc.
```
