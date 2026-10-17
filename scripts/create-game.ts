/**
 * Scaffolds a new game from a template into games/<slug>.
 * Usage: bun run create <phaser-2d|three-3d> <slug> ["Game Title"]
 */
import { cpSync, existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const TEMPLATES_DIR = join(ROOT, 'templates');
const GAMES_DIR = join(ROOT, 'games');
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
/** Build output and local caches that must not be copied into a new game. */
const SKIPPED = new Set(['node_modules', 'dist', 'test-results', 'playwright-report']);
const SKIPPED_FILES = new Set(['playable-bundle.zip']);

function fail(message: string): never {
    console.error(`❌ ${message}`);
    process.exit(1);
}

function titleFromSlug(slug: string): string {
    return slug
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

const templates = readdirSync(TEMPLATES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

const [template, slug, titleArg] = process.argv.slice(2);
if (!template || !slug) {
    fail(`Usage: bun run create <${templates.join('|')}> <slug> ["Game Title"]`);
}
if (!templates.includes(template)) {
    fail(`Unknown template "${template}". Available: ${templates.join(', ')}`);
}
if (!SLUG_RE.test(slug)) {
    fail(`Slug "${slug}" must be lowercase letters, digits and dashes`);
}

const target = join(GAMES_DIR, slug);
if (existsSync(target)) fail(`games/${slug} already exists`);

const title = titleArg ?? titleFromSlug(slug);
cpSync(join(TEMPLATES_DIR, template), target, {
    recursive: true,
    filter: (src) => !SKIPPED.has(basename(src)) && !SKIPPED_FILES.has(basename(src))
});

const pkgPath = join(target, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as Record<string, unknown>;
pkg['name'] = slug;
pkg['description'] = `${title}, created from the ${template} template.`;
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 4)}\n`);

const htmlPath = join(target, 'index.html');
writeFileSync(
    htmlPath,
    readFileSync(htmlPath, 'utf8').replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
);

console.log(`✅ Created games/${slug} from templates/${template}`);
console.log('Next steps:');
console.log('  bun install');
console.log(`  bun run --filter ${slug} dev`);
console.log(`  Rename the game in src/core/Constants.ts (TEXT) and replace the sample gameplay.`);
