# WorkPing WhatsApp Bot — Backend API Contract

This document defines the REST API that your backend server (HR system, ERP, HRMS) must implement for the WhatsApp bot to serve real employee data. The bot calls these endpoints from `context.builder.js` when processing messages.

**Base URL** is configured via the `ORIGIN` environment variable.

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Employee Lookup](#2-employee-lookup)
3. [Attendance](#3-attendance)
4. [Leave Management](#4-leave-management)
5. [FRS (Face Recognition)](#5-frs-face-recognition)
6. [Salary & Payslip](#6-salary--payslip)
7. [Shift & Schedule](#7-shift--schedule)
8. [Holidays](#8-holidays)
9. [Complaints](#9-complaints)
10. [Policies](#10-policies)
11. [Webhook (Notifications)](#11-webhook-notifications-optional)
12. [Error Format](#12-error-format)

---

## 1. Authentication

All requests from the bot include a service-level API key in the header. This is NOT the employee's identity — it authenticates the bot itself.

```
Authorization: Bearer <WORKPING_SERVICE_KEY>
```

Employee identity is determined by the `phone` parameter (WhatsApp number with country code, e.g. `919876543210`).

---

## 2. Employee Lookup

The bot calls this on every inbound message to identify the employee.

### `GET /users/{phone}`

**Path Params:**
| Param | Example | Description |
|-------|---------|-------------|
| phone | `919876543210` | WhatsApp number with country code |

**Response `200 OK`:**
```json
{
  "phone": "919876543210",
  "name": "Nikhil Kumar",
  "employeeId": "EMP-1042",
  "department": "Engineering",
  "role": "Senior Developer",
  "email": "nikhil@company.com",
  "managerId": "EMP-0087",
  "managerName": "Priya Sharma",
  "joiningDate": "2023-01-15",
  "location": "Hyderabad"
}
```

**Response `404` — unknown phone number:**
```json
{
  "error": "EMPLOYEE_NOT_FOUND",
  "message": "No employee registered with this phone number"
}
```

> The bot uses `name`, `department`, and `role` in every LLM prompt. Other fields are used by specific features below.

---

## 3. Attendance

### `GET /attendance/{employeeId}/today`

Returns today's attendance status.

**Response:**
```json
{
  "date": "2026-03-05",
  "status": "PRESENT",
  "checkIn": "09:12:00",
  "checkOut": null,
  "hoursWorked": 4.5,
  "source": "FRS"
}
```

`status` values: `PRESENT`, `ABSENT`, `HALF_DAY`, `ON_LEAVE`, `HOLIDAY`, `WFH`

### `GET /attendance/{employeeId}/week`

Returns this week's attendance (Mon-Sun).

**Response:**
```json
{
  "weekStart": "2026-03-02",
  "weekEnd": "2026-03-08",
  "summary": {
    "present": 3,
    "absent": 0,
    "leaves": 1,
    "wfh": 1
  },
  "days": [
    { "date": "2026-03-02", "status": "PRESENT", "checkIn": "09:05:00", "checkOut": "18:30:00" },
    { "date": "2026-03-03", "status": "WFH", "checkIn": "09:30:00", "checkOut": "18:00:00" },
    { "date": "2026-03-04", "status": "ON_LEAVE", "checkIn": null, "checkOut": null },
    { "date": "2026-03-05", "status": "PRESENT", "checkIn": "09:12:00", "checkOut": null }
  ]
}
```

### `GET /attendance/{employeeId}/month?month=2026-03`

Returns monthly summary.

**Response:**
```json
{
  "month": "2026-03",
  "totalWorkingDays": 22,
  "present": 15,
  "absent": 1,
  "leaves": 3,
  "wfh": 2,
  "holidays": 1
}
```

---

## 4. Leave Management

### `GET /leave/{employeeId}/balance`

Returns current leave balance.

**Response:**
```json
{
  "balances": [
    { "type": "Casual", "total": 18, "used": 5, "remaining": 13 },
    { "type": "Sick", "total": 12, "used": 2, "remaining": 10 },
    { "type": "Earned", "total": 15, "used": 0, "remaining": 15 },
    { "type": "Comp-off", "total": 3, "used": 1, "remaining": 2 }
  ]
}
```

### `POST /leave/{employeeId}/apply`

Submit a leave request.

**Request Body:**
```json
{
  "type": "Casual",
  "fromDate": "2026-03-10",
  "toDate": "2026-03-11",
  "reason": "Personal work",
  "requestedVia": "whatsapp"
}
```

> Dates must be in `YYYY-MM-DD` format. The bot parses natural dates ("5 Mar") and converts before calling.

**Response `201 Created`:**
```json
{
  "leaveId": "LV-20260305-1042",
  "status": "PENDING_APPROVAL",
  "approverName": "Priya Sharma",
  "message": "Leave request submitted. Pending manager approval."
}
```

**Response `400` — validation error:**
```json
{
  "error": "INSUFFICIENT_BALANCE",
  "message": "You have only 2 casual leaves remaining but requested 3 days."
}
```

**Response `409` — conflicting leave:**
```json
{
  "error": "LEAVE_CONFLICT",
  "message": "You already have an approved leave on 10 Mar."
}
```

### `GET /leave/{employeeId}/status?leaveId=LV-20260305-1042`

Check the status of a specific leave request.

**Response:**
```json
{
  "leaveId": "LV-20260305-1042",
  "type": "Casual",
  "fromDate": "2026-03-10",
  "toDate": "2026-03-11",
  "status": "APPROVED",
  "approvedBy": "Priya Sharma",
  "approvedAt": "2026-03-05T14:30:00Z"
}
```

`status` values: `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `CANCELLED`

---

## 5. FRS (Face Recognition)

### `GET /frs/{employeeId}/status`

Current FRS registration status.

**Response:**
```json
{
  "registered": true,
  "lastCapture": "2026-03-05T09:12:00Z",
  "captureStatus": "SUCCESS",
  "deviceId": "FRS-HYD-03",
  "failureCount": 0
}
```

`captureStatus` values: `SUCCESS`, `FAILED`, `NOT_DETECTED`, `MULTIPLE_FACES`, `DEVICE_OFFLINE`

### `POST /frs/{employeeId}/ticket`

Create an FRS support ticket.

**Request Body:**
```json
{
  "issue": "Face not detected at device FRS-HYD-03",
  "reportedVia": "whatsapp"
}
```

**Response `201`:**
```json
{
  "ticketId": "FRS-8A3F2B",
  "status": "OPEN",
  "assignedTo": "IT Support Team",
  "eta": "Within 4 hours"
}
```

---

## 6. Salary & Payslip

### `GET /salary/{employeeId}/latest`

Returns the most recent payslip summary.

**Response:**
```json
{
  "month": "2026-02",
  "gross": 85000,
  "deductions": {
    "pf": 5100,
    "tax": 8500,
    "professional_tax": 200,
    "insurance": 1500,
    "other": 0
  },
  "net": 69700,
  "payDate": "2026-02-28",
  "status": "PAID",
  "payslipUrl": "https://hr.company.com/payslip/2026-02/EMP-1042"
}
```

> The bot NEVER displays salary figures in chat (privacy). It directs users to `payslipUrl` or the HR portal.

### `GET /salary/{employeeId}/pay-date`

Next salary credit date.

**Response:**
```json
{
  "nextPayDate": "2026-03-28",
  "daysRemaining": 23
}
```

---

## 7. Shift & Schedule

### `GET /shifts/{employeeId}/current`

Returns the current/next shift.

**Response:**
```json
{
  "date": "2026-03-05",
  "shiftName": "General",
  "startTime": "09:00:00",
  "endTime": "18:00:00",
  "breakDuration": 60,
  "location": "Hyderabad Office - Floor 3"
}
```

### `GET /shifts/{employeeId}/week`

Weekly roster.

**Response:**
```json
{
  "weekStart": "2026-03-02",
  "shifts": [
    { "date": "2026-03-02", "shiftName": "General", "startTime": "09:00", "endTime": "18:00" },
    { "date": "2026-03-03", "shiftName": "General", "startTime": "09:00", "endTime": "18:00" },
    { "date": "2026-03-04", "shiftName": "OFF", "startTime": null, "endTime": null },
    { "date": "2026-03-05", "shiftName": "General", "startTime": "09:00", "endTime": "18:00" },
    { "date": "2026-03-06", "shiftName": "General", "startTime": "09:00", "endTime": "18:00" },
    { "date": "2026-03-07", "shiftName": "OFF", "startTime": null, "endTime": null },
    { "date": "2026-03-08", "shiftName": "OFF", "startTime": null, "endTime": null }
  ]
}
```

---

## 8. Holidays

### `GET /holidays/upcoming?limit=5`

Next upcoming holidays.

**Response:**
```json
{
  "holidays": [
    { "date": "2026-03-14", "name": "Holi", "type": "NATIONAL", "day": "Saturday" },
    { "date": "2026-03-30", "name": "Id-ul-Fitr", "type": "NATIONAL", "day": "Monday" },
    { "date": "2026-04-02", "name": "Ram Navami", "type": "RESTRICTED", "day": "Thursday" },
    { "date": "2026-04-14", "name": "Ambedkar Jayanti", "type": "NATIONAL", "day": "Tuesday" },
    { "date": "2026-05-01", "name": "May Day", "type": "NATIONAL", "day": "Friday" }
  ]
}
```

`type` values: `NATIONAL` (mandatory), `RESTRICTED` (optional, pick from pool)

### `GET /holidays/calendar?year=2026`

Full year calendar. Same structure as above but with all holidays for the year.

---

## 9. Complaints

### `POST /complaints/{employeeId}`

File a workplace complaint.

**Request Body:**
```json
{
  "category": "INFRASTRUCTURE",
  "description": "AC not working on Floor 3 since Monday",
  "isAnonymous": false,
  "reportedVia": "whatsapp"
}
```

`category` values: `INFRASTRUCTURE`, `HARASSMENT`, `POLICY`, `MANAGER`, `PAYROLL`, `OTHER`

**Response `201`:**
```json
{
  "complaintId": "CMP-20260305-0012",
  "status": "SUBMITTED",
  "assignedTo": "Admin Team",
  "eta": "48 hours",
  "message": "Your complaint has been registered. You will be contacted within 48 hours."
}
```

### `GET /complaints/{employeeId}?status=OPEN`

List complaints by status.

**Response:**
```json
{
  "complaints": [
    {
      "complaintId": "CMP-20260305-0012",
      "category": "INFRASTRUCTURE",
      "description": "AC not working on Floor 3...",
      "status": "IN_PROGRESS",
      "createdAt": "2026-03-05T10:30:00Z",
      "updatedAt": "2026-03-05T14:00:00Z",
      "assignedTo": "Admin Team"
    }
  ]
}
```

`status` values: `SUBMITTED`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`

---

## 10. Policies

### `GET /policies`

List all available policy categories.

**Response:**
```json
{
  "policies": [
    { "id": "wfh", "name": "Work From Home Policy", "lastUpdated": "2026-01-15" },
    { "id": "leave", "name": "Leave Policy", "lastUpdated": "2026-01-10" },
    { "id": "dresscode", "name": "Dress Code Policy", "lastUpdated": "2025-11-01" },
    { "id": "reimbursement", "name": "Reimbursement Policy", "lastUpdated": "2025-12-20" },
    { "id": "code-of-conduct", "name": "Code of Conduct", "lastUpdated": "2025-06-01" }
  ]
}
```

### `GET /policies/{policyId}`

Full policy content for LLM context.

**Response:**
```json
{
  "id": "wfh",
  "name": "Work From Home Policy",
  "content": "Employees may work from home up to 2 days per week with prior manager approval...",
  "lastUpdated": "2026-01-15",
  "version": "3.1",
  "documentUrl": "https://hr.company.com/policies/wfh"
}
```

> The `content` field is injected into the LLM system prompt so the bot can answer specific policy questions accurately. Keep it concise (under 2000 chars) — the full document lives at `documentUrl`.

---

## 11. Webhook — Notifications (Optional)

If you want the bot to send proactive messages to employees (e.g., "Your leave was approved"), your server can push events to the bot.

### `POST /api/secure/whatsapp/notify` (on the bot)

Your server calls this endpoint on the bot to trigger an outbound message.

**Request Body:**
```json
{
  "phone": "919876543210",
  "message": "Your leave request (LV-20260305-1042) has been *approved* by Priya Sharma."
}
```

**Headers:**
```
Authorization: Bearer <WHATSAPP_API_KEY>
```

> This endpoint needs to be implemented on the bot side. It is included here as the contract your server should call.

---

## 12. Error Format

All error responses should follow this structure:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable description for the bot to relay"
}
```

Common error codes:
| Code | HTTP | Meaning |
|------|------|---------|
| `EMPLOYEE_NOT_FOUND` | 404 | Phone number not registered |
| `UNAUTHORIZED` | 401 | Invalid service key |
| `INSUFFICIENT_BALANCE` | 400 | Not enough leave balance |
| `LEAVE_CONFLICT` | 409 | Overlapping leave exists |
| `INVALID_DATE` | 400 | Date in the past or invalid format |
| `TICKET_ALREADY_OPEN` | 409 | Duplicate FRS ticket |
| `SERVICE_UNAVAILABLE` | 503 | Backend system down |

> The bot reads the `message` field and relays it to the user via WhatsApp. Keep messages short and WhatsApp-friendly.

---

## Implementation Priority

If you're building the backend incrementally, here's the suggested order:

| Priority | Endpoint | Why |
|----------|----------|-----|
| 1 | `GET /users/{phone}` | Required for every message — employee identification |
| 2 | `GET /attendance/{id}/today` | Most frequently asked query |
| 3 | `POST /leave/{id}/apply` + `GET /leave/{id}/balance` | Core self-service flow (multi-step) |
| 4 | `GET /holidays/upcoming` | Simple, high-value, read-only |
| 5 | `GET /shifts/{id}/current` | Common daily query |
| 6 | `POST /frs/{id}/ticket` | Replaces manual IT tickets |
| 7 | `GET /salary/{id}/pay-date` | Safe (no sensitive data in response) |
| 8 | `POST /complaints/{id}` | Less frequent but important |
| 9 | `GET /policies/{id}` | Currently handled by LLM with hardcoded knowledge |
| 10 | `GET /salary/{id}/latest` | Sensitive — needs extra security review |

---

## Environment Variables

```env
# Your backend server URL
ORIGIN=https://hr-api.company.com

# Service key for bot-to-server auth
WORKPING_SERVICE_KEY=sk-workping-xxxxx
```
