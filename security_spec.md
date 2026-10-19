# Firebase Security Specification: Pedigree Pigeons

## 1. Data Invariants
1. **Default-Deny Catch-All**: All document paths default to no read and no write (`match /{document=**} { allow read, write: if false; }`).
2. **Owner Identity Invariant**: For every document in `/projects/{projectId}`, `request.auth.uid == resource.data.userId` for read/update/delete, and `request.auth.uid == request.resource.data.userId` for create.
3. **Immutable Ownership**: The `userId` field cannot be modified during updates (`incoming().userId == existing().userId`).
4. **Project ID Poisoning Guard**: Document ID `projectId` must be a valid sanitized string matching `^[a-zA-Z0-9_\-]+$` and `<= 128` chars.
5. **Payload Boundaries**: String fields have strict `.size() <= MAX` bounds; arrays (like `pigeons`) must not exceed 35 entries.
6. **No Client Query Delegation**: List queries on `projects` explicitly require `resource.data.userId == request.auth.uid`.
7. **User Profile Isolation**: Users can only read and write their own profile document `/users/{userId}` where `request.auth.uid == userId`.

## 2. The "Dirty Dozen" Payloads (Adversarial Tests)
1. **Unauthenticated Read**: Attempt to read `/projects/proj-1` without `request.auth` -> Denied.
2. **Unauthenticated List**: Attempt to query `/projects` without `request.auth` -> Denied.
3. **Cross-User Read**: User B attempts to read `/projects/proj-userA` -> Denied.
4. **Cross-User Update**: User B attempts to update User A's project -> Denied.
5. **Cross-User Delete**: User B attempts to delete User A's project -> Denied.
6. **Owner Spoofing on Create**: User B submits `userId: "userA"` in incoming payload -> Denied.
7. **Identity Hijack on Update**: User A attempts to mutate `userId: "userB"` -> Denied.
8. **ID Poisoning Attack**: User attempts write to `/projects/bad..id/injection` or 1KB long ID -> Denied.
9. **Shadow Field Attack**: User attempts to inject `{ isSuperAdmin: true }` into project -> Denied.
10. **Denial of Wallet Payload**: User attempts to inject a 10MB string or 10,000 array elements -> Denied.
11. **Cross-User Profile Mutate**: User B attempts to write to `/users/userA` -> Denied.
12. **Blanket Collection Scrape**: User attempts `collectionGroup` or unconstrained read across all users -> Denied.
