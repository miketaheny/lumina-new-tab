const esbuild = require('esbuild');
const isWatch = process.argv.includes('--watch');

const config = {
  entryPoints: ['src/tiptap-bundle.js'],
  bundle: true,
  outfile: 'tiptap-bundle.js',
  format: 'iife',
  minify: !isWatch,
  sourcemap: isWatch ? 'inline' : false,
  target: ['chrome90'],
};

if (isWatch) {
  esbuild.context(config).then(ctx => {
    ctx.watch();
    console.log('Watching for changes…');
  });
} else {
  esbuild.build(config)
    .then(() => console.log('Build complete → tiptap-bundle.js'))
    .catch(() => process.exit(1));
}
