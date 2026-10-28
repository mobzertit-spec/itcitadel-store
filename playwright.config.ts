import { defineConfig, devices } from '@playwright/test'

/** Browser tests against the production build (`npm run build` first). Supabase calls are answered by the tests. */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: process.env.CI ? 'github' : 'list',
  // steady pages by default (no autoplay, no flights); the motion tests switch it back on
  use: { baseURL: 'http://localhost:4173', trace: 'retain-on-failure', contextOptions: { reducedMotion: 'reduce' } },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: { command: 'npx vite preview --port 4173 --strictPort', port: 4173, reuseExistingServer: !process.env.CI },
})
