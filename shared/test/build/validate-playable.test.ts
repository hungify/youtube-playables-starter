import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, test, expect } from 'bun:test';
import { auditPlayableBundle } from '../../scripts/validate-playable';

const SDK = '<script src="https://www.youtube.com/game_api/v1"></script>';

function auditHtml(
    html: string,
    extraFiles: Record<string, string> = {},
    allowedUrls: readonly string[] = []
): ReturnType<typeof auditPlayableBundle> {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'yt-playable-html-'));
    try {
        fs.writeFileSync(path.join(tmp, 'index.html'), html);
        for (const [name, content] of Object.entries(extraFiles)) {
            fs.writeFileSync(path.join(tmp, name), content);
        }
        return auditPlayableBundle(tmp, undefined, allowedUrls);
    } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
    }
}

describe('Bundle & Source static validator', () => {
    test('accepts a clean index.html', () => {
        const res = auditHtml(`<head><title>Zombie Rush</title>${SDK}</head>`);
        expect(res.errors).toEqual([]);
    });

    test('requires the SDK to be the first script', () => {
        const res = auditHtml(
            `<head><title>Zombie Rush</title><script src="./a.js"></script>${SDK}</head>`
        );
        expect(res.errors.some((e) => e.includes('first <script>'))).toBe(true);
    });

    test('rejects branded or starter titles and missing titles', () => {
        for (const title of ['YouTube Playables Starter', 'My Starter Game', 'YouTube Racer', '']) {
            const res = auditHtml(`<head><title>${title}</title>${SDK}</head>`);
            expect(res.errors.some((e) => e.includes('<title>'))).toBe(true);
        }
    });

    test('rejects external URLs in built code but allows known inert strings', () => {
        const res = auditHtml(
            `<head><title>Zombie Rush</title>${SDK}</head>`,
            {
                'game.js':
                    'fetch("https://cdn.example.com/lib.js"); const a="http://www.w3.org/2000/svg"; const b="https://phaser.io";'
            },
            ['https://phaser.io/']
        );
        expect(res.errors.some((e) => e.includes('https://cdn.example.com/lib.js'))).toBe(true);
        expect(res.errors.some((e) => e.includes('w3.org'))).toBe(false);
        expect(res.errors.some((e) => e.includes('phaser.io'))).toBe(false);
    });

    test('engine URLs are only allowed when the template opts in', () => {
        const files = { 'game.js': 'const b="https://phaser.io";' };
        const html = `<head><title>Zombie Rush</title>${SDK}</head>`;
        expect(auditHtml(html, files).errors.some((e) => e.includes('phaser.io'))).toBe(true);
        expect(
            auditHtml(html, { 'game.js': 'const b="https://phaser.io/docs";' }, [
                'https://phaser.io'
            ]).errors.some((e) => e.includes('phaser.io/docs'))
        ).toBe(true);
    });

    test('detects absolute paths, invalid filenames, and forbidden browser APIs', () => {
        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'yt-playable-test-'));
        const tmpSrc = fs.mkdtempSync(path.join(os.tmpdir(), 'yt-playable-src-'));
        try {
            fs.writeFileSync(
                path.join(tmp, 'index.html'),
                '<script src="https://www.youtube.com/game_api/v1"></script><script src="/abs.js"></script>'
            );
            fs.writeFileSync(path.join(tmp, 'bad file!.txt'), 'hello');
            fs.writeFileSync(
                path.join(tmpSrc, 'bad.ts'),
                'document.addEventListener("visibilitychange", () => {});'
            );

            const res = auditPlayableBundle(tmp, tmpSrc);
            expect(res.errors.some((e) => e.includes('absolute paths'))).toBe(true);
            expect(res.errors.some((e) => e.includes('Invalid filename'))).toBe(true);
            expect(res.errors.some((e) => e.includes('Page Visibility API'))).toBe(true);
        } finally {
            fs.rmSync(tmp, { recursive: true, force: true });
            fs.rmSync(tmpSrc, { recursive: true, force: true });
        }
    });
});
