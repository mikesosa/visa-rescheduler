# Logs Viewer Feature

## Overview

Added a comprehensive logs viewer to the dashboard that allows users to see real-time and historical logs from their rescheduler jobs.

## What Was Added

### 1. Database Schema Update (`prisma/schema.prisma`)

Added a `logs` field to the Job model:
```prisma
logs String? @db.Text // Full logs output
```

### 2. Job Manager Updates (`src/lib/job-manager.ts`)

**New Features:**
- In-memory log storage with a 1000-line limit per job
- Automatic log capture from stdout and stderr
- Timestamped log entries
- Persistent logs saved to database
- `getJobLogs(jobId)` function to retrieve logs

**Log Capture:**
- All stdout messages are captured and timestamped
- stderr messages are captured with `[ERROR]` prefix
- Process start/stop events are logged
- Logs are kept in memory for 1 hour after process exit

### 3. API Endpoint (`src/app/api/jobs/[id]/logs/route.ts`)

**Endpoint:** `GET /api/jobs/:id/logs`

**Returns:**
```json
{
  "logs": "timestamped log content...",
  "status": "active"
}
```

**Features:**
- Combines stored database logs with live in-memory logs
- Authentication required (must own the job)
- Returns real-time logs for running jobs

### 4. Dashboard UI Updates (`src/app/dashboard/page.tsx`)

**New UI Elements:**
- "View Logs" button on each job card
- Full-screen modal for log viewing
- Terminal-style logs display (black background, green text)
- Refresh button to reload logs
- Auto-scroll logs container

**User Experience:**
- Click "View Logs" to open modal
- Logs displayed in monospace font
- Refresh button to get latest logs
- Close button or click outside to dismiss

## How It Works

### Log Flow:

1. **Job Starts** → Initial log entry created
2. **Script Output** → Captured from stdout/stderr
3. **Timestamped** → Each line gets ISO timestamp
4. **Stored in Memory** → Up to 1000 lines
5. **Saved to DB** → On every update
6. **Retrieved** → Via API when user clicks "View Logs"
7. **Displayed** → In terminal-style modal

### Example Log Output:

```
[2026-01-15T02:15:30.123Z] Starting rescheduler process...
[2026-01-15T02:15:31.456Z] ╔═══════════════════════════════════════════════════════════════════╗
[2026-01-15T02:15:31.457Z] ║        🎯 VISA APPOINTMENT RESCHEDULER - COLOMBIA 🇨🇴            ║
[2026-01-15T02:15:31.458Z] ╚═══════════════════════════════════════════════════════════════════╝
[2026-01-15T02:15:32.123Z] 📧 Email: user@example.com
[2026-01-15T02:15:32.124Z] 📅 Current appointment: 2026-09-29
[2026-01-15T02:15:32.125Z] 🔑 Schedule ID: 72409682
[2026-01-15T02:15:32.126Z] 🏢 Facility ID: 25
[2026-01-15T02:15:35.789Z] ✅ Login successful
[2026-01-15T02:15:40.234Z] 🔍 Checking for earlier dates...
```

## Features

✅ **Real-time Logs**: See what the script is doing live
✅ **Historical Logs**: View past execution logs
✅ **Error Tracking**: stderr captured with ERROR prefix
✅ **Auto-refresh**: Refresh button to get latest logs
✅ **Terminal Style**: Classic black/green terminal appearance
✅ **Responsive**: Full-screen modal on all devices
✅ **Secure**: Only job owners can view their logs

## Usage

### For Users:

1. Go to Dashboard
2. Find your monitoring job
3. Click "View Logs" button
4. See real-time script output
5. Click "Refresh" to update
6. Click "Close" or outside modal to dismiss

### For Developers:

**Get logs programmatically:**
```typescript
import { getJobLogs } from '@/lib/job-manager';

const logs = getJobLogs(jobId);
```

**API call:**
```javascript
const response = await fetch(`/api/jobs/${jobId}/logs`);
const { logs, status } = await response.json();
```

## Database Migration

The migration was created and applied:
```
migrations/20260115021302_add_logs/migration.sql
```

To apply on production:
```bash
npx prisma migrate deploy
```

## Performance Considerations

- **In-memory limit**: 1000 lines per job (prevents memory issues)
- **DB storage**: Text field can store large logs
- **Cleanup**: Logs removed from memory 1 hour after process exit
- **Polling**: Dashboard polls every 30 seconds for updates

## Future Enhancements

Possible improvements:
- [ ] WebSocket for real-time log streaming
- [ ] Log filtering (errors only, search)
- [ ] Download logs as .txt file
- [ ] Log rotation (clear old logs automatically)
- [ ] Syntax highlighting for different log levels
- [ ] Log pagination for very large logs

## Testing

To test locally:

1. Start dev server: `npm run dev`
2. Create a monitoring job
3. Click "View Logs"
4. Observe real-time script output
5. Click "Refresh" to update
6. Verify logs persist after process stops

## Deployment Notes

**For Vercel:**
- Logs will show startup errors (since jobs can't run)
- Useful for debugging why jobs fail to start

**For VPS/Railway:**
- Full log capture will work
- Monitor disk space if logs grow large
- Consider implementing log rotation

## Summary

This feature provides complete visibility into what the rescheduler script is doing, making it easy to debug issues and monitor progress without SSH access to the server. The terminal-style interface gives users a familiar, developer-friendly view of the logs.
