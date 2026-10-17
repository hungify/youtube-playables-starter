/**
 * Generates every template variant and runs its release gate, exactly as a user would after
 * `bun run create`. This is the starter's real test suite.
 *
 *   bun run verify                 # bun install + bun run zip for every variant
 *   bun run verify --e2e           # ...plus Playwright
 *   bun run verify three-3d        # only variants whose name contains "three-3d"
 *
 * Projects go to <tmpdir>/playables-starter-verify/<variant> (printed at the end), outside this
 * repository, so the starter's own .gitignore and lint config cannot leak into them.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createProject, listTemplates } from './create';

const PLAYGROUND = join(tmpdir(), 'playables-starter-verify');
/** e2e dev servers start here and count up, so variants never share (or reuse) a port. */
const FIRST_E2E_PORT = 8090;

interface Variant {
    readonly name: string;
    readonly template: string;
    readonly example: boolean;
}

function variants(): Variant[] {
    const out: Variant[] = [];
    for (const template of listTemplates()) {
        for (const example of [false, true]) {
            const dir = join(
                import.meta.dir,
                '..',
                'templates',
                template,
                example ? 'example' : 'skeleton'
            );
            if (existsSync(dir)) {
                out.push({
                    name: `${template}-${example ? 'example' : 'skeleton'}`,
                    template,
                    example
                });
            }
        }
    }
    return out;
}

function run(cwd: string, args: string[], env: Record<string, string> = {}): boolean {
    console.log(`\n$ (${cwd.replace(`${PLAYGROUND}/`, '')}) ${args.join(' ')}`);
    const result = spawnSync(args[0] ?? 'bun', args.slice(1), {
        cwd,
        stdio: 'inherit',
        env: { ...process.env, ...env }
    });
    return result.status === 0;
}

const e2e = process.argv.includes('--e2e');
const filters = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const selected = variants().filter(
    (variant) => filters.length === 0 || filters.some((f) => variant.name.includes(f))
);

const results: Array<{ name: string; ok: boolean }> = [];
for (const [index, variant] of selected.entries()) {
    const dir = join(PLAYGROUND, variant.name);
    rmSync(dir, { recursive: true, force: true });
    console.log(`\n━━━ ${variant.name} ━━━`);
    createProject({ dir, template: variant.template, example: variant.example, git: false });

    // Browsers come from the project's own Playwright version; CI also needs the system deps.
    const installBrowsers = ['bunx', 'playwright', 'install', 'chromium'];
    if (process.env['CI']) installBrowsers.push('--with-deps');

    const ok =
        run(dir, ['bun', 'install']) &&
        run(dir, ['bun', 'run', 'zip']) &&
        (!e2e ||
            (run(dir, installBrowsers) &&
                run(dir, ['bun', 'run', 'test:e2e'], { PORT: String(FIRST_E2E_PORT + index) })));
    results.push({ name: variant.name, ok });
}

console.log(`\n━━━ Summary (${PLAYGROUND}) ━━━`);
for (const { name, ok } of results) console.log(`${ok ? '✅' : '❌'} ${name}`);
if (results.length === 0 || results.some((r) => !r.ok)) process.exit(1);
