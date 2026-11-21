import fs from 'node:fs';
import path from 'node:path';

const assetsDir = path.resolve('dist/client/assets');
if (fs.existsSync(assetsDir)) {
  const files = fs.readdirSync(assetsDir);
  const mainJs = files.find((f) => f.startsWith('index-') && f.endsWith('.js'));
  const mainCss = files.find((f) => f.startsWith('index-') && f.endsWith('.css'));

  const legacyJsNames = ['index-B-nnlXTo.js', 'index-Bzt2AvCt.js', 'index-CRIU1bBq.js', 'index-z9lIKEJQ.js', 'index-DaoJUeWs.js'];
  const legacyCssNames = ['index-BlHRztw9.css', 'index-DL-Vv-aK.css', 'index-DhhH_ARU.css', 'index-EVbK6dMk.css'];

  if (mainJs) {
    for (const legacy of legacyJsNames) {
      const dest = path.join(assetsDir, legacy);
      if (!fs.existsSync(dest)) {
        fs.copyFileSync(path.join(assetsDir, mainJs), dest);
        console.log(`[Build] Created backward compatibility asset: ${legacy} -> ${mainJs}`);
      }
    }
  }

  if (mainCss) {
    for (const legacy of legacyCssNames) {
      const dest = path.join(assetsDir, legacy);
      if (!fs.existsSync(dest)) {
        fs.copyFileSync(path.join(assetsDir, mainCss), dest);
        console.log(`[Build] Created backward compatibility asset: ${legacy} -> ${mainCss}`);
      }
    }
  }
}
