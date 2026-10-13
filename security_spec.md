# Security Specification: Platform «مرحلة التأهيل»

## 1. Data Invariants & Access Control Matrix

- **Supervisor Role Invariant (`isSupervisor`)**:
  - Authorized explicitly via verified UIDs (`O83e55HQuyajVh3Ji4FJltobyg63`, `tpNwAC13RsZs3RB7hfBRefwzedH2`), or verified administration email match (`request.auth.token.email == 'bbrys005@gmail.com' && request.auth.token.email_verified == true`), or an existing verified database document with `role in ['supervisor', 'admin']`.
  - Supervisors hold full administrative rights over `/users`, `/assignments`, `/mahaden`, `/attendance`, `/progress`, and `/settings`.

- **Attendance Officer Role Invariant (`isAttendanceOfficer`)**:
  - Authorized via officer UID (`TnCoR9ZTSibHTvIt15VPeQHfGFy1`), supervisor UIDs, verified administration email match, or documents with `role in ['attendance', 'supervisor', 'admin']`.
  - Hold write access exclusively to `/attendance/{recordId}`.
  - No permission to alter user roles, delete user profiles, or modify assignments/settings.

- **Self-Role Assignment Prevention (`/users/{userId}`)**:
  - `create`: Allowed for supervisors, or for authenticated account owners creating their own profile document (`request.auth.uid == userId`) **only if** `request.resource.data.role == 'student'`. Self-escalation to `supervisor` or `attendance` at creation is strictly blocked.
  - `update`: Allowed for supervisors, or for account owners on their own profile document (`request.auth.uid == userId`) **only if** `request.resource.data.role == resource.data.role`. Changing the `role` field by non-supervisors is mathematically prohibited.
  - `delete`: Strictly restricted to `isSupervisor()`. All arbitrary or unauthenticated deletions (including legacy/deleted UID lists) are completely eradicated.

- **Strict Email Verification Enforcement**:
  - Wildcard regex matching (e.g. `matches('.*bbrys005.*')`) is completely forbidden.
  - Only exact verified match is recognized: `request.auth.token.email == 'bbrys005@gmail.com' && request.auth.token.email_verified == true`.
  - Attacker emails such as `x.bbrys005@gmail.com`, `bbrys005@attacker.com`, or unverified accounts are immediately denied administrative capabilities.

- **Attendance Write Boundary (`/attendance/{recordId}`)**:
  - Open date exceptions (`2026-10-15`, `2026-10-08`) and deleted student prefixes are completely deleted.
  - `write`: Restricted strictly to `isAttendanceOfficer()`. Unauthenticated requests (`request.auth == null`) and regular student accounts are strictly denied all write/edit/delete operations.
  - Student attendance forgery is prevented; students cannot write or modify attendance records.

---

## 2. The 12 Attack Vector Payloads (Dirty Dozen)

1. **Role Escalation on Profile Creation (Payload Attack A1)**:
   - Request: `POST /users/attackerUid` with payload `{ role: 'supervisor', name: 'Hacker' }` by `attackerUid`.
   - Result: **PERMISSION_DENIED** (Violation of `role == 'student'`).

2. **Role Escalation on Profile Update (Payload Attack A2)**:
   - Request: `UPDATE /users/studentUid` with `{ role: 'supervisor' }` by `studentUid`.
   - Result: **PERMISSION_DENIED** (Violation of `request.resource.data.role == resource.data.role`).

3. **Subdomain / Wildcard Email Spoofing (Payload Attack B)**:
   - Request: `WRITE /attendance/rec1` by token `{ email: 'x.bbrys005@gmail.com', email_verified: true }`.
   - Result: **PERMISSION_DENIED** (Exact equality `email == 'bbrys005@gmail.com'` fails).

4. **Unverified Email Spoofing (Payload Attack B2)**:
   - Request: `WRITE /users/victimUid` by token `{ email: 'bbrys005@gmail.com', email_verified: false }`.
   - Result: **PERMISSION_DENIED** (Requirement `email_verified == true` fails).

5. **Unauthenticated Attendance Write (Payload Attack C1)**:
   - Request: `PUT /attendance/student1_2026-10-15` with `{ status: 'present' }` without credentials (`auth == null`).
   - Result: **PERMISSION_DENIED** (Open date exceptions removed; requires `isAttendanceOfficer()`).

6. **Unauthenticated Attendance Deletion (Payload Attack C2)**:
   - Request: `DELETE /attendance/student1_2026-10-08` without credentials.
   - Result: **PERMISSION_DENIED** (Open date exceptions removed; requires `isAttendanceOfficer()`).

7. **Student Self-Attendance Forgery (Payload Attack C3)**:
   - Request: `POST /attendance/studentUid_2026-10-15` by authenticated student `studentUid`.
   - Result: **PERMISSION_DENIED** (Attendance write requires `isAttendanceOfficer()`).

8. **Unauthorized User Document Deletion (Payload Attack D1)**:
   - Request: `DELETE /users/sFtURW5zOSPu68halRL3u6IoZB03` by unauthenticated or student user.
   - Result: **PERMISSION_DENIED** (Legacy ID delete bypass removed; delete is strictly supervisor-only).

9. **Peer User Document Deletion (Payload Attack D2)**:
   - Request: `DELETE /users/victimStudentUid` by another student.
   - Result: **PERMISSION_DENIED** (Only `isSupervisor()` can delete users).

10. **Ghost Student Injection by Non-Supervisor**:
    - Request: `POST /users/newStudentId` by an existing student.
    - Result: **PERMISSION_DENIED** (`request.auth.uid == userId` prevents creating records for other UIDs).

11. **Assignment Tampering**:
    - Request: `PUT /assignments/task1` by student or attendance officer.
    - Result: **PERMISSION_DENIED** (Supervisor only).

12. **Settings Manipulation**:
    - Request: `PUT /settings/config` by non-supervisor.
    - Result: **PERMISSION_DENIED** (Supervisor only).
