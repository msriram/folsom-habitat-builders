# Parent notifications

Email and WhatsApp must be sent by a server-side function, never directly from GitHub Pages.

- Email provider: Resend or another transactional provider.
- WhatsApp: Meta WhatsApp Cloud API using an approved template and explicit parent opt-in.
- Store `OPENAI_API_KEY`, `RESEND_API_KEY`, `WHATSAPP_ACCESS_TOKEN`, and `SUPABASE_SERVICE_ROLE_KEY` only as server-side secrets.
- A parent receives information only for their linked student.
- Keep a notification history containing recipient account, channel, template, delivery status, and timestamp—without copying unnecessary student content.
- Support immediate progress updates and an optional weekly summary.
- Do not contact students directly.

The static demo shows preferences but sends nothing.
