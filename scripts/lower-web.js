// Rewrites the exported web bundle so older browsers (for example an older
// Chrome on a tablet) can run it. Expo's output uses very new JavaScript
// syntax; without this, those browsers show a blank page.
// Usage: node scripts/lower-web.js dist
// Expo's bundles share globals across files, so no wrapping or renaming happens here.
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const TARGET = ['chrome64', 'safari12', 'firefox62', 'edge79'];
const dir = path.join(process.argv[2] || 'dist', '_expo', 'static', 'js', 'web');

for (const name of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
  const file = path.join(dir, name);
  const { code } = esbuild.transformSync(fs.readFileSync(file, 'utf8'), {
    target: TARGET,
    loader: 'js',
    minifyWhitespace: true,
  });
  fs.writeFileSync(file, code);
  console.log('lowered', name);
}

// If the app still can't start (very old browser, or a script failed to load),
// show a plain message instead of a blank page. Written in old-style JavaScript on purpose.
const htmlFile = path.join(process.argv[2] || 'dist', 'index.html');
const fallback = `<script>
(function(){
  function show(){
    var root=document.getElementById('root');
    if(!root||root.children.length) return;
    root.innerHTML='<div style="font-family:sans-serif;max-width:480px;margin:48px auto;padding:24px;text-align:center;color:#1F2340">'+
      '<div style="font-size:48px">🛠️</div><h1 style="font-size:22px">Kidstagram could not start</h1>'+
      '<p>Please update Chrome (or this tablet\\'s browser) from the app store, then open this page again.</p>'+
      '<button onclick="location.reload()" style="font-size:18px;padding:12px 20px;border:0;border-radius:12px;background:#6C4CF1;color:#fff">Try again</button></div>';
  }
  window.addEventListener('error',function(){ setTimeout(show,1500); });
  setTimeout(show,12000);
})();
</script>`;
let html = fs.readFileSync(htmlFile, 'utf8');
if (!html.includes('Kidstagram could not start')) {
  html = html.replace('<div id="root"></div>', '<div id="root"></div>' + fallback);
  fs.writeFileSync(htmlFile, html);
  console.log('added start-up fallback to index.html');
}
