const fs = require('fs');
let content = fs.readFileSync('src/components/BrandHub.tsx', 'utf-8');

content = content.replace(/style={{ height: '70%', \)' }}/g, "style={{ height: '70%' }}");
content = content.replace(/style={{ height: '90%', \)' }}/g, "style={{ height: '90%' }}");
content = content.replace(/style={{ height: '75%', \)' }}/g, "style={{ height: '75%' }}");
content = content.replace(/style={{ height: '80%', \)' }}/g, "style={{ height: '80%' }}");
content = content.replace(/style={{ height: '95%', \)' }}/g, "style={{ height: '95%' }}");
content = content.replace(/style={{ \)' }}/g, "");

fs.writeFileSync('src/components/BrandHub.tsx', content);
