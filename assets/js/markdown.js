const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[character]));

const inline = value => escape(value)
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/_([^_\n]+)_/g, '<em>$1</em>');

export function renderMarkdown(value) {
  const lines = String(value ?? '').replace(/\r\n?/g, '\n').split('\n');
  const html = [];
  let list = '';
  const closeList = () => { if (list) { html.push(`</${list}>`); list = ''; } };
  for (const line of lines) {
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    const bullet = line.match(/^[-*+]\s+(.+)$/);
    const numbered = line.match(/^\d+[.)]\s+(.+)$/);
    if (heading) { closeList(); html.push(`<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`); }
    else if (bullet || numbered) {
      const type = numbered ? 'ol' : 'ul';
      if (list !== type) { closeList(); list = type; html.push(`<${type}>`); }
      html.push(`<li>${inline((bullet || numbered)[1])}</li>`);
    } else if (/^>\s?/.test(line)) { closeList(); html.push(`<blockquote>${inline(line.replace(/^>\s?/, ''))}</blockquote>`); }
    else if (/^---+$/.test(line.trim())) { closeList(); html.push('<hr>'); }
    else if (!line.trim()) { closeList(); }
    else { closeList(); html.push(`<p>${inline(line)}</p>`); }
  }
  closeList();
  return html.join('') || '<p></p>';
}
