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

async function login(page, id, phone) {
  await page.goto(ORIGIN, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#screen-login:not(.hidden)', { timeout: 20000 });
  await page.fill('#login-participant', id);
  await page.fill('#login-phone', phone);
  await page.click('#login-submit');
}

async function run() {
  const server = serve();
  await new Promise(r => setTimeout(r, 1200));

  const browser = await chromium.launch({ channel: 'chrome' });
  const errors = [];
  const missing = [];

  try {
    const context = await browser.newContext();
    context.on('response', res => {
      if (res.status() === 404) missing.push(res.url());
    });
    const page = await context.newPage();
    page.on('pageerror', err => errors.push(String(err)));
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    console.log('參加者流程：');
    await login(page, '1A', '98765432');
    await page.waitForSelector('#screen-participant:not(.hidden)', { timeout: 30000 });
    check('用 1A 登入後進入參加者版面', true);

    const greeting = await page.textContent('#participant-greeting');
    check('顯示正確稱呼', greeting.includes('1A'), greeting.trim());

    // Sending: the message must show up without a page reload.
    const body = '自動測試留言 ' + Date.now();
    await page.click('.home-card[data-nav="send"]');
    await page.waitForSelector('#send-receiver', { state: 'visible', timeout: 10000 });
    await page.fill('#send-receiver', '1B');
    await page.fill('#send-content', body);
    await page.click('#send-submit');

    await page.waitForSelector(`text=${body}`, { timeout: 20000 });
    check('留言即時出現喺已發送列表', true);

    // Whoever received it should see it arrive live, with no refresh at all.
    const receiver = await context.newPage();
    receiver.on('pageerror', err => errors.push('receiver: ' + String(err)));
    await login(receiver, '1B', await phoneFor('1B'));
    await receiver.waitForSelector('#screen-participant:not(.hidden)', { timeout: 30000 });
    await receiver.click('.bottom-nav-item[data-tab="inbox"]');
    await receiver.waitForSelector(`text=${body}`, { timeout: 20000 });
    check('接收者無需重新整理即收到留言', true);

    // Anonymity is the whole promise of the app.
    const inboxHtml = await receiver.innerHTML('#inbox-list');
    check('收件箱唔會洩露寄件者身分', !inboxHtml.includes('1A'));

    console.log('\n管理員流程：');
    const admin = await context.newPage();
    admin.on('pageerror', err => errors.push('admin: ' + String(err)));
    await login(admin, 'admin', '23082026');
    await admin.waitForSelector('#screen-admin:not(.hidden)', { timeout: 30000 });
    check('管理員登入成功', true);

    await admin.click('.bottom-nav-item[data-admin-tab="messages"]');
    await admin.waitForSelector(`text=${body}`, { timeout: 20000 });
    check('管理員睇到啱啱寄出嘅留言', true);

    const stats = await admin.textContent('#admin-dashboard-stats').catch(() => '');
    check('儀表板有統計數字', /\d/.test(stats));

    console.log('\n錯誤登入：');
    const stranger = await context.newPage();
    await login(stranger, '1A', '00000000');
    await stranger.waitForSelector('.toast', { timeout: 20000 });
    const toast = await stranger.textContent('.toast');
    check('錯密碼被拒絕', toast.includes('不正確'), toast.trim());
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
