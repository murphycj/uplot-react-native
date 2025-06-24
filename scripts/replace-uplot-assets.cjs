#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const htmlPath = path.join(projectRoot, 'src', 'components', 'uplot.html');
const htmlPathOut = path.join(projectRoot, 'dist', 'components', 'uplot.html');
const cssPath = path.join(
  projectRoot,
  'node_modules',
  'uplot',
  'dist',
  'uPlot.min.css',
);
const jsPath = path.join(
  projectRoot,
  'node_modules',
  'uplot',
  'dist',
  'uPlot.iife.min.js',
);

async function main() {
  try {
    const [html, css, js] = await Promise.all([
      fs.promises.readFile(htmlPath, 'utf8'),
      fs.promises.readFile(cssPath, 'utf8'),
      fs.promises.readFile(jsPath, 'utf8'),
    ]);

    const cssTag = `<style>\n${css}\n</style>`;
    const jsTag = `<script>\n${js}\n</script>`;

    let replaced = html
      .replace(/'\{\{UPLOT_CSS\}\}'/, cssTag)
      .replace(/'\{\{UPLOT_JS\}\}'/, jsTag);

    await fs.promises.writeFile(htmlPathOut, replaced, 'utf8');
    console.log('uplot assets injected into uplot.html');
  } catch (err) {
    console.error('Error injecting uplot assets:', err);
    process.exit(1);
  }
}

main();
