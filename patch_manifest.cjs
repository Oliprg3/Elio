const fs = require('fs');
let installApp = fs.readFileSync('src/components/InstallAppModal.tsx', 'utf8');

installApp = installApp.replace(/\{\/\* Manifest Viewer Toggle \*\/\}.*?<\/div>\s*<\/div>/s, '</div>');

fs.writeFileSync('src/components/InstallAppModal.tsx', installApp);
