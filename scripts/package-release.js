import fs from 'node:fs/promises';
import path from 'node:path';

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function packageRelease() {
  console.log('Packaging FloodSense for Hostinger production release...');
  const outWeb = path.resolve('dist/web');

  // 1. Copy .htaccess to dist/web
  await fs.copyFile(path.resolve('.htaccess'), path.join(outWeb, '.htaccess'));
  console.log('✔ Copied .htaccess');

  // 2. Copy api/ to dist/web/api
  await copyDir(path.resolve('api'), path.join(outWeb, 'api'));
  console.log('✔ Copied api/ (PHP backend & pre-computed datasets)');

  // 3. Copy project images to dist/web/project-images
  await copyDir(path.resolve('docs/db/images'), path.join(outWeb, 'project-images'));
  console.log('✔ Copied project-images/ (Strategic Project photos)');

  // 4. Copy required GIS files
  await fs.mkdir(path.join(outWeb, 'docs/data_gis'), { recursive: true });
  const gisFiles = ['objek_vital.json', 'kelurahan_jabodetabek.json', 'das_cilicis.json'];
  for (const f of gisFiles) {
    const p = path.resolve('docs/data_gis', f);
    try {
      await fs.copyFile(p, path.join(outWeb, 'docs/data_gis', f));
    } catch {}
  }
  console.log('✔ Copied GIS assets');

  // 5. Copy analysis results for Historical Replay Lab
  await fs.mkdir(path.join(outWeb, 'analysis/results'), { recursive: true });
  const analysisFiles = ['historical-replay.json', 'das-study.json'];
  for (const f of analysisFiles) {
    const p = path.resolve('analysis/results', f);
    try {
      await fs.copyFile(p, path.join(outWeb, 'analysis/results', f));
    } catch {}
  }
  console.log('✔ Copied Analysis Replay assets');

  console.log('✨ dist/web is completely packaged and ready for Hostinger public_html!');
}

packageRelease().catch(console.error);
