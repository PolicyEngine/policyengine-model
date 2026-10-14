/** Read variable declarations from a GitHub commit archive without extracting it. */

function readString(buffer, start, length) {
  return buffer.subarray(start, start + length).toString('utf8').split('\0')[0];
}

/** PAX records prefix each key=value line with its total byte length. */
function paxPath(contents) {
  let path;
  for (let offset = 0; offset < contents.length;) {
    const separator = contents.indexOf(0x20, offset);
    const length = Number(contents.subarray(offset, separator).toString('ascii'));
    if (separator < offset || !Number.isSafeInteger(length) || length <= separator - offset + 1 || offset + length > contents.length) {
      throw new Error('Invalid PAX archive record');
    }
    const record = contents.subarray(separator + 1, offset + length - 1).toString('utf8');
    if (record.startsWith('path=')) path = record.slice(5);
    offset += length;
  }
  return path;
}

function* tarFiles(tar) {
  let nextPath;
  for (let offset = 0; offset < tar.length;) {
    if (offset + 512 > tar.length) throw new Error('Truncated archive header');
    const header = tar.subarray(offset, offset + 512);
    if (header.every(byte => byte === 0)) return;
    const sizeField = readString(header, 124, 12).trim();
    if (!/^[0-7]+$/.test(sizeField)) throw new Error('Invalid archive file size');
    const size = parseInt(sizeField, 8);
    const start = offset + 512;
    const end = start + size;
    const paddedEnd = start + Math.ceil(size / 512) * 512;
    if (!Number.isSafeInteger(end) || paddedEnd > tar.length) throw new Error('Truncated archive file');
    const contents = tar.subarray(start, end);
    const type = readString(header, 156, 1);
    const prefix = readString(header, 345, 155);
    const name = readString(header, 0, 100);
    offset = paddedEnd;

    if (type === 'x') {
      nextPath = paxPath(contents) ?? nextPath;
      continue;
    }
    if (type === 'L') {
      nextPath = readString(contents, 0, contents.length).replace(/\n$/, '');
      continue;
    }
    if (type === 'g') continue;
    const path = nextPath ?? (prefix ? `${prefix}/${name}` : name);
    nextPath = undefined;
    if (type === '0' || type === '') yield { path, contents };
  }
}

/**
 * Exact, case-sensitive class names, including several classes in one file and
 * declarations whose Variable base is split over lines. Ambiguous names are omitted.
 */
export function extractVariableModules(country, tar) {
  const packagePrefix = `policyengine_${country}/variables/`;
  const paths = [];
  const modules = new Map();
  for (const file of tarFiles(tar)) {
    // GitHub archives place the repository contents under one top-level directory.
    const packagePath = file.path.slice(file.path.indexOf('/') + 1);
    if (!packagePath.startsWith(packagePrefix)) continue;
    const path = packagePath.slice(packagePrefix.length);
    if (!path.endsWith('.py') || path.endsWith('__init__.py')) continue;
    paths.push(path);
    const moduleName = path.replace(/\.py$/, '').replace(/\//g, '.');
    for (const match of file.contents.toString('utf8').matchAll(/^class\s+(\w+)\s*\(\s*Variable\s*\)\s*:/gm)) {
      const name = match[1];
      modules.set(name, modules.has(name) && modules.get(name) !== moduleName ? null : moduleName);
    }
  }
  if (!paths.length || !modules.size) throw new Error('Archive contains no variable declarations');
  return {
    paths: paths.sort(),
    modules: Object.fromEntries([...modules].filter(([, moduleName]) => moduleName !== null).sort(([a], [b]) => a.localeCompare(b))),
  };
}
