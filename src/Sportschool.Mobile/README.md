# Sportschool Mobile

Expo + React Native mobile client for athlete and parent read-only flows.

## Local Start

```bash
npm install
EXPO_PUBLIC_API_BASE_URL=http://localhost:5062 npm start
```

Use `http://10.0.2.2:5062` for Android emulator when the API runs on the host machine.
Production builds require an HTTPS `EXPO_PUBLIC_API_BASE_URL`; the Expo config rejects missing or insecure values.

Supported MVP roles: `Athlete`, `Parent`.
