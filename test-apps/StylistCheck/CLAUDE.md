# StylistCheck — Agent Guidelines

## Before every git commit

Run `npm run mds:doctor` (or `npx -y -p @mr.dj2u/cli@latest mds doctor --fast .`) before committing. Fix all errors first; warnings are OK to proceed with.

## Before moving to the next phase

Run doctor before beginning each new development phase. Resolve all errors before continuing.

## Spin up dev

Run `npm run clear-expo-start` (or `npx -y -p @mr.dj2u/cli@latest mds clear-expo-start .`) instead of bare `expo start` or `npx expo start`.
Kills port 8081, clears all Metro and Expo caches (including the Windows system cache), and starts `expo start --clear`.
Expo Router API routes work automatically in this mode.
Never fall back to a non-default port — always free the default port first.

## Spin up prod

Run `npm run serve:prod:fresh` to build and serve the production bundle.
# TodoForContext(optional): Confirm this command matches your deployment environment.
