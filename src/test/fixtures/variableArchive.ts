import { Buffer } from 'node:buffer';

/** Minimal USTAR archive, also allowing extension records for long-name tests. */
export function variableArchive(files: { path: string; contents: string; prefix?: string; type?: string }[]): Buffer {
  const entries = files.flatMap(({ path, contents, prefix = '', type = '0' }) => {
    if (!prefix && Buffer.byteLength(path) > 100) {
      const separator = path.lastIndexOf('/');
      prefix = path.slice(0, separator);
      path = path.slice(separator + 1);
    }
    const body = Buffer.from(contents);
    const header = Buffer.alloc(512);
    header.write(path, 0, 100);
    header.write(body.length.toString(8).padStart(11, '0'), 124, 12);
    header.fill(0x20, 148, 156);
    header.write(type, 156, 1);
    header.write('ustar\0', 257, 6);
    header.write(prefix, 345, 155);
    const checksum = header.reduce((sum, byte) => sum + byte, 0);
    header.write(checksum.toString(8).padStart(6, '0') + '\0 ', 148, 8);
    return [header, body, Buffer.alloc((512 - body.length % 512) % 512)];
  });
  return Buffer.concat([...entries, Buffer.alloc(1024)]);
}
