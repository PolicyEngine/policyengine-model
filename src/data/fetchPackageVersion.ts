const cache = new Map<string, string>();

export async function fetchPackageVersion(
  packageName: string,
): Promise<string | null> {
  if (cache.has(packageName)) return cache.get(packageName)!;

  try {
    const res = await fetch(`https://pypi.org/pypi/${packageName}/json`);
    if (!res.ok) throw new Error(`PyPI returned ${res.status}`);
    const data = await res.json();
    const version: string = data.info?.version;
    if (!version) throw new Error('No version in PyPI response');
    cache.set(packageName, version);
    return version;
  } catch (err) {
    console.warn(`Failed to fetch version for ${packageName}:`, err);
    return null;
  }
}
