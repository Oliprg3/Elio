const fs = require('fs');

// 1. Remove from tvNavigation.ts
let tvNav = fs.readFileSync('src/services/tvNavigation.ts', 'utf8');
tvNav = tvNav.replace(/try {\s*const saved = localStorage\.getItem\('elio_tv_mode'\);\s*if \(saved === 'true'\) return true;\s*if \(saved === 'false'\) return false;\s*} catch \(e\) {\s*\/\/ Ignore storage errors\s*}/g, '');
tvNav = tvNav.replace(/try {\s*localStorage\.setItem\('elio_tv_mode', enabled \? 'true' : 'false'\);\s*} catch \(e\) {\s*\/\/ Ignore storage errors\s*}/g, '');
fs.writeFileSync('src/services/tvNavigation.ts', tvNav);
