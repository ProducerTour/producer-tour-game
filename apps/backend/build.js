const esbuild = require('esbuild');
const { globSync } = require('glob');
const path = require('path');

// Find all TypeScript files in src
const entryPoints = globSync('src/**/*.ts');

esbuild.build({
  entryPoints,
  bundle: false, // Don't bundle - preserve file structure
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  outdir: 'dist',
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
  console.log('Build complete!');
}).catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
