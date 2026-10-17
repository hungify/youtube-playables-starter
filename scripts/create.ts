/**
 * Creates a standalone YouTube Playables game project from this starter.
 *
 *   bun run create <dir> --template <phaser-2d|three-3d> [--example] [--title "Game Title"] [--no-git] [--no-skills]
 *
 * The project is assembled from three layers, later ones overriding earlier ones:
 *   shared/                         SDK wrapper, validator, mock SDK, configs, CI, .claude
 *   templates/<template>/common/    engine config (vite, tsconfig) and engine-only skills
 *   templates/<template>/<variant>/ skeleton (default) or example game
 * package.json is merged from shared/, templates/<template>/ and the variant.
 * The studio and portal-SDK skills are installed from SKILLS_REPO with the `skills` CLI, so the
 * project gets a skills-lock.json and can run `bunx skills update` later (needs network).
 */
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const SHARED_DIR = join(ROOT, 'shared');
const TEMPLATES_DIR = join(ROOT, 'templates');

/** GitHub repo holding the shared agent skills (see shared/README.md to update them). */
const SKILLS_REPO = 'hungify/playables-skills';

const SKELETON = 'skeleton';
const EXAMPLE = 'example';
/** Files of a layer that are merged or inlined instead of copied. */
const LAYER_META = new Set(['package.json', 'STRUCTURE.md']);
const NEVER_COPY = new Set([
    'node_modules',
    'dist',
    'test-results',
    'playwright-report',
    'playable-bundle.zip',
    '.DS_Store'
]);
const TEXT_EXTENSIONS = new Set(['.ts', '.json', '.md', '.html', '.css', '.yml']);
const STRUCTURE_MARKER = '<!-- TEMPLATE_STRUCTURE -->';
const PACKAGE_NAME_RE = /^[a-z0-9][a-z0-9._-]*$/;
const PACKAGE_KEY_ORDER = ['name', 'version', 'private', 'description', 'type'];

export interface CreateOptions {
    readonly dir: string;
    readonly template: string;
    readonly example: boolean;
    readonly title?: string;
    readonly git: boolean;
    /** Install the shared agent skills from SKILLS_REPO; defaults to true. */
    readonly skills?: boolean;
}

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

/** Deep merge for package.json layers: objects merge, everything else is replaced. */
export function mergeJson(base: Json, override: Json): Json {
    const out: Json = { ...base };
    for (const [key, value] of Object.entries(override)) {
        const current = out[key];
        out[key] = isObject(current) && isObject(value) ? mergeJson(current, value) : value;
    }
    return out;
}

export function titleFromName(name: string): string {
    return name
        .split(/[-_.]+/)
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

export function listTemplates(): string[] {
    return readdirSync(TEMPLATES_DIR).filter((name) =>
        existsSync(join(TEMPLATES_DIR, name, 'package.json'))
    );
}

function readJson(file: string): Json {
    return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as Json) : {};
}

function copyLayer(from: string, to: string): void {
    cpSync(from, to, {
        recursive: true,
        filter: (src) =>
            !NEVER_COPY.has(basename(src)) &&
            !(src === join(from, basename(src)) && LAYER_META.has(basename(src)))
    });
}

function walkFiles(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) out.push(...walkFiles(full));
        else out.push(full);
    }
    return out;
}

export function createProject(options: CreateOptions): string {
    const templates = listTemplates();
    if (!templates.includes(options.template)) {
        throw new Error(
            `Unknown template "${options.template}". Available: ${templates.join(', ')}`
        );
    }

    const templateDir = join(TEMPLATES_DIR, options.template);
    const variant = options.example ? EXAMPLE : SKELETON;
    const variantDir = join(templateDir, variant);
    if (!existsSync(variantDir)) {
        throw new Error(`Template "${options.template}" has no ${variant} yet`);
    }

    const target = resolve(options.dir);
    if (existsSync(target) && (!statSync(target).isDirectory() || readdirSync(target).length > 0)) {
        throw new Error(`${target} already exists and is not empty`);
    }

    const packageName = basename(target).toLowerCase();
    if (!PACKAGE_NAME_RE.test(packageName)) {
        throw new Error(
            `Folder name "${basename(target)}" is not a valid package name (a-z, 0-9, . _ -)`
        );
    }

    copyLayer(SHARED_DIR, target);
    copyLayer(join(templateDir, 'common'), target);
    copyLayer(variantDir, target);

    const pkg = [templateDir, variantDir].reduce(
        (merged, dir) => mergeJson(merged, readJson(join(dir, 'package.json'))),
        readJson(join(SHARED_DIR, 'package.json'))
    );
    // Merging appends template-only keys; restore the usual package.json order.
    const ordered = Object.fromEntries(
        [...PACKAGE_KEY_ORDER.filter((key) => key in pkg), ...Object.keys(pkg)].map((key) => [
            key,
            pkg[key]
        ])
    );
    writeFileSync(join(target, 'package.json'), `${JSON.stringify(ordered, null, 4)}\n`);

    const structure = readFileSync(join(variantDir, 'STRUCTURE.md'), 'utf8').trim();
    const claudePath = join(target, 'CLAUDE.md');
    writeFileSync(
        claudePath,
        readFileSync(claudePath, 'utf8').replace(STRUCTURE_MARKER, structure)
    );

    // The example keeps its own name unless a title is given; the skeleton is named after the folder.
    const htmlPath = join(target, 'index.html');
    const htmlTitle = /<title>([^<]*)<\/title>/.exec(readFileSync(htmlPath, 'utf8'))?.[1];
    const title =
        options.title ?? (options.example && htmlTitle ? htmlTitle : titleFromName(packageName));

    for (const file of walkFiles(target)) {
        if (!TEXT_EXTENSIONS.has(extname(file))) continue;
        const text = readFileSync(file, 'utf8');
        let next = text
            .replaceAll('{{GAME_TITLE}}', title)
            .replaceAll('{{PACKAGE_NAME}}', packageName);
        if (file === htmlPath) {
            next = next.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
        }
        if (next !== text) writeFileSync(file, next);
    }

    if (options.skills !== false) {
        const install = spawnSync(
            'bunx',
            ['skills', 'add', SKILLS_REPO, '--agent', 'claude-code', '--skill', '*', '-y'],
            { cwd: target, stdio: 'inherit' }
        );
        if (install.status !== 0) {
            throw new Error(
                `Could not install skills from ${SKILLS_REPO} (needs network); use --no-skills to skip`
            );
        }
    }

    if (options.git) {
        spawnSync('git', ['init', '-q'], { cwd: target, stdio: 'inherit' });
    }

    return target;
}

function parseArgs(argv: readonly string[]): CreateOptions {
    let dir: string | undefined;
    let template: string | undefined;
    let title: string | undefined;
    let example = false;
    let git = true;
    let skills = true;

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--template' || arg === '-t') template = argv[++i];
        else if (arg === '--title') title = argv[++i];
        else if (arg === '--example') example = true;
        else if (arg === '--no-git') git = false;
        else if (arg === '--no-skills') skills = false;
        else if (arg && !arg.startsWith('-') && dir === undefined) dir = arg;
        else throw new Error(`Unknown argument "${arg}"`);
    }

    if (!dir || !template) {
        throw new Error(
            `Usage: bun run create <dir> --template <${listTemplates().join('|')}> [--example] [--title "Game Title"] [--no-git] [--no-skills]`
        );
    }
    return { dir, template, example, git, skills, ...(title !== undefined && { title }) };
}

if (import.meta.main) {
    try {
        const options = parseArgs(process.argv.slice(2));
        const target = createProject(options);
        console.log(`✅ Created ${target}`);
        console.log(`   ${options.template} · ${options.example ? 'example game' : 'skeleton'}\n`);
        console.log('Next steps:');
        console.log(`  cd ${target}`);
        console.log('  bun install');
        console.log('  bun run dev        # http://localhost:8080');
        console.log('  bun run zip        # release gate → playable-bundle.zip');
    } catch (error) {
        console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }
}
