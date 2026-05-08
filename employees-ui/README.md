# WorkPing Employee Portal

The employee-facing web dashboard for WorkPing. Allows employees to mark attendance, manage leave requests, view salary slips, check shift schedules, and track their own attendance history.

## Tech Stack

- **Framework**: React 18 + Vite 5
- **Routing**: React Router v6
- **Forms**: React Hook Form + Yup
- **Charts**: ApexCharts, Nivo Calendar
- **Calendar**: FullCalendar
- **Webcam**: react-webcam (for browser-based face check-in)
- **Styling**: Bootstrap 5 + SASS
- **HTTP**: Axios

## Features

- Face recognition attendance (webcam-based check-in/check-out)
- Leave application and approval status tracking
- Salary slip view and Excel download
- Shift schedule calendar
- Attendance history with monthly heatmap (Nivo)
- Holiday calendar
- Profile management

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
- [workping-admin](../admin-ui) — admin control panel
- [workping-mobile](../mobile-app) — native mobile alternative
