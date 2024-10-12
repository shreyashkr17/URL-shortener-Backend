const geoip = require('geoip-lite');

const ip = '106.215.28.141';
const geo = geoip.lookup(ip);

console.log(geo);