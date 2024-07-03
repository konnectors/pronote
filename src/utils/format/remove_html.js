const remove_html = (html) => {
  // Remove HTML tags
  html = html.replace(/<[^>]*>?/gm, '');

  // Escape all HTML entities
  html = html.replace('&amp;', '&');
  html = html.replace('&lt;', '<');
  html = html.replace('&gt;', '>');
  html = html.replace('&quot;', '"');
  html = html.replace('&#039;', "'");
  html = html.replace('&#096;', '`');
  html = html.replace(/&nbsp;/g, ' ');

  // Replace br tags with newlines
  html = html.replace(/<br>/g, '\n');

  return html
}

module.exports = remove_html;