#!/usr/bin/env node
/**
 * src/ 의 조각들을 dist/algo-memory.html 하나로 합친다.
 * 배포 대상은 항상 이 단일 파일이다. 앱 CSS·JS·문제 데이터는 인라인하고,
 * 웹 배포에서는 Google Fonts와 Supabase JS SDK를 외부에서 불러오고, Neon SDK는 빌드 시 번들한다.
 */
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const SRC = path.join(__dirname, 'src');
const DIST = path.join(__dirname, 'dist');
const OUT = path.join(DIST, 'algo-memory.html');

const read = (f) => fs.readFileSync(path.join(SRC, f), 'utf8');

const css = read('styles.css').trim();
const pyCatalog = JSON.parse(read('catalog.json')).map((c) => Object.assign({ lang: 'python' }, c));
const sqlCatalog = JSON.parse(read('sql-catalog.json')).map((c) => Object.assign({ lang: 'sql' }, c));
const catalog = pyCatalog.concat(sqlCatalog);
let js = read('app.js').trim();
const neonConfig = read('neon-config.js').trim();
const neonProvider = esbuild.buildSync({
  entryPoints: [path.join(SRC, 'neon-provider.js')],
  bundle: true,
  write: false,
  platform: 'browser',
  format: 'iife',
  target: ['es2020'],
  minify: true,
  logLevel: 'silent'
}).outputFiles[0].text.trim();
const cloudConfig = read('cloud-config.js').trim();
const cloud = read('cloud.js').trim();

const marker = '/*__CATALOG__*/[]';
if (!js.includes(marker)) {
  console.error('app.js 에 카탈로그 자리표시자가 없습니다:', marker);
  process.exit(1);
}
js = js.replace(marker, JSON.stringify(catalog));

let html = read('index.html');
if (!html.includes('<!--INJECT:STYLES-->') || !html.includes('<!--INJECT:SCRIPT-->')) {
  console.error('필수 빌드 자리표시자가 없습니다.');
  process.exit(1);
}
html = html
  .replace(/<!--DEV-->[\s\S]*?<!--\/DEV-->\s*/g, '')
  .replace('<!--INJECT:STYLES-->', '<style>\n' + css + '\n</style>')
  .replace('<!--INJECT:SCRIPT-->', '<script>\n' + neonConfig + '\n</script>\n<script>\n' + neonProvider + '\n</script>\n<script>\n' + cloudConfig + '\n</script>\n<script>\n' + cloud + '\n</script>\n<script>\n' + js + '\n</script>');

fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(OUT, html, 'utf8');
// 깃허브 페이지 루트용
fs.writeFileSync(path.join(DIST, 'index.html'), html, 'utf8');
fs.writeFileSync(path.join(DIST, '.nojekyll'), '');

const kb = (n) => (n / 1024).toFixed(1) + ' KB';
console.log('빌드 완료  ' + OUT);
console.log('  문제 유형 ' + catalog.length + '개 (파이썬 ' + pyCatalog.length +
  ' · SQL ' + sqlCatalog.length + ') · ' + kb(Buffer.byteLength(html)));
