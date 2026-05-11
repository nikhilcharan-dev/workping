# WorkPing Mongoose Schemas Manifest

Complete inventory of MongoDB schemas used in the WorkPing platform. **Total: 27 schemas**

## Authentication & User Management (5 schemas)
1. **Account.js** — Credential store for all user types (admin/manager/employee). Handles password, 2FA, providers (OAuth), session revocation
2. **Admin.js** — Primary admin profile. References Organization for multi-tenancy
3. **Admin.Org.js** — Secondary admin assignments. Many-to-many between primary admin and secondary admins per organization
4. **User.js** — Employee profile. Links to Team, Organization, Shift assignments
5. **RefreshToken.js** — JWT refresh token store for token revocation (logged out, password changed)

## Organizational Structure (6 schemas)
6. **Organization.js** — Tenant record. Owns subscriptions, teams, employees, projects
7. **Team.js** — Departmental grouping. Has manager, teams within organization
8. **TeamMembership.js** — Explicit team membership records with assignment dates
9. **Project.js** — Deliverables/initiatives. Tracks milestones, status, team association
10. **ProjectMember.js** — Employees assigned to projects with roles/responsibilities
11. **ProjectTeam.js** — Teams assigned to projects (aggregation)

## Attendance & Time Tracking (3 schemas)
12. **Attendance.js** — Daily attendance records (present/absent/late/halfDay) with timestamps
13. **Shift.js** — Shift templates (9-6, 10-7, etc.) with optional break windows
14. **WorkStatus.js** — Real-time work status (online/offline/break) during shift hours

## Leave & Absence Management (3 schemas)
15. **Leave.js** — Leave requests (casual/sick/earned). Multi-level approval (manager→admin)
16. **CL.OD.js** — Casual Leave & On-Duty. Sub-types for flexible absence management
17. **Holiday.js** — Company-wide/organization-specific holidays (not applicable for leave deduction)

## Compensation & Benefits (4 schemas)
18. **Salary.js** — Salary slips, breakdown (basic/HRA/DA/etc.), deductions. Read-only for employees
19. **Order.js** — Reimbursement/advance orders awaiting approval
20. **Payment.js** — Payment transactions (salary disbursement, reimbursements, advances)
21. **Complaint.js** — HR complaints/grievances with status tracking

## Compliance & Identity (3 schemas)
22. **GovtProof.js** — Government ID proofs (Aadhaar/PAN/driving license) with verification status
23. **FrsTicket.js** — Face Recognition System tickets for liveness failures, manual review queue
24. **Skills.js** — Employee skill inventory for project allocation

## Supplementary Data (2 schemas)
25. **Plan.js** — Subscription plans (Starter/Pro/Enterprise) with features, pricing
26. **Subscription.js** — Active subscription per organization with billing cycle, auto-renewal
27. **SocialLinks.js** — Employee social profiles (LinkedIn/GitHub/Twitter)

## Schema Distribution by Domain

| Domain | Count | Purpose |
|--------|-------|---------|
| Auth & User Mgmt | 5 | Account security, multi-level admin access |
| Organizational | 6 | Multi-tenancy, team hierarchy, project management |
| Time & Attendance | 3 | Daily operations, shift scheduling |
| Leave & Absence | 3 | Absence tracking, approval workflows |
| Compensation | 4 | Payroll, reimbursements, claims |
| Compliance | 3 | Identity verification, system audits |
| Supplementary | 2 | Billing, supplementary profiles |
| **TOTAL** | **27** | |

## Key Design Patterns

- **Multi-tenancy**: All employee/team/project records reference organizationId
- **Soft deletes**: Status fields (isActive, deletedAt) instead of hard deletion
- **Audit trails**: createdAt, updatedAt, and custom status change timestamps
- **Referential integrity**: Foreign keys via ObjectId references + lean() on read-heavy queries
- **Transactional support**: Auth/subscription flows use MongoDB sessions (ACID)
