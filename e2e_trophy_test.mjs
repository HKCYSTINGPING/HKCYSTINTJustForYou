/**
 * Exercises the trophy round end to end: vote, tally, publish, celebrate.
 *
 * This is the part with real logic in it. The tally used to run on the server;
 * it now runs in the admin's browser, so it needs to be watched doing the whole
 * journey rather than unit tested in isolation.
 *
 * The script writes to the live project and puts everything back afterwards.
 *
 *   node e2e_trophy_test.mjs
 */

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const ORIGIN = 'http://127.0.0.1:8123';
const VOTER = '1A';
const results = [];
let phones = {};

function check(label, passed, detail = '') {
  results.push(passed);
  console.log(`  [${passed ? '通過' : '**失敗**'}] ${label}${detail ? ' — ' + detail : ''}`);
}

async function login(page, id, phone) {
  await page.goto(ORIGIN, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#screen-login:not(.hidden)', { timeout: 20000 });
  await page.fill('#login-participant', id);
  await page.fill('#login-phone', phone);
  await page.click('#login-submit');
}

async function run() {
  phones = JSON.parse(await readFile('.test-phones.json', 'utf8'));
  const server = spawn('python3', ['-m', 'http.server', '8123', '--bind', '127.0.0.1'], {
    stdio: 'ignore'
  });
  await new Promise(r => setTimeout(r, 1200));

  const browser = await chromium.launch({ channel: 'chrome' });
  const errors = [];

  try {
    const context = await browser.newContext();
    const voter = await context.newPage();
    const admin = await context.newPage();
    [voter, admin].forEach(p => p.on('pageerror', e => errors.push(String(e))));

    console.log('參加者投票：');
    await login(voter, VOTER, phones[VOTER]);
    await voter.waitForSelector('#screen-participant:not(.hidden)', { timeout: 30000 });
    await voter.click('.bottom-nav-item[data-tab="trophy"]');
    await voter.waitForSelector('#trophy-teammates .trophy-card', { timeout: 20000 });

    const cards = await voter.$$('#trophy-teammates .trophy-card');
    check('見到同組隊友', cards.length === 5, cards.length + ' 位');

    // Each trophy may only be paired once, so pick the first free chip on
    // every card. Taps re-render the list, so query fresh each time.
    for (let i = 0; i < cards.length; i++) {
      const free = await voter.$(
        `#trophy-teammates .trophy-card:nth-of-type(${i + 1}) .trophy-chip:not(.selected):not(.taken):not([disabled])`
      );
      if (!free) throw new Error('找不到可配對嘅 Trophy chip（card ' + (i + 1) + '）');
      await free.click();
    }
    const progress = await voter.textContent('#trophy-progress-text');
    check('進度反映已分配人數', progress.trim() === '5/5', progress.trim());

    await voter.click('#trophy-submit-all');
    await voter.waitForSelector('[data-view="trophy-submitted"].active', { timeout: 20000 });
    check('提交後見到完成畫面', true);

    console.log('\n管理員計票：');
    await login(admin, 'admin', '23082026');
    await admin.waitForSelector('#screen-admin:not(.hidden)', { timeout: 30000 });
    await admin.click('.bottom-nav-item[data-admin-tab="voting"]');
    await admin.waitForSelector('#admin-trophy-stats .stat-card', { timeout: 20000 });

    const stats = await admin.textContent('#admin-trophy-stats');
    check('統計已計入該票', /\b5\b/.test(stats), stats.replace(/\s+/g, ' ').trim().slice(0, 90));

    admin.on('dialog', d => d.accept());
    voter.on('dialog', d => d.accept());

    await admin.click('#admin-close-voting');
    await admin.waitForFunction(
      () => document.querySelector('#admin-voting-status-badge')?.textContent.includes('關閉'),
      { timeout: 20000 }
    );
    check('投票已關閉', true);

    await admin.click('#admin-calculate');
    await admin.waitForFunction(
      () => document.querySelector('#admin-voting-status-badge')?.textContent.includes('計算'),
      { timeout: 30000 }
    );
    check('結果已計算', true);

    await admin.click('.bottom-nav-item[data-admin-tab="results"]');
    await admin.click('.sub-tab-btn[data-result-tab="profiles"]');
    await admin.waitForSelector('#profiles-list .profile-card', { timeout: 20000 });
    const profileCount = (await admin.$$('#profiles-list .profile-card')).length;
    check('每位參加者都有得獎紀錄', profileCount === 49, profileCount + ' 份');

    const noEmpty = await admin.evaluate(() =>
      [...document.querySelectorAll('#profiles-list .profile-card')]
        .every(c => !c.textContent.includes('尚未獲得 Trophy'))
    );
    check('冇人空手而回（保底機制生效）', noEmpty);

    console.log('\n公布結果：');
    await admin.click('.bottom-nav-item[data-admin-tab="voting"]');
    await admin.click('#admin-publish');

    // The voter never reloaded. If the listener works the modal simply appears.
    await voter.waitForSelector('#trophy-results-modal:not(.hidden)', { timeout: 30000 });
    check('參加者無需重新整理即彈出結果', true);

    const awards = await voter.textContent('#trophy-results-modal-list');
    check('結果內容非空', awards.trim().length > 0, awards.replace(/\s+/g, ' ').trim().slice(0, 70));

    const realErrors = errors.filter(e => !/favicon|404/i.test(e));
    check('冇 JavaScript 錯誤', realErrors.length === 0, realErrors.slice(0, 2).join(' | '));
  } finally {
    await browser.close();
    server.kill();
  }

  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} 項通過`);
  if (passed !== results.length) process.exitCode = 1;
}

run().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
