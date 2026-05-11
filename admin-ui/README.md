# WorkPing Admin Dashboard

The administrative web interface for WorkPing — a workforce management platform. Provides HR and admin staff with complete visibility and control over employees, attendance, leaves, shifts, payroll, and subscriptions.

## Tech Stack

- **Framework**: React 18 + Vite 5
- **Routing**: React Router v6
- **Forms**: React Hook Form + Yup
- **Charts**: ApexCharts, FullCalendar
- **Face Enrollment**: react-webcam — captures a JPEG frame from the admin's webcam, base64-encodes it, and POSTs to `POST /api/v1/enroll` on the biometric service; all face detection and embedding extraction are server-side (InsightFace AntelopeV2)
- **Real-time**: socket.io-client — live attendance board updates via Socket.io rooms
- **Maps**: Leaflet + react-leaflet (geofence zone configuration)
- **Data Tables**: @tanstack/react-table, Syncfusion grids
- **Excel Export**: xlsx
- **Styling**: Bootstrap 5 + SASS
- **HTTP**: Axios

## Features

- Employee management (create, update, bulk import via Excel)
- Attendance tracking with face recognition enrollment
- Leave approvals and holiday calendar management
- Shift scheduling with drag-and-drop calendar
- Subscription and billing management
- Real-time analytics dashboards (ApexCharts)
- Geofence zone configuration (Leaflet maps)
- Excel export for reports

## Getting Started

```bash
npm install
cp .env.example .env   # fill in your API base URL
npm run dev
```

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | URL of the centralized API server |
| `VITE_FACE_API_URL` | URL of the face recognition microservice |

## Build

```bash
npm run build     # outputs to dist/
npm run preview   # preview production build locally
```

## Related Services

- [workping-api](../centralized-server) — core backend API
- [workping-biometric](../face-api-microservice) — face recognition engine
- [workping-portal](../employees-ui) — employee-facing dashboard
