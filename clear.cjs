const fs = require('fs');
let appFile = fs.readFileSync('src/App.tsx', 'utf8');

// Just inject localStorage.removeItem('elio_tv_mode') at the top level
appFile = appFile.replace(/function App\(\) \{/, "function App() {\n  if (typeof window !== 'undefined') {\n    localStorage.removeItem('elio_tv_mode');\n  }");

fs.writeFileSync('src/App.tsx', appFile);
