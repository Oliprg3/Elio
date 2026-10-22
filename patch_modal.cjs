const fs = require('fs');
let installApp = fs.readFileSync('src/components/InstallAppModal.tsx', 'utf8');

installApp = installApp.replace(/useEffect\(\(\) => \{\s*const unsub = tvNav\.subscribe\(setIsTvModeActive\);\s*return unsub;\s*\}, \[\]\);/g, '');

fs.writeFileSync('src/components/InstallAppModal.tsx', installApp);

let settingsModal = fs.readFileSync('src/components/SettingsModal.tsx', 'utf8');
settingsModal = settingsModal.replace(/setIsTvModeActive\(tvNav\.getIsTV\(\)\);/g, '');
fs.writeFileSync('src/components/SettingsModal.tsx', settingsModal);
