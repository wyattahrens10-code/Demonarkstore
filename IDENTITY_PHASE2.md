# Player identity Phase 2: Store shadow integration

This phase prepares DemonArk Store to read and sync the canonical Postgres identity without removing its existing MySQL profile table.

## Safety gates

- Both read and sync flags default to false.
- MySQL remains the fallback whenever canonical reads are disabled, missing, or unavailable.
- An EOSID sync is permitted only after the customer explicitly acknowledges the EOSID in the mandatory checkout modal.
- This is an acknowledgement, not proof of ARK-account ownership.
- Editing an EOSID clears its acknowledgement until the customer confirms it again at checkout.
- Sync cannot create a new game identity because no player name is sent. The game/admin must already know the EOSID.
- Failed writes stay recorded in a durable outbox using error codes only; no secrets or identity values are logged there.

## Variables

PLAYER_IDENTITY_API_BASE_URL=https://demonarkadmin.up.railway.app
INTERNAL_PLAYER_SERVICE_TOKEN=<same 64-hex token as backend>
PLAYER_IDENTITY_READ_ENABLED=false
PLAYER_IDENTITY_SYNC_ENABLED=false

Do not enable either flag merely by deploying this change.

## Rollout order

1. Deploy with both flags false and verify Store login, account identity, Discord, and checkout.
2. Set the same 64-hex internal service token on the Store and backend Railway services.
3. Enable sync for a controlled checkout test after confirming the modal appears.
5. Confirm the same record is returned by EOSID and Tip4Serv ID in Postgres.
6. Enable canonical reads, retaining MySQL fallback.
7. Observe the outbox before widening the rollout.
