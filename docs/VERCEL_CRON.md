# Vercel Cron – NURA background jobs

Set **CRON_SECRET** in Vercel → Project → Settings → Environment Variables. If you use **Vercel Cron** (from `vercel.json`), the schedule is already set; ensure the deployment has access to the same env.

If you use an **external cron** (e.g. cron-job.org, EasyCron), call these URLs with:

- **Header:** `Authorization: Bearer YOUR_CRON_SECRET`  
  or  
- **Header:** `x-cron-secret: YOUR_CRON_SECRET`

---

## URLs and schedule

| Job              | Run every | URL path                      | Purpose |
|------------------|-----------|-------------------------------|--------|
| **Gmail alerts** | 2 minutes | `/api/cron/gmail-alerts`      | New important emails → push (deadlines, urgent, keywords, specific clients). |
| **Calendar pop** | 2 minutes | `/api/cron/calendar-alerts`   | Push 5 minutes before Google Calendar events. |
| **Task pop**     | 1 minute  | `/api/cron/task-alerts`       | Push when a task’s due date/time is now. |
| Scan workspace   | Daily     | `/api/cron/scan-workspace`    | NURA Pulse: scan Gmail, classify, write to notifications. |

---

## Full URLs (replace with your Vercel host)

- `https://YOUR_APP.vercel.app/api/cron/gmail-alerts`
- `https://YOUR_APP.vercel.app/api/cron/calendar-alerts`
- `https://YOUR_APP.vercel.app/api/cron/task-alerts`
- `https://YOUR_APP.vercel.app/api/cron/scan-workspace`

Example with secret (curl):

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  "https://YOUR_APP.vercel.app/api/cron/gmail-alerts"
```
