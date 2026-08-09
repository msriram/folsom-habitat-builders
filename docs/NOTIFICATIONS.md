# Homework email reminders

Homework reminders are queued in Supabase and sent by the `homework-reminders` Edge Function. GitHub Pages never receives or stores an email-provider secret.

- A detailed homework summary is sent to each linked, approved parent seven days before the due date.
- A shorter reminder is sent two days before the due date.
- The queue has a unique key for assignment, recipient, and reminder type, so rerunning the scheduler does not duplicate mail.
- Student email addresses are not contacted directly; linked adults receive the reminder.

- Email provider: Resend or another transactional provider.
- Store `RESEND_API_KEY`, `REMINDER_CRON_SECRET`, `REMINDER_FROM_EMAIL`, `PUBLIC_SITE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` only as server-side Supabase secrets.

After deploying the function, schedule it once per hour in Supabase Cron or an external scheduler with:

```text
POST https://tcggcoqbsispkzgypdet.supabase.co/functions/v1/homework-reminders
Header: x-reminder-secret: <the REMINDER_CRON_SECRET value>
```

The function itself creates the seven-day and two-day queue records and retries failed sends up to three times. A parent can disable email reminders by setting their `notification_preferences.email_reminders_enabled` value to `false`.

WhatsApp remains separate and is not enabled by this workflow.
