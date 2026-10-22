const https = require('https');
const urls = [
  'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/netflix.png',
  'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/hbo-max.png',
  'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/disneyplus.png',
  'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/apple-tv.png',
  'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/prime-video.png',
  'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/hulu.png',
  'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/paramountplus.png',
  'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/crunchyroll.png'
];

urls.forEach(url => {
  https.get(url, (res) => {
    console.log(`DASHBOARD: ${res.statusCode} - ${url}`);
  }).on('error', (e) => {
    console.error(e);
  });
});
