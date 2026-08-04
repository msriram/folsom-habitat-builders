insert into schedule_items(team_id,session_key,week_number,area,label,sort_order)
select t.id,v.session_key,v.week_number,v.area,v.label,v.sort_order
from teams t cross join (values
  ('meeting-01',1,'Robot','All mission models are matched to official starting positions',1),
  ('meeting-01',1,'Robot','Both M10 habitats are marked as no-contact zones',2),
  ('meeting-01',1,'Robot','Base robot and equipment meet inspection limits',3),
  ('meeting-01',1,'Teamwork','Baseline driving results and next experiments are recorded',4),
  ('meeting-02',1,'Project','Every Week 0 topic connects to a BIOGLOW mission theme',1),
  ('meeting-02',1,'Project','Two local biodiversity problems have credible sources',2),
  ('meeting-02',1,'Project','Existing solutions and limitations are recorded',3),
  ('meeting-02',1,'Teamwork','Follow-up research questions have owners',4),
  ('meeting-03',2,'Robot','The same launch jig is used for every trial',1),
  ('meeting-03',2,'Robot','M08 scores in at least 8 of 10 trials',2),
  ('meeting-03',2,'Robot','M11 scores in at least 8 of 10 trials',3),
  ('meeting-03',2,'Teamwork','Both crews agree on the next measured change',4),
  ('meeting-04',2,'Robot','All six dock assignments use the same criteria',1),
  ('meeting-04',2,'Robot','Primary and backup dock assignments are recorded',2),
  ('meeting-04',2,'Project','Keystone species direction is supported by research',3),
  ('meeting-04',2,'Project','Project shortlist has a primary and backup problem',4),
  ('meeting-05',3,'Robot','Ten M02 seed-landing trials are recorded',1),
  ('meeting-05',3,'Robot','M03 scoring is measured over ten trials',2),
  ('meeting-05',3,'Robot','Seed collector decision uses measured landing data',3),
  ('meeting-05',3,'Teamwork','Each crew has one assigned next change',4),
  ('meeting-06',3,'Project','Primary problem statement is clear and specific',1),
  ('meeting-06',3,'Project','Backup problem and selection reason are saved',2),
  ('meeting-06',3,'Project','Existing solutions are compared from reliable sources',3),
  ('meeting-06',3,'Teamwork','Outreach questions and owners are ready',4),
  ('meeting-07',4,'Robot','M05 and M12 use the same comparison criteria',1),
  ('meeting-07',4,'Robot','Selected guided action has ten scored trials',2),
  ('meeting-07',4,'Robot','M06 fragment scatter is measured',3),
  ('meeting-07',4,'Teamwork','Baseline and stretch choices are recorded',4),
  ('meeting-08',4,'Project','Several solution ideas were compared before selection',1),
  ('meeting-08',4,'Project','Selected idea connects to the problem evidence',2),
  ('meeting-08',4,'Project','A first prototype, drawing, or experiment exists',3),
  ('meeting-08',4,'Teamwork','Feedback questions and next improvements are assigned',4)
) v(session_key,week_number,area,label,sort_order)
where t.slug='folsom-fireflies'
on conflict(team_id,session_key,sort_order) do update
set week_number=excluded.week_number,area=excluded.area,label=excluded.label;
