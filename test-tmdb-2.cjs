const https = require('https');
const urls = [
  'https://image.tmdb.org/t/p/w300/wwemzKWzjKYJFfCeiB57q3r4Bcm.png',
  'https://image.tmdb.org/t/p/w300/nmU0UMDJB3dRRQSTUqawzF2Od1a.png',
  'https://image.tmdb.org/t/p/w300/1edZOYAfoyZyZ3rklNSiUpXX30Q.png',
  'https://image.tmdb.org/t/p/w300/bngHRFi794mnMq34gfVcm9nDxN1.png',
  'https://image.tmdb.org/t/p/w300/w7HfLNm9CWwRmAMU58udl2L7We7.png',
  'https://image.tmdb.org/t/p/w300/pqUTCleNUiTLAVlelGxUgWn1ELh.png',
  'https://image.tmdb.org/t/p/w300/fi83B1oztoS47xxcemFdPMhIzK.png',
  'https://image.tmdb.org/t/p/w300/qqyXcZlJQKlRmAD1TCKV7mGLQlt.png'
];

urls.forEach(url => {
  https.get(url, (res) => {
    console.log(`TMDB: ${res.statusCode} - ${url}`);
  }).on('error', (e) => {
    console.error(e);
  });
});
