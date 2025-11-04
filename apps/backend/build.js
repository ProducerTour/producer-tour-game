const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  outfile: 'dist/index.js',
  sourcemap: false,
  minify: false,
  external: [
    '@prisma/client',
    'express',
    'bcryptjs',
    'cors',
    'dotenv',
    'express-fileupload',
    'jsonwebtoken',
    'multer',
    'nodemailer',
    'papaparse',
    'zod',
    'axios'
  ],
  logLevel: 'info',
}).then(() => {
  console.log('✓ Build complete!');
}).catch((err) => {
  console.error('✗ Build failed:', err);
  process.exit(1);
});
