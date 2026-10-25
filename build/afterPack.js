// Coloca icone e informacoes de versao no Nanquim.exe sem precisar do Wine.
const fs = require('fs');
const path = require('path');

module.exports = async function afterPack(ctx) {
  if (ctx.electronPlatformName !== 'win32') return;
  const ResEdit = await import('resedit');
  const R = ResEdit.default || ResEdit;
  const exe = path.join(ctx.appOutDir, `${ctx.packager.appInfo.productFilename}.exe`);
  const data = fs.readFileSync(exe);
  const pe = R.NtExecutable.from(data, { ignoreCert: true });
  const res = R.NtExecutableResource.from(pe);

  const ico = R.Data.IconFile.from(fs.readFileSync(path.join(__dirname, 'icon.ico')));
  const groups = R.Resource.IconGroupEntry.fromEntries(res.entries);
  const ids = groups.length ? groups.map(g => g.id) : [1];
  const lang = groups.length ? groups[0].lang : 1033;
  for (const id of ids) {
    R.Resource.IconGroupEntry.replaceIconsForResource(res.entries, id, lang, ico.icons.map(i => i.data));
  }

  const v = ctx.packager.appInfo.version;
  const vi = R.Resource.VersionInfo.fromEntries(res.entries)[0];
  if (vi) {
    const [a, b, c] = v.split('.').map(Number);
    vi.setFileVersion(a, b, c, 0, 1033);
    vi.setProductVersion(a, b, c, 0, 1033);
    vi.setStringValues({ lang: 1033, codepage: 1200 }, {
      FileDescription: 'Nanquim',
      ProductName: 'Nanquim',
      CompanyName: 'Felipe Misso',
      InternalName: 'Nanquim',
      OriginalFilename: 'Nanquim.exe',
      LegalCopyright: 'Felipe Misso'
    });
    vi.outputToResourceEntries(res.entries);
  }
  res.outputResource(pe);
  fs.writeFileSync(exe, Buffer.from(pe.generate()));

  // diz ao atualizador onde ficam as versoes novas (Releases do GitHub)
  fs.writeFileSync(path.join(ctx.appOutDir, 'resources', 'app-update.yml'),
    'provider: github\nowner: xpsy6\nrepo: nanquim\nupdaterCacheDirName: nanquim-updater\n');
  console.log('  • app-update.yml criado (github xpsy6/nanquim)');
  console.log('  • icone e versao aplicados em', path.basename(exe));
};
