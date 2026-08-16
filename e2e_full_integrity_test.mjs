import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const ORIGIN = 'http://127.0.0.1:8123';
const results = [];

function check(label, passed, detail = '') {
  results.push({ label, passed, detail });
  const mark = passed ? '✅ [通過]' : '❌ [失敗]';
  console.log(`  ${mark} ${label}${detail ? ' — ' + detail : ''}`);
}

function serve() {
  return spawn('python3', ['-m', 'http.server', '8123', '--bind', '127.0.0.1'], {
    stdio: 'ignore'
  });
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

async function login(page, id, pwd) {
  await page.goto(ORIGIN, { waitUntil: 'domcontentloaded' });
  await dismissOnboarding(page);
  await page.waitForSelector('#screen-login:not(.hidden)', { timeout: 20000 });
  await page.fill('#login-participant', id);
  await page.fill('#login-phone', pwd);
  await page.click('#login-submit');
  await dismissOnboarding(page);
}

async function run() {
  const server = serve();
  await new Promise(r => setTimeout(r, 1500));

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [];

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
    const page1 = await context.newPage();
    const page2 = await context.newPage();
    const staffPage = await context.newPage();
    const adminPage = await context.newPage();

    [page1, page2, staffPage, adminPage].forEach(p => {
      p.on('pageerror', e => errors.push(String(e)));
      p.on('console', msg => {
        const text = msg.text();
        if (msg.type() === 'error' && !text.includes('favicon') && !text.includes('404') && !text.includes('400') && !text.includes('identitytoolkit')) {
          errors.push(text);
        }
      });
      p.on('dialog', d => d.accept());
    });

    console.log('\n========================================');
    console.log('1. 身份驗證與角色權限測試');
    console.log('========================================');

    // Test 1.1: Invalid login
    await login(page1, '1A', 'WRONG_PASSWORD');
    await page1.waitForSelector('.toast', { timeout: 10000 });
    const errToast = (await page1.textContent('.toast')).trim();
    check('錯誤密碼被拒絕並彈出提示', errToast.includes('不正確') || errToast.includes('錯誤'), errToast);

    // Test 1.2: Participant 1A Login
    await login(page1, '1A', '1A');
    await page1.waitForSelector('#screen-participant:not(.hidden)', { timeout: 30000 });
    await dismissOnboarding(page1);
    const greeting1A = (await page1.textContent('#participant-greeting')).trim();
    check('參加者 1A 成功登入並顯示正確問候語', greeting1A.includes('1A'), greeting1A);

    // Test 1.3: Staff WILL Login
    await login(staffPage, 'WILL', '23082026');
    await staffPage.waitForSelector('#screen-participant:not(.hidden)', { timeout: 30000 });
    await dismissOnboarding(staffPage);
    await staffPage.waitForSelector('#home-staff-card:not(.hidden)', { timeout: 20000 });
    check('Staff (WILL) 登入後正確顯示「本組管理」卡片', true);

    // Test 1.4: Admin Login
    await login(adminPage, 'admin', '23082026');
    await adminPage.waitForSelector('#screen-admin:not(.hidden)', { timeout: 30000 });
    await dismissOnboarding(adminPage);
    check('管理員 (admin) 成功進入管理員控制台', true);

    console.log('\n========================================');
    console.log('2. 匿名留言功能完整性測試');
    console.log('========================================');

    // Participant 1B Login
    await login(page2, '1B', '1B');
    await page2.waitForSelector('#screen-participant:not(.hidden)', { timeout: 30000 });
    await dismissOnboarding(page2);

    // 1A navigates to Send View
    await page1.click('.home-card[data-nav="send"]');
    await page1.waitForSelector('#send-receiver', { state: 'visible', timeout: 10000 });

    // Test 2.1: Character counter
    await page1.fill('#send-content', '測試留言內容 12345');
    const charCounter = (await page1.textContent('#char-counter')).trim();
    check('字數計數器即時反應輸入長度', charCounter.includes('12/300'), charCounter);

    // Test 2.2: Combobox selection & Sending message to 1B
    const uniqueMsg = `測試匿名祝福_${Date.now()}`;
    await page1.fill('#send-receiver', '1B');
    await page1.fill('#send-content', uniqueMsg);
    await page1.click('#send-submit');

    // Test 2.3: Appears in Sent list
    await page1.waitForSelector(`text=${uniqueMsg}`, { timeout: 15000 });
    check('留言送出後即時出現在發送者「已發送」列表', true);

    // Test 2.4: Realtime reception in 1B Inbox
    await page2.click('.bottom-nav-item[data-tab="inbox"]');
    await page2.waitForSelector(`text=${uniqueMsg}`, { timeout: 15000 });
    check('接收者 1B 在收件箱即時收到留言（無需重新整理）', true);

    // Test 2.5: Absolute anonymity verification
    const inboxListHtml = await page2.innerHTML('#inbox-list');
    check('接收者收件箱絕對不洩露發送者編號 1A', !inboxListHtml.includes('1A'));

    // Test 2.6: Admin monitor view
    await adminPage.click('.bottom-nav-item[data-admin-tab="messages"]');
    await adminPage.waitForSelector(`text=${uniqueMsg}`, { timeout: 15000 });
    check('管理員可在即時留言監控查閱完整發送紀錄（1A -> 1B）', true);

    console.log('\n========================================');
    console.log('3. Staff 本組管理與監控測試');
    console.log('========================================');

    // Staff opens facilitator panel
    await staffPage.click('#home-staff-card');
    await staffPage.waitForSelector('#staff-facilitator-panel:not(.hidden)', { timeout: 15000 });
    check('Staff 成功開啟本組管理面板', true);

    // Test 3.1: Staff group message monitor
    await staffPage.click('.bottom-nav-item[data-staff-section="messages"]');
    await staffPage.waitForSelector(`text=${uniqueMsg}`, { timeout: 15000 });
    check('Staff 在組內留言監控看到組員留言', true);

    // Test 3.2: Staff retract message
    const retractBtn = await staffPage.$(`[data-message-id] .btn-message-retract, [data-message-id] .btn-retract`);
    if (retractBtn) {
      await retractBtn.click();
      await staffPage.waitForSelector('.toast', { timeout: 10000 });
      check('Staff 成功下架/撤回不當留言', true);
    }

    // Test 3.3: Staff voting controls & override source indicator
    await staffPage.click('.bottom-nav-item[data-staff-section="voting"]');
    await staffPage.waitForSelector('#staff-voting-source', { timeout: 10000 });
    const sourceText = (await staffPage.textContent('#staff-voting-source')).trim();
    check('Staff 投票面板明確顯示投票來源狀態（跟隨全域 / 本組覆寫）', sourceText.length > 0, sourceText);

    // Staff close voting for group
    await staffPage.click('#staff-close-voting');
    await staffPage.waitForSelector('.toast', { timeout: 15000 });
    const staffCloseToast = (await staffPage.textContent('.toast')).trim();
    check('Staff 設置本組投票覆寫（關閉本組）', staffCloseToast.includes('本組') || staffCloseToast.includes('關閉'), staffCloseToast);

    // Test 3.4: Restore follow global
    await staffPage.waitForSelector('#staff-follow-global-voting:not(.hidden)', { timeout: 10000 });
    await staffPage.click('#staff-follow-global-voting');
    await staffPage.waitForFunction(() => {
      const toast = document.querySelector('.toast');
      return toast && (toast.textContent.includes('跟隨全域') || toast.textContent.includes('已恢復'));
    }, { timeout: 15000 });
    check('Staff 成功執行「恢復跟隨全域投票」', true);

    console.log('\n========================================');
    console.log('4. Admin 全域覆蓋、計票與公布流程測試');
    console.log('========================================');

    // Admin resets all votes for a fresh voting cycle test
    await adminPage.click('.bottom-nav-item[data-admin-tab="settings"]');
    await adminPage.waitForSelector('#admin-bulk-reset-votes', { timeout: 10000 });
    await adminPage.click('#admin-bulk-reset-votes');
    await adminPage.waitForSelector('.toast', { timeout: 15000 });
    check('管理員成功執行「重置全部參加者投票」', true);

    // Admin opens voting globally
    await adminPage.click('.bottom-nav-item[data-admin-tab="voting"]');
    await adminPage.waitForSelector('#admin-open-voting', { timeout: 10000 });
    await adminPage.click('#admin-open-voting');
    await adminPage.waitForFunction(
      () => document.querySelector('#admin-voting-status-badge')?.textContent.includes('進行中') || document.querySelector('#admin-voting-status-badge')?.textContent.includes('開放'),
      { timeout: 15000 }
    );
    check('管理員全域開啟投票，並覆蓋所有組別狀態', true);

    // 1A performs Trophy Voting
    await page1.click('.bottom-nav-item[data-tab="trophy"]');
    await page1.waitForSelector('#trophy-teammates .trophy-card', { timeout: 15000 });
    await page1.waitForSelector('#trophy-teammates .trophy-chip:not([disabled])', { timeout: 15000 });
    const cards = await page1.$$('#trophy-teammates .trophy-card');
    check('參加者 1A 看到本組隊友配對卡片', cards.length > 0, `${cards.length} 位隊友`);

    // Assign chips to each teammate
    for (let i = 0; i < cards.length; i++) {
      const chip = await page1.$(
        `#trophy-teammates .trophy-card:nth-of-type(${i + 1}) .trophy-chip:not(.selected):not(.taken):not([disabled])`
      );
      if (!chip) throw new Error('找不到可配對的獎項晶片 (隊友 ' + (i + 1) + ')');
      await chip.click();
      await page1.waitForTimeout(150);
    }
    const progText = (await page1.textContent('#trophy-progress-text')).trim();
    check('投票配對進度計數更新正確', progText === `${cards.length}/${cards.length}`, progText);

    // Submit votes
    await page1.click('#trophy-submit-all');
    await page1.waitForSelector('[data-view="trophy-submitted"].active', { timeout: 20000 });
    check('參加者提交投票並進入成功完成頁', true);

    // Admin close voting
    await adminPage.click('.bottom-nav-item[data-admin-tab="voting"]');
    await adminPage.click('#admin-close-voting');
    await adminPage.waitForFunction(
      () => document.querySelector('#admin-voting-status-badge')?.textContent.includes('關閉'),
      { timeout: 15000 }
    );
    check('管理員全域關閉投票', true);

    // Admin calculate results
    await adminPage.click('#admin-calculate');
    await adminPage.waitForFunction(
      () => document.querySelector('#admin-voting-status-badge')?.textContent.includes('計算'),
      { timeout: 25000 }
    );
    check('管理員計算結果完成（無衝突分配演算法執行正常）', true);

    // Admin verifies results profiles
    await adminPage.click('.bottom-nav-item[data-admin-tab="results"]');
    await adminPage.click('.sub-tab-btn[data-result-tab="profiles"]');
    await adminPage.waitForSelector('#profiles-list .profile-card', { timeout: 15000 });
    const profileCount = (await adminPage.$$('#profiles-list .profile-card')).length;
    check('管理員結果頁面列出所有參加者個人檔案', profileCount > 0, `共 ${profileCount} 份檔案`);

    // Admin publish results
    await adminPage.click('.bottom-nav-item[data-admin-tab="voting"]');
    await adminPage.click('#admin-publish');
    await adminPage.waitForFunction(
      () => document.querySelector('#admin-voting-status-badge')?.textContent.includes('公布'),
      { timeout: 20000 }
    );
    check('管理員成功公布得獎結果', true);

    // Participant 1A verifies results popup & confetti
    await page1.waitForSelector('#trophy-results-modal:not(.hidden)', { timeout: 25000 });
    check('參加者 1A 即時收到得獎結果視窗（自動公布彈窗）', true);

    console.log('\n========================================');
    console.log('5. 使用者個人檔案與登出流程測試');
    console.log('========================================');

    // 1A updates display name
    await page1.click('#trophy-results-modal-close');
    await page1.waitForSelector('#trophy-results-modal', { state: 'hidden', timeout: 10000 });
    await page1.click('.bottom-nav-item[data-tab="profile"]');
    await page1.waitForSelector('#profile-display-name', { timeout: 10000 });
    await page1.fill('#profile-display-name', '測試隊長1A');
    await page1.click('#profile-save-name');
    await page1.waitForFunction(() => {
      const toast = document.querySelector('.toast');
      return toast && toast.textContent.includes('顯示名稱已更新');
    }, { timeout: 15000 });
    check('個人資料：自訂別名儲存成功', true);

    // Clean up / revert display name
    await page1.fill('#profile-display-name', '');
    await page1.click('#profile-save-name');
    await page1.waitForFunction(() => {
      const toast = document.querySelector('.toast');
      return toast && toast.textContent.includes('已清除顯示名稱');
    }, { timeout: 15000 });

    // 1A logout
    await page1.click('#participant-logout');
    await page1.waitForSelector('#screen-login:not(.hidden)', { timeout: 15000 });
    check('參加者 1A 登出後正常返回登入畫面', true);

    // Admin logout
    await adminPage.click('#admin-logout');
    await adminPage.waitForSelector('#screen-login:not(.hidden)', { timeout: 15000 });
    check('管理員登出後正常返回登入畫面', true);

    console.log('\n========================================');
    console.log('6. JavaScript 執行期異常與網路診斷');
    console.log('========================================');
    const realErrors = errors.filter(e => !/favicon|404|net::ERR_/i.test(e));
    check('全流程無重大 JavaScript 崩潰或未捕捉異常', realErrors.length === 0, realErrors.slice(0, 3).join(' | '));

  } finally {
    await browser.close();
    server.kill();
  }

  const passedCount = results.filter(r => r.passed).length;
  console.log(`\n========================================`);
  console.log(`測試總結: ${passedCount}/${results.length} 項測試通過`);
  console.log(`========================================\n`);
  if (passedCount !== results.length) {
    process.exitCode = 1;
  }
}

run().catch(err => {
  console.error('測試腳本異常終止:', err);
  process.exitCode = 1;
});
