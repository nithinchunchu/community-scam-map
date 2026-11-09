import { chromium } from '../frontend/node_modules/@playwright/test/index.mjs';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.resolve('docs', 'screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function run() {
  console.log('[*] Starting Vite Preview Server on port 4173...');
  const server = spawn('npm.cmd', ['run', 'preview', '--prefix', 'frontend', '--', '--port', '4173'], {
    stdio: 'pipe',
    shell: true
  });

  server.stdout.on('data', (d) => process.stdout.write(`[Vite] ${d}`));
  server.stderr.on('data', (d) => process.stderr.write(`[Vite Err] ${d}`));

  // Wait 3 seconds for preview server to be ready
  await new Promise((res) => setTimeout(res, 3000));

  console.log('[*] Launching Chromium (390 x 844)...');
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'
  });

  const page = await context.newPage();

  // Helper for mock API responses
  await page.route('**/health', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  });

  await page.route('**/license', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        licensee: 'National Demo User',
        expires_at: '2026-12-31T23:59:59+05:30',
        status: 'valid',
        seconds_remaining: 86400
      })
    });
  });

  await page.route('**/alerts*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          pincode: '560102',
          locality: 'HSR Layout',
          city: 'Bengaluru',
          alert_type: 'SPIKE',
          scam_type: 'digital-arrest',
          created_at: new Date().toISOString()
        }
      ])
    });
  });

  await page.route('**/map*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { pincode: '560102', locality: 'HSR Layout', city: 'Bengaluru', lat: 12.9116, lng: 77.6473, count: 18, severity: 'CRIT', top_scam_type: 'digital-arrest' },
        { pincode: '560038', locality: 'Indiranagar', city: 'Bengaluru', lat: 12.9784, lng: 77.6408, count: 11, severity: 'HIGH', top_scam_type: 'upi-refund-qr' },
        { pincode: '560034', locality: 'Koramangala', city: 'Bengaluru', lat: 12.9352, lng: 77.6245, count: 5, severity: 'MED', top_scam_type: 'fake-kyc-link' }
      ])
    });
  });

  // 1. Home Screen
  console.log('[*] Capturing Home screen...');
  await page.goto('http://localhost:4173/');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_home.png') });

  // 2. Fast Report Screen
  console.log('[*] Capturing Report screen...');
  await page.goto('http://localhost:4173/report');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_report.png') });

  // 3. Result Screens (All 4 verdicts)
  // 3a. KNOWN_SCAM
  await page.route('**/lookup?*type=phone&value=*9876543210*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        verdict: 'KNOWN_SCAM',
        report_count: 14,
        distinct_reporters: 7,
        first_seen: '2026-10-20T10:00:00+05:30',
        last_seen: '2026-10-27T18:21:04+05:30',
        scam_type: 'digital-arrest',
        display_value: '+919876543210',
        evidence: [
          { occurred_at: '2026-10-27T18:21:04+05:30', channel: 'Phone call', scam_type: 'digital-arrest', pincode: '560102' }
        ],
        challenged: false
      })
    });
  });
  console.log('[*] Capturing Result: Known Scam...');
  await page.goto('http://localhost:4173/result?type=phone&value=%2B919876543210');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_result_known_scam.png') });

  // 3b. SUSPICIOUS
  await page.route('**/lookup?*type=phone&value=*9444400000*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        verdict: 'SUSPICIOUS',
        report_count: 2,
        distinct_reporters: 2,
        first_seen: '2026-10-26T12:00:00+05:30',
        last_seen: '2026-10-27T15:00:00+05:30',
        scam_type: 'upi-refund-qr',
        display_value: '94XXXXX000',
        evidence: [
          { occurred_at: '2026-10-27T15:00:00+05:30', channel: 'QR code', scam_type: 'upi-refund-qr', pincode: '560038' }
        ],
        challenged: false
      })
    });
  });
  console.log('[*] Capturing Result: Suspicious...');
  await page.goto('http://localhost:4173/result?type=phone&value=9444400000');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_result_suspicious.png') });

  // 3c. NO_REPORTS
  await page.route('**/lookup?*type=phone&value=*9111122222*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        verdict: 'NO_REPORTS',
        report_count: 0,
        distinct_reporters: 0,
        first_seen: null,
        last_seen: null,
        scam_type: null,
        display_value: '91XXXXX222',
        evidence: [],
        challenged: false
      })
    });
  });
  console.log('[*] Capturing Result: No Reports...');
  await page.goto('http://localhost:4173/result?type=phone&value=9111122222');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_result_no_reports.png') });

  // 3d. VERIFIED_BUSINESS
  await page.route('**/lookup?*type=phone&value=*18001600*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        verdict: 'VERIFIED_BUSINESS',
        report_count: 0,
        distinct_reporters: 0,
        first_seen: null,
        last_seen: null,
        scam_type: null,
        display_value: '18001600',
        evidence: [],
        challenged: false,
        verified_name: 'HDFC Bank customer care'
      })
    });
  });
  console.log('[*] Capturing Result: Verified Business...');
  await page.goto('http://localhost:4173/result?type=phone&value=18001600');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_result_verified_business.png') });

  // 4. Map Screen
  console.log('[*] Capturing Map screen...');
  await page.goto('http://localhost:4173/map');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_map.png') });

  // 5. Expired Screen
  console.log('[*] Capturing Expired Screen...');
  // Force expired status on /license
  await page.route('**/license', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        licensee: null,
        expires_at: '2026-11-01T00:00:00Z',
        status: 'expired',
        seconds_remaining: 0,
        reason: 'expired'
      })
    });
  });
  await page.goto('http://localhost:4173/');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_license_expired.png') });

  await browser.close();
  server.kill();
  console.log('[✔] All 8 visual screenshots captured successfully in docs/screenshots/!');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
