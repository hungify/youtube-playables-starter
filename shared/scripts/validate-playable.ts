#!/usr/bin/env bun
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export interface BundleAuditResult {
    readonly fileCount: number;
    readonly totalBytes: number;
    readonly totalMiB: number;
    readonly errors: readonly string[];
    readonly warnings: readonly string[];
}

function walkDir(dir: string): string[] {
    const out: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...walkDir(full));
        else if (entry.isFile()) out.push(full);
    }
    return out;
}

const FORBIDDEN_SOURCE_PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
    [
        /\bvisibilitychange\b/,
        'Page Visibility API (visibilitychange) is forbidden by Rule #6; use YouTubePlayables.setOnPause/setOnResume'
    ],
    [
        /\bdocument\.(?:hidden|visibilityState)\b/,
        'Page Visibility API is forbidden by Rule #6; use YouTubePlayables.setOnPause/setOnResume'
    ],
    [
        /\b(?:localStorage|sessionStorage|indexedDB)\b/,
        'Browser storage is forbidden by Rule #4; use YouTubePlayables.saveData/loadData'
    ]
];

/** Strings that may appear in any bundle without being a network request. */
const ALLOWED_URL_RE = /^https?:\/\/(?:www\.youtube\.com\/game_api\/v1|www\.w3\.org\/)/;
const TEXT_EXTENSIONS = new Set(['.js', '.css', '.html', '.json', '.mjs']);
const BRANDING_RE = /youtube|starter/i;

const stripSlash = (url: string): string => url.replace(/\/$/, '');

/**
 * `allowedUrls` lists inert strings an engine embeds in its code (credits, docs links), matched
 * exactly, ignoring a trailing slash. Templates pass them with `--allow-url <url>`.
 */
export function auditPlayableBundle(
    targetDir: string,
    srcDir?: string,
    allowedUrls: readonly string[] = []
): BundleAuditResult {
    const extraAllowed = new Set(allowedUrls.map(stripSlash));
    const isAllowedUrl = (url: string): boolean =>
        ALLOWED_URL_RE.test(url) || extraAllowed.has(stripSlash(url));
    const files = walkDir(targetDir);
    const errors: string[] = [];
    const warnings: string[] = [];
    const validFilenameRe = /^[A-Za-z0-9_.-]+$/;

    if (srcDir && fs.existsSync(srcDir)) {
        for (const srcFile of walkDir(srcDir)) {
            if (!srcFile.endsWith('.ts') || srcFile.endsWith('.d.ts')) continue;
            const content = fs.readFileSync(srcFile, 'utf8');
            const relSrc = path.relative(process.cwd(), srcFile);
            for (const [pattern, reason] of FORBIDDEN_SOURCE_PATTERNS) {
                if (pattern.test(content)) {
                    errors.push(`${relSrc}: ${reason}`);
                }
            }
        }
    }
    const indexPath = path.join(targetDir, 'index.html');
    if (!fs.existsSync(indexPath)) {
        errors.push('Missing index.html at root of dist/');
    } else {
        const html = fs.readFileSync(indexPath, 'utf8');
        if (!html.includes('https://www.youtube.com/game_api/v1')) {
            errors.push(
                'index.html must include <script src="https://www.youtube.com/game_api/v1"></script>'
            );
        }
        const firstScript = /<script\b[^>]*>/i.exec(html)?.[0] ?? '';
        if (!firstScript.includes('https://www.youtube.com/game_api/v1')) {
            errors.push('The YouTube Playables SDK must be the first <script> in index.html');
        }

        const title = /<title>([^<]*)<\/title>/i.exec(html)?.[1] ?? '';
        if (title.trim() === '' || BRANDING_RE.test(title)) {
            errors.push(
                `index.html <title> "${title}" must be the game name, without YouTube branding or starter text`
            );
        }

        const badSrc = [...html.matchAll(/(?:src|href)=["'](\/[^"']+)["']/g)]
            .map((m) => m[1])
            .filter((val): val is string => Boolean(val));
        if (badSrc.length > 0) {
            errors.push(
                `index.html contains absolute paths (MUST be relative): ${badSrc.join(', ')}`
            );
        }
    }

    if (files.length > 8000) {
        errors.push(`File count (${files.length}) exceeds YouTube Playables limit of 8000`);
    }

    for (const file of files) {
        if (!TEXT_EXTENSIONS.has(path.extname(file))) continue;
        const text = fs.readFileSync(file, 'utf8');
        const external = new Set(
            [...text.matchAll(/https?:\/\/[^\s"'`<>)\\]+/g)]
                .map((match) => match[0])
                .filter((url) => !isAllowedUrl(url))
        );
        for (const url of external) {
            errors.push(
                `${path.relative(targetDir, file)} references external URL ${url} (no external requests allowed)`
            );
        }
    }

    let totalBytes = 0;
    for (const file of files) {
        const rel = path.relative(targetDir, file);
        const segments = rel.split(path.sep);
        for (const seg of segments) {
            if (!validFilenameRe.test(seg)) {
                errors.push(
                    `Invalid filename segment "${seg}" in ${rel} (only A-Za-z0-9_.- allowed)`
                );
            }
        }
        const size = fs.statSync(file).size;
        totalBytes += size;
        if (size > 30 * 1024 * 1024) {
            errors.push(
                `File ${rel} (${(size / 1024 / 1024).toFixed(2)} MiB) exceeds 30 MiB hard limit`
            );
        } else if (size > 512 * 1024) {
            warnings.push(
                `File ${rel} (${(size / 1024).toFixed(1)} KiB) exceeds 512 KiB recommended size`
            );
        }
    }

    const totalMiB = totalBytes / (1024 * 1024);
    if (totalMiB > 30) {
        errors.push(`Initial bundle size (${totalMiB.toFixed(2)} MiB) exceeds 30 MiB hard limit`);
    } else if (totalMiB > 15) {
        warnings.push(
            `Initial bundle size (${totalMiB.toFixed(2)} MiB) exceeds 15 MiB recommended target`
        );
    }

    return {
        fileCount: files.length,
        totalBytes,
        totalMiB,
        errors,
        warnings
    };
}

if (import.meta.main) {
    const distDir = path.resolve(process.cwd(), 'dist');
    const zipFlag = process.argv.includes('--zip');

    if (!fs.existsSync(distDir)) {
        console.error('❌ dist/ directory not found. Run `bun run build` first.');
        process.exit(1);
    }

    const srcDir = path.resolve(process.cwd(), 'src');
    const allowedUrls = process.argv.flatMap((arg, i, argv) =>
        arg === '--allow-url' && argv[i + 1] ? [argv[i + 1] ?? ''] : []
    );
    const result = auditPlayableBundle(distDir, srcDir, allowedUrls);

    console.log('\n📦 YouTube Playables Bundle Audit');
    console.log(`   Files: ${result.fileCount} / 8000`);
    console.log(`   Total Size: ${result.totalMiB.toFixed(2)} MiB (Target < 15 MiB, Max < 30 MiB)`);

    for (const w of result.warnings) console.warn(`⚠️  WARN: ${w}`);
    for (const e of result.errors) console.error(`❌ FAIL: ${e}`);

    if (result.errors.length > 0) {
        process.exit(1);
    }

    console.log('✅ All YouTube Playables certification static checks PASSED!');

    if (zipFlag) {
        const zipPath = path.resolve(process.cwd(), 'playable-bundle.zip');
        if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
        execFileSync('zip', ['-r', '-q', zipPath, '.'], { cwd: distDir });
        const zipMiB = fs.statSync(zipPath).size / (1024 * 1024);
        console.log(`🗜️  Created playable-bundle.zip (${zipMiB.toFixed(2)} MiB)`);
    }
}
