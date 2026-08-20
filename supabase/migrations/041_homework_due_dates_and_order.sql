-- The homework calendar follows the team's Wednesday rhythm.
update public.assignments a
set due_at = v.due_at
from (values
  (1, '2026-08-12 23:59:00-07'::timestamptz),
  (2, '2026-08-19 23:59:00-07'::timestamptz),
  (3, '2026-08-26 23:59:00-07'::timestamptz),
  (4, '2026-09-02 23:59:00-07'::timestamptz),
  (5, '2026-09-09 23:59:00-07'::timestamptz),
  (6, '2026-09-16 23:59:00-07'::timestamptz),
  (7, '2026-09-23 23:59:00-07'::timestamptz),
  (8, '2026-09-30 23:59:00-07'::timestamptz),
  (9, '2026-10-07 23:59:00-07'::timestamptz),
  (10, '2026-10-14 23:59:00-07'::timestamptz),
  (11, '2026-10-21 23:59:00-07'::timestamptz),
  (12, '2026-10-28 23:59:00-07'::timestamptz)
) as v(week_number,due_at)
where a.team_id = 'b7024f8b-0db5-4ae5-a51d-8a189f7a421f'
  and a.week_number = v.week_number;
