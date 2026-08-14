-- Preserve any old Week 1 record, but start the visible programming sequence in Week 2.
update public.robot_homework_tasks t
set phase = 'optional'
where t.team_id = (select id from public.teams where slug = 'folsom-fireflies') and t.week_number = 1;

update public.robot_homework_tasks t
set title = v.title, description = v.description, cs2n_url = v.url, hints = v.hints
from (values
  (2,'Iris Rover: moving forward','Start with Introduction: Iris Rover, then complete Moving Forward.','https://www.cs2n.org/u/mp/badge_pages/2991',array['Use a short, clear sequence first.','Change one movement value, then run it again.']),
  (3,'Sequential movements','Complete Proportional Relationships and Sequential Movements.','https://www.cs2n.org/u/mp/badge_pages/2994',array['Estimate before you run the robot.','Use the same units for each movement.']),
  (4,'Turning in place','Complete Turning in Place and Turn Around the Craters.','https://www.cs2n.org/u/mp/badge_pages/2996',array['Test one turn at a time.','Notice which motor direction makes the robot rotate.']),
  (5,'Swing turns and steering','Complete Swing Turns and Steer Around the Crater.','https://www.cs2n.org/u/mp/badge_pages/2999',array['Compare a swing turn with a turn in place.','Write down what changed in the path.']),
  (6,'Sensors: wait until near','Complete Wait Until Near and Move Until Near.','https://www.cs2n.org/u/mp/badge_pages/3014',array['A sensor waits for a condition before the next action.','Test with the object at two different distances.']),
  (7,'Sensors: color and touch','Complete Wait for Green, Move Until Red, and Move Until Pressed.','https://www.cs2n.org/u/mp/badge_pages/3019',array['Describe exactly what the sensor noticed.','Use one condition at a time while debugging.']),
  (8,'Loops and discrete decisions','Complete Forever Loops, Repeat Until, Turn If Not Clear, and Looped Decisions.','https://www.cs2n.org/u/mp/badge_pages/3027',array['Use a loop for repeated behavior.','Explain both possible decision paths.'])
) v(week_number,title,description,url,hints)
where t.team_id = (select id from public.teams where slug = 'folsom-fireflies') and t.week_number = v.week_number;
