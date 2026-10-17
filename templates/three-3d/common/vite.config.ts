import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';

const alias = (dir: string): string => path.resolve(process.cwd(), dir);

const buildLog = (): Plugin => ({
    name: 'build-log',
    buildStart() {
        process.stdout.write('Building for production...\n');
    },
    buildEnd() {
        process.stdout.write('✨ Done ✨\n');
    }
});

// Playables rule #8: relative asset paths, hence base './'. The engine gets its own chunk.
export default defineConfig(({ command }) => {
    const production = command === 'build';
    return {
        base: './',
        logLevel: production ? 'warn' : 'info',
        resolve: {
            alias: {
                '@core': alias('src/core'),
                '@render': alias('src/render'),
                '@input': alias('src/input'),
                '@audio': alias('src/audio'),
                '@ui': alias('src/ui'),
                '@sdk': alias('src/sdk'),
                '@lib': alias('src/lib')
            }
        },
        build: {
            chunkSizeWarningLimit: 1500,
            rollupOptions: {
                output: {
                    manualChunks: { three: ['three'] }
                }
            },
            ...(production && {
                minify: 'terser' as const,
                terserOptions: {
                    compress: { passes: 2 },
                    mangle: true,
                    format: { comments: false }
                }
            })
        },
        server: {
            port: Number(process.env['PORT'] ?? 8080),
            strictPort: true
        },
        plugins: production ? [buildLog()] : []
    };
});
