const sessionDates = ['August 14','August 21','August 28','September 4','September 11','September 18','September 25','October 2','October 9','October 16','October 23','October 30'];
const sessionNumber = Number(document.body.dataset.session?.match(/meeting-(\d+)/)?.[1]);
if (sessionNumber && sessionDates[sessionNumber - 1]) {
  const headerMeta = document.querySelector('.meeting-head span');
  if (headerMeta) headerMeta.textContent = `Session ${sessionNumber} · Friday, ${sessionDates[sessionNumber - 1]} · 6:00 PM · 90 minutes`;
}
const nextMeeting=document.querySelector('.next-meeting small');
if(nextMeeting)nextMeeting.textContent='Friday, August 14 · 6:00 PM · 90 minutes';
document.querySelectorAll('h2').forEach(heading=>{if(heading.textContent.trim()!=='Location')return;const copy=heading.nextElementSibling;if(copy?.tagName==='P')copy.textContent="Coach Sriram's garage";});
if(sessionNumber===1){const bring=[...document.querySelectorAll('h2')].find(heading=>heading.textContent.trim()==='Bring');const list=bring?.nextElementSibling;if(list?.tagName==='UL')list.innerHTML='<li>Laptop or tablet</li><li>Notebook, pen/pencil, and eraser</li><li>Ideas or materials to share with the team, if any</li>';}

document.querySelectorAll('.meeting-row[href^="meeting-"]').forEach(row => {
  const match = row.getAttribute('href')?.match(/meeting-(\d+)/);
  const n = Number(match?.[1]);
  if (!n || !sessionDates[n - 1]) return;
  const time = row.querySelector('time');
  if (time) time.innerHTML = `Fri<br>${sessionDates[n - 1].replace('September ', 'Sep ').replace('October ', 'Oct ').replace('August ', 'Aug ')}`;
  const status = row.lastElementChild;
  if (status && /Host needed|Provisional|Plan/.test(status.textContent || '')) status.textContent = 'Fri · 6 PM →';
});

document.querySelectorAll('.status-chip').forEach(chip => {
  if ((chip.textContent || '').includes('Sunday')) chip.textContent = 'Friday · 6 PM';
});
document.querySelectorAll('.schedule-note').forEach(note => {
  note.textContent = 'Every session meets Friday at 6:00 PM. Robot building, testing, research, project work, and logistics are planned together. Exact location details are shared privately.';
});
document.querySelectorAll('h3').forEach(heading => {
  if (heading.textContent?.trim() === 'Sunday · Innovation and planning') heading.textContent = 'Friday · Innovation, robot, and planning';
});
document.querySelectorAll('p').forEach(paragraph => {
  if (paragraph.textContent?.includes('Sunday is the project and research meeting')) paragraph.textContent = 'Assignments are due Friday. Each Friday meeting produces the evidence and next decision for the following assignment.';
});
document.querySelectorAll('li').forEach(item => {
  if (item.textContent?.includes('Due Sunday')) item.innerHTML = '<strong>Due Friday:</strong> research, quizzes, coding, robot, and written work';
});
