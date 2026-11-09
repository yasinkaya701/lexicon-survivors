import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import http from 'http';

const ROOT_DIR = path.resolve(__dirname, '../../');
const NEXT_DIR = path.join(ROOT_DIR, '.next');
const TEST_PORT = 3847;

function httpGet(url: string): Promise<{ statusCode: number | undefined; body: string; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body: data,
          headers: res.headers,
        });
      });
    });
    req.on('error', (err) => reject(err));
    req.setTimeout(8000, () => {
      req.destroy(new Error('HTTP request timed out'));
    });
  });
}

function waitForServer(port: number, maxRetries = 25, delayMs = 300): Promise<void> {
  return new Promise((resolve, reject) => {
    let retries = 0;
    const interval = setInterval(() => {
      retries++;
      const req = http.get(`http://127.0.0.1:${port}/`, (res) => {
        clearInterval(interval);
        res.destroy();
        resolve();
      });
      req.on('error', () => {
        if (retries >= maxRetries) {
          clearInterval(interval);
          reject(new Error(`Server failed to start on port ${port} within timeout`));
        }
      });
      req.setTimeout(250, () => req.destroy());
    }, delayMs);
  });
}

describe('Adversarial Route Generation & Runtime Server Verification', () => {
  let serverProcess: ChildProcess | null = null;

  it('verifies Next.js production build artifacts exist', () => {
    expect(fs.existsSync(NEXT_DIR), '.next build directory must exist').toBe(true);

    const appPathsManifest = path.join(NEXT_DIR, 'server/app-paths-manifest.json');
    expect(fs.existsSync(appPathsManifest)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(appPathsManifest, 'utf-8'));
    expect(manifest['/page']).toBeDefined();
    expect(manifest['/legacy/page']).toBeDefined();
  });

  it('verifies prerendered static HTML for root route (/) contains all Brotato elements', () => {
    const rootHtmlCandidates = [
      path.join(NEXT_DIR, 'server/app/index.html'),
      path.join(NEXT_DIR, 'server/app/(index)/page.html'),
      path.join(NEXT_DIR, 'server/app/page.html'),
    ];

    const foundHtml = rootHtmlCandidates.find((p) => fs.existsSync(p));
    expect(foundHtml, 'Expected static prerender HTML for / to exist').toBeDefined();

    const html = fs.readFileSync(foundHtml!, 'utf-8');

    // Key headers & badges
    expect(html).toContain('BROTATO: KAMPÜS ROGUELITE');
    expect(html).toContain('YKS &amp; BUEPT EDITION');
    expect(html).toContain('href="/legacy"');

    // 4 Characters
    expect(html).toContain('Patates Mezun');
    expect(html).toContain('Hazırlık Kurdu');
    expect(html).toContain('Mühendislik Dahisi');
    expect(html).toContain('Kilyos Tankı');

    // 17 RPG Stats verification
    expect(html).toContain('17 RPG Stat Tablosu');
    expect(html).toContain('1. Maks Can (HP)');
    expect(html).toContain('2. Can Yenileme (Regen)');
    expect(html).toContain('3. Can Çalma (Life Steal)');
    expect(html).toContain('4. Hasar % (Damage)');
    expect(html).toContain('5. Yakın Dövüş Hasarı');
    expect(html).toContain('6. Menzilli Hasar');
    expect(html).toContain('7. Element Hasarı');
    expect(html).toContain('8. Saldırı Hızı (Atk Spd)');
    expect(html).toContain('9. Kritik Şans');
    expect(html).toContain('10. Mühendislik');
    expect(html).toContain('11. Menzil (Range)');
    expect(html).toContain('12. Zırh (Armor)');
    expect(html).toContain('13. Sıyrılma (Dodge)');
    expect(html).toContain('14. Hız % (Movement)');
    expect(html).toContain('15. Şans (Luck)');
    expect(html).toContain('16. Hasat (Harvesting)');
    expect(html).toContain('17. Çekim Alanı (Pickup Range)');

    // Launch CTA & Weapons
    expect(html).toContain('Silah Yuvaları (6 Eşzamanlı)');
    expect(html).toContain('ARENAYA BAŞLA (DALGA 1)');
  });

  it('verifies prerendered static HTML for /legacy route contains all 5 legacy game modes', () => {
    const legacyHtmlCandidates = [
      path.join(NEXT_DIR, 'server/app/legacy.html'),
      path.join(NEXT_DIR, 'server/app/legacy/page.html'),
    ];

    const foundHtml = legacyHtmlCandidates.find((p) => fs.existsSync(p));
    expect(foundHtml, 'Expected static prerender HTML for /legacy to exist').toBeDefined();

    const html = fs.readFileSync(foundHtml!, 'utf-8');

    // Archive notice & return link
    expect(html).toContain('Legacy Prototype Archive');
    expect(html).toContain('Back to Brotato Roguelite');
    expect(html).toContain('href="/"');

    // 5 Game modes
    expect(html).toContain('Mezuna Kalma!');
    expect(html).toContain('Kampüs Royale');
    expect(html).toContain('Exam Survivors');
    expect(html).toContain('Project Kilyos');
    expect(html).toContain('Spike Defuse');
  });

  describe('Live Next.js Server Request Tests', () => {
    beforeAll(async () => {
      // Spawn Next.js production server
      serverProcess = spawn('npx', ['next', 'start', '-p', String(TEST_PORT)], {
        cwd: ROOT_DIR,
        env: { ...process.env, PATH: `${process.env.HOME}/.local/node/bin:${process.env.PATH}` },
        stdio: 'pipe',
      });

      await waitForServer(TEST_PORT);
    }, 15000);

    afterAll(() => {
      if (serverProcess) {
        serverProcess.kill('SIGTERM');
      }
    });

    it('serves GET / with 200 OK and expected HTML payload', async () => {
      const res = await httpGet(`http://127.0.0.1:${TEST_PORT}/`);
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('text/html');
      expect(res.body).toContain('BROTATO: KAMPÜS ROGUELITE');
      expect(res.body).toContain('17 RPG Stat Tablosu');
      expect(res.body).toContain('Patates Mezun');
    });

    it('serves GET /legacy with 200 OK and expected legacy payload', async () => {
      const res = await httpGet(`http://127.0.0.1:${TEST_PORT}/legacy`);
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('text/html');
      expect(res.body).toContain('Legacy Prototype Archive');
      expect(res.body).toContain('Back to Brotato Roguelite');
      expect(res.body).toContain('Mezuna Kalma!');
      expect(res.body).toContain('Kampüs Royale');
    });

    it('returns 404 for non-existent route without crashing server', async () => {
      const res = await httpGet(`http://127.0.0.1:${TEST_PORT}/non-existent-adversarial-route`);
      expect(res.statusCode).toBe(404);
    });
  });
});
