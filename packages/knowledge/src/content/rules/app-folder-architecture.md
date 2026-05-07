# App Folder Architecture Rule

Keep Expo Router route files focused on routing, layout, screen composition, and
small view-state glue.

Warn when route files:

- exceed the configured line budget,
- import database clients directly,
- contain heavy form or business logic,
- duplicate large UI chunks,
- use browser globals without a client-only guard.

