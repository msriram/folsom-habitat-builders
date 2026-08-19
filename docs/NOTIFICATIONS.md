# Homework email reminders

Homework reminders are queued in Supabase and sent by the `homework-reminders` Edge Function. GitHub Pages never receives or stores an email-provider secret.

- Approved students and linked parents receive the current homework notice Wednesday at 9:00 PM Pacific. The lead coach receives a separate digest at 11:00 AM Pacific on Wednesday.
- Each email includes the assignment description and question prompts from the Team Room, plus a direct link back to the homework page.
- The queue uses the Wednesday delivery timestamp as part of its unique key, so rerunning the scheduler does not duplicate that week's mail.

- Email provider: Resend or another transactional provider.
- Store `RESEND_API_KEY`, `REMINDER_CRON_SECRET`, `REMINDER_FROM_EMAIL`, `PUBLIC_SITE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` only as server-side Supabase secrets.

After deploying the function, schedule it once per hour in Supabase Cron or an external scheduler with:

```text
POST https://tcggcoqbsispkzgypdet.supabase.co/functions/v1/homework-reminders
Header: x-reminder-secret: <the REMINDER_CRON_SECRET value>
```

The function creates the next Wednesday queue and retries failed sends up to three times. A student or parent can disable email reminders by setting their `notification_preferences.email_reminders_enabled` value to `false`.

WhatsApp remains separate and is not enabled by this workflow.
