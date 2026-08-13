# Firebase Auth Setup

This app includes the MDS auth shell wired to Firebase Authentication through the Firebase JS SDK.

## Environment

Register a web app in Firebase, enable Email/Password authentication, then set:

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```

## Notes

- This variant uses the Firebase JS SDK so it works with Expo Go and universal Expo apps.
- React Native Firebase requires native code and a development build, so it is intentionally outside this source-copy variant.
- Legal acceptance and onboarding completion default to local app state in this branch. Add Firestore or another backend before using Firebase-authenticated legal audit trails in production.
