const fs = require('fs');
const path = require('path');

function walk(dir, done) {
  let results = [];
  fs.readdir(dir, function(err, list) {
    if (err) return done(err);
    let pending = list.length;
    if (!pending) return done(null, results);
    list.forEach(function(file) {
      file = path.resolve(dir, file);
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function(err, res) {
            results = results.concat(res);
            if (!--pending) done(null, results);
          });
        } else {
          results.push(file);
          if (!--pending) done(null, results);
        }
      });
    });
  });
}

walk(path.join(__dirname, 'src', 'pages'), (err, files) => {
  if (err) throw err;
  const jsxFiles = files.filter(f => f.endsWith('.jsx'));
  
  jsxFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Replace existing || '-' with || '--'
    content = content.replace(/\|\|\s*'-'/g, "|| '--'");
    content = content.replace(/\|\|\s*"-"/g, "|| '--'");

    // Replace <td>{some.property}</td> with <td>{some.property || '--'}</td>
    // Allow identifiers with optional chaining and array indexing
    const tdRegex = /<td(?:[^>]*)>\s*\{([a-zA-Z0-9_?.\[\]\(\)'"]+)\}\s*<\/td>/g;
    content = content.replace(tdRegex, (match, p1) => {
      // skip if it's already using show() or has logical OR
      if (p1.includes('show(') || p1.includes(' || ')) {
        return match;
      }
      // E.g., <td>{team.teamName}</td> -> <td>{team.teamName || '--'}</td>
      // Also account for nested matches but only simple replacements
      return match.replace("{" + p1 + "}", "{" + p1 + " || '--'}");
    });

    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      console.log('Updated', file);
    }
  });
});
