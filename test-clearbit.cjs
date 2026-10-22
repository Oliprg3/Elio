const https = require('https');
const urls = [
  'https://logo.clearbit.com/disneyplus.com',
  'https://logo.clearbit.com/primevideo.com',
  'https://logo.clearbit.com/hulu.com'
];

urls.forEach(url => {
  https.get(url, (res) => {
    console.log(`CLEARBIT: ${res.statusCode} - ${url}`);
  }).on('error', (e) => {
    console.error(e);
  });
});
