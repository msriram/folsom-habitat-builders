-- Week 6 coding follows the CS2N LOCObot progression. Keep the other
-- published homework questions untouched; this replaces only its coding task
-- and adds the requested coding emphasis to the weekly email highlight.
update public.robot_homework_tasks
set title = 'LOCObot, arm movement, and home cleanup',
    description = 'Start with LOCObot. Then complete Arm Movement, Collecting Spilled Silverware, and Cleaning the Home. Finish with the Robot Movement Quiz and upload a screenshot of your completed work.',
    cs2n_url = 'https://www.cs2n.org/u/mp/badge_pages/2991',
    hints = array[
      'Work through the activities in order: LOCObot, Arm Movement, Collecting Spilled Silverware, Cleaning the Home, then the Robot Movement Quiz.',
      'Coding is how the team turns a LEGO model or attachment into a reliable robot action—test one movement at a time and notice what changes.',
      'For the arm and loose pieces, begin slowly and use a controlled approach so pieces are not pushed farther away.'
    ]
where team_id = 'b7024f8b-0db5-4ae5-a51d-8a189f7a421f'
  and week_number = 6;

update public.assignments
set reminder_highlight = E'Coding is a core robot-design skill\nThis week, complete the CS2N LOCObot sequence: LOCObot, Arm Movement, Collecting Spilled Silverware, Cleaning the Home, and the Robot Movement Quiz. Coding turns a LEGO build into a controlled, repeatable robot action—work through each activity in order and test carefully.\n\nTeam-name change ! Rainforest Rangers\nWe decided to change the team name yet again. Hope it sticks this time ! We are going to focus on Rainforests for Innovation project.\n\nGoogle chat\nTeam now has access to each other students\' gmail ids so that they can collaborate on google chat and google docs. ALERT for Parents - please monitor the kids\' accounts for any inappropriate inter-personal chats.\n\nRobot models building in progress\nBy next session we should have the base robots built (and will be retained until competition). We are building 2 copies of the robots for backup-redundancy for both practice and competitions'
where team_id = 'b7024f8b-0db5-4ae5-a51d-8a189f7a421f'
  and week_number = 6;
