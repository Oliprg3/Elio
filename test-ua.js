const regex = /Android.*(TV|SmartTV|LargeScreen)|Leanback|BRAVIA|AFTT|AFTB|AFTM|AFT|GoogleTV|HbbTV|Tizen|Web0S|Roku|AppleTV|MiTV|Shield.*Android/i;
const uas = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
];
uas.forEach(ua => console.log(regex.test(ua)));
