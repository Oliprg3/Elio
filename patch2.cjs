const fs = require('fs');

let installApp = fs.readFileSync('src/components/InstallAppModal.tsx', 'utf8');

// replace the Browser TV Mode switch block
installApp = installApp.replace(/\{\/\* In-Browser TV Mode Switcher for Quick Testing \*\/\}.*?<\/button>\s*<\/div>/s, '');

fs.writeFileSync('src/components/InstallAppModal.tsx', installApp);
