import { defineConfig, devices } from '@playwright/test';

// Override with PORT=<port> when 8080 is taken. A running server is never reused, because on a
// machine with several games it could be a different one.
const PORT = Number(process.env['PORT'] ?? 8080);

export default defineConfig({
    testDir: './e2e',
    testMatch: '**/*.e2e.ts',
    fullyParallel: true,
    reporter: 'list',
    use: {
        baseURL: `http://localhost:${PORT}`,
        ...devices['iPad Pro 11'],
        defaultBrowserType: 'chromium',
        // CI renders WebGL in software; 2x pixels would starve the frame rate, and the game's
        // frame clamp then slows game time below the wall clock the tests wait on.
        deviceScaleFactor: 1
    },
    webServer: {
        command: 'bun run dev',
        url: `http://localhost:${PORT}`,
        env: { PORT: String(PORT) },
        reuseExistingServer: false
    }
});
