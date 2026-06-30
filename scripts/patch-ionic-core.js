const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '..', 'node_modules', '@ionic', 'core', 'package.json');

if (!fs.existsSync(packageJsonPath)) {
  console.log('@ionic/core package.json not found, skipping patch.');
  process.exit(0);
}

const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

if (!pkg.exports) {
  pkg.exports = {
    '.': {
      import: './dist/esm/index.js',
      require: './dist/index.cjs.js',
      types: './dist/types/interface.d.ts',
    },
    './components': './components/index.js',
    './components/*': './components/*',
  };
  fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log('Patched @ionic/core package.json with exports field.');
} else {
  console.log('@ionic/core package.json already has exports field.');
}
