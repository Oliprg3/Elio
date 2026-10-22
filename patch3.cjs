const fs = require('fs');
let tvNav = fs.readFileSync('src/services/tvNavigation.ts', 'utf8');

tvNav = tvNav.replace(/const TV_UA_REGEX = .*/, 'const TV_UA_REGEX = /Android.*(TV|SmartTV|LargeScreen)|Leanback|BRAVIA|\\b(AFTT|AFTB|AFTM|AFT)\\b|GoogleTV|HbbTV|Tizen|Web0S|Roku|AppleTV|MiTV|Shield.*Android/i;');

fs.writeFileSync('src/services/tvNavigation.ts', tvNav);
