# Security Specification & Test Matrix: Family Wealth & Debt Vault

## 1. Data Invariants
1. **Default-Deny Catch-All**: No unauthenticated client can read or modify any document or subcollection.
2. **Path Variable Hardening**: Document IDs (such as `{vaultId}` and `{logId}`) must be string tokens `<= 128` characters matching `^[a-zA-Z0-9_\-]+$`.
3. **Currency Integrity**: Vault currency is strictly immutable and bounded to `"AED"`. Any write specifying another currency (USD, EUR, etc.) is rejected.
4. **Schema Strictness**: Payloads must strictly match defined entity attributes; shadow fields or unregistered keys are rejected via `hasOnly()`.
5. **Array Cardinality Safeguards**: Arrays (loans, incomes, essentials, payments, members) must have strict upper bounds to prevent resource exhaustion and denial-of-wallet attacks.
6. **No Blanket List Scraping**: Collection root listing (`/vaults`) is forbidden; reads are strictly addressed single-document gets.
7. **Audit & Log Immutability**: Subcollection activity logs `/vaults/{vaultId}/logs/{logId}` can be appended with valid structure but cannot be modified or forged once written.
8. **Administrative Boundaries**: Hard deletion of a family vault document is restricted to the verified family administrator (`bluephoenixgamer123@gmail.com`).

## 2. The "Dirty Dozen" Attack Payloads (Must Return PERMISSION_DENIED)
1. **Unauthenticated Read**: Attempting to `get` `/vaults/primary` without an active auth token.
2. **Unauthenticated Write**: Attempting to `create` `/vaults/primary` without an active auth token.
3. **Invalid ID Injection**: Attempting to write to `/vaults/../../evilPath` or IDs with junk characters `!@#$%^&*()`.
4. **Invalid Currency (Non-AED)**: Setting `currency: "USD"` instead of `"AED"`.
5. **Shadow Field Injection**: Injecting `{ "backdoorAdmin": true }` or rogue fields not in the blueprint schema.
6. **Denial-of-Wallet Array Overflow**: Injecting an unbounded array of 10,000 artificial payment entries to exhaust Firestore client memory and bandwidth.
7. **Missing Required Fields**: Attempting to create a vault without `version`, `currency`, or `updatedAt`.
8. **Blanket Collection Query**: Executing a broad `collection(db, 'vaults')` query to scrape other tenants' vaults.
9. **Log Tampering / Overwrite**: Attempting an `update` on an existing immutable activity log document.
10. **Unverified Admin Spoofing**: Attempting an admin delete with `email_verified: false`.
11. **Type Poisoning**: Sending `version: "invalid_string"` instead of a number.
12. **Malformed Activity Log**: Attempting to write a log entry without `memberName`, `action`, or `timestamp`.
