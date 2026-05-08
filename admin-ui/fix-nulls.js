const fs = require('fs');
const glob = require('glob');

function processFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace existing || '-' with || '--'
  content = content.replace(/\|\|\s*'-'/g, "|| '--'");
  // Replace || "-" with || '--'
  content = content.replace(/\|\|\s*"-"/g, "|| '--'");

  // Replace <td>{some.property}</td> with <td>{some.property || '--'}</td>
  // Allow identifiers with optional chaining and array indexing
  const tdRegex = /<td(?:[^>]*)>\s*\{([a-zA-Z0-9_?.\[\]]+)\}\s*<\/td>/g;
  content = content.replace(tdRegex, (match, p1) => {
    // skip if it's already using show() or has logical OR
    if (p1.includes('show(') || p1.includes(' || ')) {
      return match;
    }
    // E.g., <td>{team.teamName}</td> -> <td>{team.teamName || '--'}</td>
    return match.replace("{" + p1 + "}", "{" + p1 + " || '--'}");
  });

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated', file);
  }
}

glob.sync('src/pages/**/*.jsx').forEach(processFile);
