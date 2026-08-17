/**
 * Drives the real app in a real browser against the real Firebase project.
 *
 * The rewrite moved every read and write to Firestore, so the only test worth
 * trusting is one that logs in the way a participant does and checks that what
 * appears on screen is what the database actually holds.
 *
 *   node e2e_test.mjs
 */

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const ORIGIN = 'http://127.0.0.1:8123';
const results = [];

function check(label, passed, detail = '') {
  results.push(passed);
  const mark = passed ? '通過' : '**失敗**';
  console.log(`  [${mark}] ${label}${detail ? ' — ' + detail : ''}`);
}

function serve() {
  const proc = spawn('python3', ['-m', 'http.server', '8123', '--bind', '127.0.0.1'], {
    stdio: 'ignore'
  });
  return proc;
}

async function dismissOnboarding(page) {
  await page.evaluate(() => {
    const keys = [
      'participant:home', 'participant:send', 'participant:inbox', 'participant:sent',
      'participant:trophy', 'participant:profile',
      'participant:staff:dashboard', 'participant:staff:messages', 'participant:staff:voting', 'participant:staff:results',
      'admin:dashboard', 'admin:messages', 'admin:voting', 'admin:results', 'admin:settings'
    ];
    const seen = {};
    keys.forEach(k => { seen[k] = true; });
    localStorage.setItem('tnit_onboarding_seen_v2', JSON.stringify(seen));
    const coach = document.getElementById('onboarding-coach');
    if (coach) {
      coach.classList.add('hidden');
      coach.setAttribute('aria-hidden', 'true');
    }
  });
}

async function login(page, id, phone) {
  await page.goto(ORIGIN, { waitUntil: 'domcontentloaded' });
  await dismissOnboarding(page);
  await page.waitForSelector('#screen-login:not(.hidden)', { timeout: 20000 });
  await page.fill('#login-participant', id);
  await page.fill('#login-phone', phone);
  await page.click('#login-submit');
  await dismissOnboarding(page);
}

async function run() {
  const server = serve();
  await new Promise(r => setTimeout(r, 1500));

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [];
  const missing = [];

  try {
    const context = await browser.newContext();
    await context.addInitScript(() => {
      const keys = [
        'participant:home', 'participant:send', 'participant:inbox', 'participant:sent',
        'participant:trophy', 'participant:profile',
        'participant:staff:dashboard', 'participant:staff:messages', 'participant:staff:voting', 'participant:staff:results',
        'admin:dashboard', 'admin:messages', 'admin:voting', 'admin:results', 'admin:settings'
      ];
      const seen = {};
      keys.forEach(k => { seen[k] = true; });
      localStorage.setItem('tnit_onboarding_seen_v2', JSON.stringify(seen));
    });
    context.on('response', res => {
      if (res.status() === 404) missing.push(res.url());
    });
    const page1 = await context.newPage();
    const page2 = await context.newPage();
    const admin = await context.newPage();
    const stranger = await context.newPage();
    [page1, page2, admin, stranger].forEach(p => {
      p.on('pageerror', err => errors.push(String(err)));
      p.on('console', msg => {
        const text = msg.text();
        if (msg.type() === 'error' && !text.includes('favicon') && !text.includes('404') && !text.includes('400') && !text.includes('identitytoolkit')) {
          errors.push(text);
        }
      });
      p.on('dialog', d => d.accept());
    });

    console.log('參加者流程：');
    await login(page1, '1A', '1a');
    await page1.waitForSelector('#screen-participant:not(.hidden)', { timeout: 30000 });
    await dismissOnboarding(page1);
    const greeting = await page1.textContent('#participant-greeting');
    check('用 1A 登入後進入參加者版面', true);
    check('顯示正確稱呼', greeting.includes('1A'), greeting.trim());

    // Sending: the message must show up without a page reload.
    const body = '自動測試留言 ' + Date.now();
    await page1.click('.home-card[data-nav="send"]');
    await page1.waitForSelector('#view-send:not(.hidden)', { timeout: 15000 });
    await page1.waitForSelector('#send-content', { state: 'visible', timeout: 10000 });
    await page1.fill('#send-receiver', '1C');
    await page1.fill('#send-content', body);
    await page1.click('#send-submit');
    await page1.waitForSelector(`text=${body}`, { timeout: 20000 });
    check('留言即時出現喺已發送列表', true);

    // Whoever received it should see it arrive live, with no refresh at all.
    await login(page2, '1C', await phoneFor('1C'));
    await page2.waitForSelector('#screen-participant:not(.hidden)', { timeout: 30000 });
    await dismissOnboarding(page2);
    await page2.click('.bottom-nav-item[data-tab="inbox"]');
    await page2.waitForSelector(`text=${body}`, { timeout: 20000 });
    check('接收者無需重新整理即收到留言', true);

    // Anonymity is the whole promise of the app.
    const inboxHtml = await page2.innerHTML('#inbox-list');
    check('收件箱唔會洩露寄件者身分', !inboxHtml.includes('1A'));

    console.log('\n管理員流程：');
    await login(admin, 'admin', '23082026');
    await admin.waitForSelector('#screen-admin:not(.hidden)', { timeout: 30000 });
    await dismissOnboarding(admin);
    check('管理員登入成功', true);

    await admin.click('.bottom-nav-item[data-admin-tab="messages"]');
    await admin.waitForSelector(`text=${body}`, { timeout: 20000 });
    check('管理員睇到啱啱寄出嘅留言', true);

    const stats = await admin.textContent('#admin-dashboard-stats').catch(() => '');
    check('儀表板有統計數字', /\d/.test(stats));

    console.log('\n錯誤登入：');
    await login(stranger, '1B', 'WRONG_PASS');
    await stranger.waitForSelector('.toast', { timeout: 20000 });
    const toast = await stranger.textContent('.toast');
    check('錯密碼被拒絕', toast.includes('不正確') || toast.includes('錯誤'), toast.trim());
    const stillLogin = await stranger.isVisible('#screen-login');
    check('錯密碼留喺登入畫面', stillLogin);

    console.log('\n瀏覽器主控台：');
    const realErrors = errors.filter(e => !/favicon|404|net::ERR_/i.test(e));
    check('冇 JavaScript 錯誤', realErrors.length === 0,
      realErrors.slice(0, 3).join(' | '));

    const realMissing = [...new Set(missing)].filter(u => !u.includes('favicon'));
    check('冇缺失檔案', realMissing.length === 0, realMissing.join(' | '));
  } finally {
    await browser.close();
    server.kill();
  }

  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} 項通過`);
  if (passed !== results.length) process.exitCode = 1;
}

async function phoneFor(participantId) {
  const { readFile } = await import('node:fs/promises');
  const raw = JSON.parse(await readFile('.test-phones.json', 'utf8'));
  return raw[participantId];
}

run().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
