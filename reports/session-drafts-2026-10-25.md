# Session continuity and form recovery

Implemented locally on 2026-10-25. No production deployment was performed.

## Behavior

- Patient registration/editing and all four care modules protect incomplete form data as drafts.
- Drafts are written to sessionStorage after 30 seconds without changes, or within 120 seconds during continuous editing. Navigation, pagehide, hidden-tab and session-ending events flush pending edits immediately.
- No HTTP requests, patient records, encounters, inventory movements, invoices or consents are created by autosave. Explicit Save retains the existing validation and server workflow.
- Draft keys include tenant, user, module, and existing record ID (or a separate new-record key). Recovery requires the same account, clinic and tab, and asks before applying the draft.
- Drafts expire after 24 hours, are removed after successful explicit saving, and remain available after an unsuccessful request. Edits made during an update request remain pending after the submitted snapshot is acknowledged.
- Drafts include nested medical fields, selected patient/doctor, inventory selection, bed selection and incomplete outpatient clinical-profile edits. The original clinical-profile version is retained for server conflict detection.
- Pending files, camera captures and queued consent documents are not serialized. The form displays this limitation. Closing the tab/browser is outside the recovery guarantee; these are tab-local drafts, not cloud backups.

## Sessions

- POST /auth/renew-session requires the existing authentication middleware and an active account. It keeps the same session version and original session start; a replaced or expired token cannot renew.
- New access tokens have a lifetime of min(JWT_EXPIRES_IN, 30 minutes, remaining eight-hour day). Existing legacy tokens can renew using their original iat as the session start.
- Human pointer, keyboard, input and scroll events count as activity, throttled to once per second. Activity is shared between tabs of the same logical session, with storage writes capped at one per five seconds. HTTP requests and draft timers never count as activity.
- The client checks deadlines every 15 seconds outside Angular's zone, renews near expiration when there has been human activity, and avoids overlapping renewal requests. A five-minute warning offers Continue session unless the eight-hour maximum is approaching.
- Thirty minutes of inactivity or the original eight-hour maximum ends the session. The current form is flushed before credentials are cleared. Logging in as the same account restores the route so the user can recover the draft.
- The existing single-session policy remains: a new login increments the account version and invalidates every token from the previous logical session. Renewals never increment it. Account row locking now serializes simultaneous logins so they cannot receive the same version. Multiple browser tabs can share a single session.
- Auth initialization runs from AppComponent after AuthService construction, avoiding a constructor/interceptor dependency cycle. Late auth/renewal responses cannot restore cleared credentials.

## Verification

- Backend full test suite and frontend test suites cover renewal deadlines, revoked/expired tokens, stale responses, route recovery, autosave timing, scope isolation, recovery, storage failures and clinical-profile conflicts.
- RUN_SESSION_DB_TEST=1 node --test dist/tests/session-renewal.test.js validates concurrent version allocation in a generated disposable local MySQL database, then drops only that generated database. No existing patient or user data is changed.
- Frontend session/draft regressions can be rerun with npm run test:session-drafts.
- Deploy the backend and frontend together: an older backend has no renewal endpoint. No schema migration is needed for the session/draft functionality itself.

Final checks: backend 64 passed, 1 pre-existing schema integration suite skipped; frontend 32 passed. Production frontend build passed (initial bundle 475.82 kB). The real local MySQL concurrent-session test passed and its disposable database was removed.
