const https = require('https');

const urls = [
  'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg',
  'https://upload.wikimedia.org/wikipedia/commons/1/17/HBO_Max_Logo.svg',
  'https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg',
  'https://upload.wikimedia.org/wikipedia/commons/2/28/Apple_TV_Plus_Logo.svg',
  'https://upload.wikimedia.org/wikipedia/commons/1/11/Amazon_Prime_Video_logo.svg',
  'https://upload.wikimedia.org/wikipedia/commons/e/e4/Hulu_Logo.svg',
  'https://upload.wikimedia.org/wikipedia/commons/a/a5/Paramount_Plus.svg',
  'https://upload.wikimedia.org/wikipedia/commons/0/08/Crunchyroll_Logo.svg'
];

urls.forEach(url => {
  https.get(url, (res) => {
    console.log(`${res.statusCode} - ${url}`);
  }).on('error', (e) => {
    console.error(e);
  });
});
