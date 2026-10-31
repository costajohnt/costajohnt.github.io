/**
 * Compare scripts/requirements.txt pins against what a venv actually has
 * installed. CI tests the pinned versions; a publish that runs the Substack
 * cookie through a drifted .venv is testing one thing and shipping another.
 */

/** Parse `name==version` lines; comments, blanks, and unpinned lines are ignored. */
export function parsePins(requirementsText) {
  const pins = {};
  for (const line of requirementsText.split('\n')) {
    const m = line.trim().match(/^([A-Za-z0-9._-]+)==(\S+)/);
    if (m) pins[m[1]] = m[2];
  }
  return pins;
}

/**
 * @param {Record<string,string>} pins          from parsePins
 * @param {Record<string,string|null>} installed name -> version (null = missing)
 * @returns {string[]} one line per mismatch, empty when the venv matches
 */
export function pinMismatches(pins, installed) {
  return Object.entries(pins)
    .filter(([name, want]) => installed[name] !== want)
    .map(([name, want]) => `${name}: pinned ${want}, installed ${installed[name] ?? 'none'}`);
}

/** Python one-liner: prints {name: version|null} as JSON for the names in argv. */
export const PY_INSTALLED_VERSIONS = [
  'import json, sys',
  'from importlib.metadata import version, PackageNotFoundError',
  'out = {}',
  'for n in sys.argv[1:]:',
  '    try: out[n] = version(n)',
  '    except PackageNotFoundError: out[n] = None',
  'print(json.dumps(out))',
].join('\n');
