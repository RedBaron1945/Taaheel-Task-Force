# Security Specification: Platform «مرحلة التأهيل»

## 1. Data Invariants
- **Supervisor Role Invariant**: UID `O83e55HQuyajVh3Ji4FJltobyg63` (الشيخ محمد الشواحي) or documents with `role == 'supervisor'` have administrative access to Command Room (`/users`, `/progress`, `/assignments`) and Attendance (`/attendance`).
- **Attendance Officer Role Invariant**: UID `TnCoR9ZTSibHTvIt15VPeQHfGFy1` (مسؤول التحضير) or documents with `role == 'attendance'` have access solely to `/attendance` and read-only access to `/users` where `role == 'student'` for roll-call queues. No access to student grades, progress records, or command room operations.
- **Student Role Invariant**: UID `StOwdFf48idvoduZET5ZUbkbMul2` (أحمد خالد باكيلي) and any student users can only read their own profile, read active assignments, read their own attendance records, and write their own progress records.
- **Mahaden Invariant**: The 7 qualification centers (`mahaden`) are public-read for authenticated users, modifiable only by the supervisor.

## 2. The 12 Attack Vector Payloads (Dirty Dozen)
1. **Attendance Privilege Escalation**: Attendance officer attempts to read `/progress` or update student profiles.
2. **Student Grade Spoofing**: Student attempts to mark another student's task completed in `/progress`.
3. **Ghost Student Injection**: Non-supervisor attempts to create an unverified student document.
4. **Attendance Forgery**: Student attempts to write attendance for themselves or others.
5. **Path Traversal / Poisoned ID**: Malicious request with long/invalid string as `{userId}`.
6. **Role Tampering**: Authenticated student attempts to update `role` from `'student'` to `'supervisor'`.
7. **Assignment Manipulation**: Student or Attendance officer attempts to delete or modify `/assignments`.
8. **Orphan Attendance Record**: Attendance record with invalid/missing `studentId`.
9. **Mahad Tampering**: Non-supervisor attempts to alter Mahad tracks or configuration.
10. **Unauthorized User List**: Student attempting a collection scan of all other students' personal data.
11. **Negative Score Exploit**: Writing malformed points or negative progress values.
12. **Unauthenticated Access**: Any write or read when `request.auth == null`.

All above vectors are denied by `firestore.rules`.
