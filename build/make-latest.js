// Gera o latest.yml que o atualizador baixa para saber qual e a versao mais nova.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const version = require('../package.json').version;
const name = `Nanquim-Setup-${version}.exe`;
const file = path.join(__dirname, '..', 'dist', name);
const buf = fs.readFileSync(file);
const sha512 = crypto.createHash('sha512').update(buf).digest('base64');
const yml = `version: ${version}
files:
  - url: ${name}
    sha512: ${sha512}
    size: ${buf.length}
path: ${name}
sha512: ${sha512}
releaseDate: '${new Date().toISOString()}'
`;
fs.writeFileSync(path.join(__dirname, '..', 'dist', 'latest.yml'), yml);
console.log(yml);
