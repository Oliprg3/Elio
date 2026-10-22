const https = require('https');
const urls = [
  'https://image.tmdb.org/t/p/h100/wwemzKWzjKYJFfCeiB57q3r4Bcm.png',
  'https://image.tmdb.org/t/p/h100/1X7B3s3gG069gA2Q9pU0n15J0P2.png',
  'https://image.tmdb.org/t/p/h100/gJ8VX6JSu3cgEQ9sjw13AWfMjk4.png',
  'https://image.tmdb.org/t/p/h100/4vM4H4sIeXyS7tLqjIqgI9sT.png',
  'https://image.tmdb.org/t/p/h100/ifvw08k640FkXmUaK3zO03U8a.png',
  'https://image.tmdb.org/t/p/h100/pqUTlzWQWUOWIRX0Gk7wHkGHY.png',
  'https://image.tmdb.org/t/p/h100/fjqJ52jG8G6kR5aFzP6.png',
  'https://image.tmdb.org/t/p/h100/mruT954ve6P1zquaRs6XCRrxPCg.png'
];

urls.forEach(url => {
  https.get(url, (res) => {
    console.log(`${res.statusCode} - ${url}`);
  }).on('error', (e) => {
    console.error(e);
  });
});
