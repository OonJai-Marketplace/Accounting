# Fresh-login session check v142.65

The interface loads the shared inactivity settings before profile hydration. The v142.64 guard compared the requested user to `liveProfile`, which is empty on a fresh sign-in, and incorrectly stopped login with “Account changed while loading session settings.”

The guard now checks the authenticated Supabase session, login generation, database client, and effective workspace. It allows profile loading to happen later and preserves protection against sign-out, real account changes, and administrator workspace switches. The source module and deployed bundle are synchronized; the changed assets use v142.65 cache keys.

Twenty-two regressions pass, including the actual deployed login coordinator with an initially empty profile. No additional SQL or password reset is required for this correction. The two server steps described in LOGIN-REPAIR-v142.64.md remain applicable when they have not already been completed.
