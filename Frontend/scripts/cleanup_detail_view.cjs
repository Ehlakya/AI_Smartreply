const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, '..', 'src', 'pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jsx'));

for (const file of files) {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Skip InboxPage as it is already fixed
  if (file === 'InboxPage.jsx') continue;

  let modified = false;

  // Add import if missing and if the file uses EmailDetailView
  if (content.includes('<EmailDetailView') && !content.includes('import EmailDetailView')) {
    // find the last import and append it
    content = content.replace(/(import .*;\n)(?!import)/, '$1import EmailDetailView from \'../components/EmailDetailView\';\n');
    modified = true;
  }

  // Remove the inline function
  const regex = /\/\*\*\n \* Component for viewing a single[^]*?function EmailDetailView[\s\S]*?^}\n*$/m;
  if (regex.test(content)) {
    content = content.replace(regex, '');
    modified = true;
  } else {
    // Try catching without the comment
    const regex2 = /^function EmailDetailView[\s\S]*?^}\n*$/m;
    if (regex2.test(content)) {
        content = content.replace(regex2, '');
        modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log('Cleaned up ' + file);
  }
}
