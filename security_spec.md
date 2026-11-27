# NeuralPlan Security Specification

## 1. Data Invariants

1. **Self-Ownership & Identity Integrity**: A user document at `/users/{userId}` can only be created or modified by the authenticated user whose `request.auth.uid == userId`, or by a verified administrator.
2. **Admin Verification & Bootstrap**: Only verified administrators present in `/admins/{adminId}` or matching the configured owner email (`agejirizume@gmail.com` with `email_verified == true`) can read all user records, inspect cohort progress, and issue coaching feedback.
3. **Immutability of Key Identification Fields**: A user's `id`, `email`, and `createdAt` are immutable after document creation.
4. **Subcollection Master Gate**: Subcollections under `/users/{userId}/plans/{planId}` and `/users/{userId}/feedback/{feedbackId}` can only be read by either the document owner (`userId == request.auth.uid`) or an administrator.
5. **Feedback Authorization**: Only administrators can write documents to `/users/{userId}/feedback/{feedbackId}`. The target user can only update the `read` flag to mark feedback as acknowledged.
6. **Denial of Wallet Guard**: All string fields are constrained with bounded length checks (`.size() <= 2000` or `.size() <= 128`), and document IDs are guarded with `isValidId()`.
7. **Strict Timestamps**: Server timestamps (`request.time`) are enforced on critical write actions.

---

## 2. The "Dirty Dozen" Payloads (Must be Rejected with PERMISSION_DENIED)

1. **Unauthenticated Read to User Directory**: Anonymous client calls `get(/users/user_123)` without auth token.
2. **User Impersonation Write**: User `uid_alice` attempts `setDoc(/users/uid_bob, { id: 'uid_bob', ... })`.
3. **Privilege Escalation in User Document**: User attempts to inject `role: 'admin'` or `isAdmin: true` into `/users/{uid_alice}`.
4. **Malicious Admin Document Creation**: Non-admin user attempts `setDoc(/admins/{uid_alice}, { role: 'admin' })`.
5. **Unauthorized Cohort Snooping**: Standard member `uid_alice` attempts `list(/users)` to view all cohort members.
6. **Fake Feedback Injection**: Standard member `uid_alice` attempts to write `create(/users/uid_bob/feedback/fb_1)` pretending to be the coach.
7. **Tampering with Feedback Content**: Member `uid_bob` attempts to update `message` or `title` on a feedback document issued by the coach (only `read` update allowed).
8. **Shadow Field Injection**: User attempts to save an unregistered field `__backdoor: true` inside their profile.
9. **Oversized String Bomb (Denial of Wallet)**: User attempts to write a 2MB payload into `mainGoal`.
10. **Spoofed Unverified Admin Email**: Request has token email `agejirizume@gmail.com` but `email_verified == false`.
11. **Altering Plan Owner or Date**: User attempts to update `userId` or `date` on an existing daily plan.
12. **Orphaned Subcollection Creation**: User attempts to write to `/users/{nonExistentUser}/plans/plan_1` without matching UID.
