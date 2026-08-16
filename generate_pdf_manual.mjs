import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const htmlContent = `<!DOCTYPE html>
<html lang="zh-HK">
<head>
  <meta charset="UTF-8">
  <title>TNIT Just For You - 系統操作教學手冊</title>
  <style>
    @page {
      size: A4;
      margin: 20mm 16mm 20mm 16mm;
      @bottom-right {
        content: counter(page);
        font-size: 9pt;
        color: #718096;
      }
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "PingFang HK", "PingFang SC", "Microsoft JhengHei", "Noto Sans TC", sans-serif;
      color: #2D3748;
      background: #FFFFFF;
      line-height: 1.65;
      font-size: 10.5pt;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* ─── 封面設計 ─────────────────────────────────────────── */
    .cover {
      page-break-after: always;
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-height: 250mm;
      padding: 20px 10px;
      text-align: center;
    }

    .cover-badge {
      display: inline-block;
      align-self: center;
      padding: 6px 16px;
      background: #EBF8FF;
      color: #2B6CB0;
      font-size: 11pt;
      font-weight: 600;
      border-radius: 20px;
      margin-bottom: 24px;
      letter-spacing: 1px;
      border: 1px solid #BEE3F8;
    }

    .cover-title {
      font-size: 28pt;
      font-weight: 800;
      color: #1A202C;
      margin-bottom: 12px;
      line-height: 1.3;
      letter-spacing: -0.5px;
    }

    .cover-subtitle {
      font-size: 15pt;
      color: #4A5568;
      margin-bottom: 36px;
      font-weight: 400;
    }

    .cover-divider {
      width: 80px;
      height: 4px;
      background: linear-gradient(90deg, #3182CE, #63B3ED);
      margin: 0 auto 36px;
      border-radius: 2px;
    }

    .cover-meta {
      background: #F7FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 24px 30px;
      max-width: 480px;
      margin: 0 auto 40px;
      text-align: left;
    }

    .cover-meta-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      font-size: 10pt;
    }

    .cover-meta-row:last-child {
      margin-bottom: 0;
    }

    .cover-meta-label {
      color: #718096;
      font-weight: 500;
    }

    .cover-meta-val {
      color: #2D3748;
      font-weight: 600;
    }

    .cover-roles {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-top: 10px;
    }

    .role-tag {
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 9.5pt;
      font-weight: 600;
    }

    .role-p { background: #E6FFFA; color: #234E52; border: 1px solid #B2F5EA; }
    .role-s { background: #FEFCBF; color: #744210; border: 1px solid #FAF089; }
    .role-a { background: #FED7D7; color: #742A2A; border: 1px solid #FEB2B2; }

    /* ─── 內容樣式 ─────────────────────────────────────────── */
    .page-header {
      border-bottom: 1px solid #E2E8F0;
      padding-bottom: 6px;
      margin-bottom: 20px;
      font-size: 8.5pt;
      color: #A0AEC0;
      display: flex;
      justify-content: space-between;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    h1 {
      font-size: 18pt;
      font-weight: 700;
      color: #1A365D;
      border-left: 5px solid #3182CE;
      padding-left: 12px;
      margin: 28px 0 16px 0;
      page-break-after: avoid;
    }

    h2 {
      font-size: 13.5pt;
      font-weight: 600;
      color: #2C5282;
      margin: 20px 0 10px 0;
      page-break-after: avoid;
    }

    h3 {
      font-size: 11pt;
      font-weight: 600;
      color: #2D3748;
      margin: 14px 0 6px 0;
      page-break-after: avoid;
    }

    p {
      margin-bottom: 10px;
      text-align: justify;
    }

    .page-break {
      page-break-before: always;
    }

    /* ─── 步驟與重點卡片 ──────────────────────────────────── */
    .step-list {
      margin: 12px 0 16px 0;
      padding-left: 0;
      list-style: none;
    }

    .step-item {
      position: relative;
      padding-left: 32px;
      margin-bottom: 12px;
      page-break-inside: avoid;
    }

    .step-num {
      position: absolute;
      left: 0;
      top: 1px;
      width: 22px;
      height: 22px;
      background: #3182CE;
      color: #FFFFFF;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9pt;
      font-weight: 700;
    }

    .card-box {
      background: #F7FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      padding: 14px 18px;
      margin: 14px 0;
      page-break-inside: avoid;
    }

    .callout {
      border-left: 4px solid #3182CE;
      background: #EBF8FF;
      padding: 12px 16px;
      border-radius: 0 8px 8px 0;
      margin: 14px 0;
      page-break-inside: avoid;
    }

    .callout-title {
      font-weight: 700;
      color: #2B6CB0;
      font-size: 10pt;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .callout-warning {
      border-left-color: #DD6B20;
      background: #FFFAF0;
    }
    .callout-warning .callout-title {
      color: #C05621;
    }

    .callout-success {
      border-left-color: #38A169;
      background: #F0FFF4;
    }
    .callout-success .callout-title {
      color: #276749;
    }

    .callout-danger {
      border-left-color: #E53E3E;
      background: #FFF5F5;
    }
    .callout-danger .callout-title {
      color: #9B2C2C;
    }

    /* ─── 表格 ─────────────────────────────────────────────── */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0;
      font-size: 9.5pt;
      page-break-inside: avoid;
    }

    th, td {
      border: 1px solid #E2E8F0;
      padding: 8px 12px;
      text-align: left;
    }

    th {
      background: #EDF2F7;
      font-weight: 600;
      color: #2D3748;
    }

    tr:nth-child(even) td {
      background: #F7FAFC;
    }

    /* ─── 徽章 ─────────────────────────────────────────────── */
    .chip {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 8.5pt;
      font-weight: 600;
    }

    .chip-blue { background: #EBF8FF; color: #2B6CB0; }
    .chip-green { background: #C6F6D5; color: #22543D; }
    .chip-yellow { background: #FEFCBF; color: #744210; }
    .chip-red { background: #FED7D7; color: #742A2A; }
    .chip-gray { background: #EDF2F7; color: #4A5568; }

    /* ─── UI 模組展示 ───────────────────────────────────────── */
    .ui-preview {
      background: #FFFFFF;
      border: 1px solid #CBD5E0;
      border-radius: 8px;
      padding: 12px;
      margin: 12px 0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      page-break-inside: avoid;
    }

    .ui-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #2D3748;
      color: white;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 9pt;
      font-weight: 600;
      margin-bottom: 10px;
    }
  </style>
</head>
<body>

  <!-- ════════ 封面 ════════ -->
  <div class="cover">
    <div class="cover-badge">香港青少年服務處・TNIT</div>
    <div class="cover-title">Just For You 互動系統<br>完整操作教學手冊</div>
    <div class="cover-subtitle">匿名留言・獎項互選・組別監控・全域計票與管理</div>
    <div class="cover-divider"></div>

    <div class="cover-meta">
      <div class="cover-meta-row">
        <span class="cover-meta-label">系統版本</span>
        <span class="cover-meta-val">Version 2.0 (Live Production)</span>
      </div>
      <div class="cover-meta-row">
        <span class="cover-meta-label">適用對象</span>
        <span class="cover-meta-val">營會參加者、Staff 工作人員、管理員</span>
      </div>
      <div class="cover-meta-row">
        <span class="cover-meta-label">架構環境</span>
        <span class="cover-meta-val">Firebase Auth + Firestore 即時雲端同步</span>
      </div>
      <div class="cover-meta-row">
        <span class="cover-meta-label">更新日期</span>
        <span class="cover-meta-val">2026 年 8 月</span>
      </div>
    </div>

    <div class="cover-roles">
      <span class="role-tag role-p">👤 參加者使用手冊</span>
      <span class="role-tag role-s">🛡️ Staff 本組管理手冊</span>
      <span class="role-tag role-a">⚙️ Admin 全域管理手冊</span>
    </div>
  </div>

  <!-- ════════ 目錄與簡介 ════════ -->
  <div>
    <div class="page-header">
      <span>TNIT Just For You 操作手冊</span>
      <span>系統目錄與架構簡介</span>
    </div>

    <h1>系統簡介與目錄導覽</h1>
    <p><strong>TNIT Just For You</strong> 是一套專為營會活動量身打造的即時互動網頁系統。系統具備嚴格的資料安全防護、高流暢度動畫、即時 WebSocket 雲端推送以及強大的無衝突分配演算法，為活動營造溫馨且具儀式感的互動體驗。</p>

    <div class="card-box">
      <h3>手冊章節導覽</h3>
      <table style="margin: 6px 0;">
        <tr>
          <th width="30%">章節</th>
          <th width="70%">主要內容與核心功能</th>
        </tr>
        <tr>
          <td><strong>第一章：參加者操作手冊</strong></td>
          <td>登入方式、匿名留言發送與撤回、獎項互選投票、得獎公布彈窗、自訂別名與修改密碼</td>
        </tr>
        <tr>
          <td><strong>第二章：Staff 本組管理手冊</strong></td>
          <td>本組 Dashboard 數據、組內留言即時監控、本組投票獨立覆寫/計算/發布、一鍵恢復全域</td>
        </tr>
        <tr>
          <td><strong>第三章：管理員全域控制台</strong></td>
          <td>全營即時數據監控、全域留言審查、五階段投票生命週期、無衝突計票演算法、組別覆寫控制、密碼與分組管理</td>
        </tr>
        <tr>
          <td><strong>第四章：防衝突機制與常見 FAQ</strong></td>
          <td>全域優先原則（Zero-Clash）、留言與投票權限規則、忘記密碼處理、故障排除指南</td>
        </tr>
      </table>
    </div>

    <div class="callout callout-success">
      <div class="callout-title">💡 跨平台支援說明</div>
      系統為響應式設計（PWA / Web App），完美支援 iOS Safari、Android Chrome、平板電腦以及桌面瀏覽器。無需額外下載 App，打開活動專屬網址即可直接使用。
    </div>
  </div>

  <!-- ════════ 第一章：參加者操作手冊 ════════ -->
  <div class="page-break">
    <div class="page-header">
      <span>第一章：參加者操作手冊</span>
      <span>登入與匿名留言</span>
    </div>

    <h1>第一章：參加者操作手冊</h1>

    <h2>1.1 登入系統</h2>
    <ul class="step-list">
      <li class="step-item">
        <div class="step-num">1</div>
        <strong>輸入參加者編號</strong>：在「參加者編號」欄位輸入你的專屬編號（例如 <code>1A</code>、<code>2B</code>、<code>3C</code> 等）。支援手動輸入或直接點擊下拉選單快速選取。
      </li>
      <li class="step-item">
        <div class="step-num">2</div>
        <strong>輸入登入密碼</strong>：在「密碼」欄位輸入由大會發給你的專屬密碼（系統支援大階及細階英文字母，大小寫均可正常登入）。
      </li>
      <li class="step-item">
        <div class="step-num">3</div>
        <strong>點擊「登入」</strong>：系統驗證成功後將自動載入你的個人首頁。如遇密碼錯誤，系統會即時跳出紅色警告提示。
      </li>
    </ul>

    <h2>1.2 匿名留言（寄出溫暖心意）</h2>
    <p>參加者可以在營會期間向同組或全營其他隊友發送匿名留言，表達感謝、鼓勵或分享感受。</p>

    <div class="ui-preview">
      <div class="ui-bar">
        <span>✉️ 發送留言介面</span>
        <span class="chip chip-blue">最多 300 字</span>
      </div>
      <p style="margin-bottom: 6px;">• <strong>接收者</strong>：點擊搜尋框輸入對象編號或從下拉清單中揀選隊友。</p>
      <p style="margin-bottom: 6px;">• <strong>留言內容</strong>：在輸入框中撰寫內容，右下角會即時顯示字數統計（例如 <code>25/300</code>）。</p>
      <p style="margin-bottom: 0;">• <strong>嚴格匿名</strong>：<strong>接收者在收件箱中絕對無法看見寄件者編號</strong>，請放心真誠表達！</p>
    </div>

    <div class="callout callout-warning">
      <div class="callout-title">⚠️ 不適當用語過濾機制</div>
      系統內置智能敏感詞彙過濾器。若留言內容含有粗言穢語或不恰當字詞，系統將會彈出「內容包含不適當用語」並阻止發送，請修改合適字句後再重新送出。
    </div>

    <h2>1.3 留言管理（收件箱與已發送撤回）</h2>
    <table style="margin: 10px 0;">
      <tr>
        <th width="20%">功能分頁</th>
        <th width="80%">操作說明與特色</th>
      </tr>
      <tr>
        <td><strong>📥 收件箱 (Inbox)</strong></td>
        <td>即時接收他人寄給你的匿名留言。每條留言卡片具備卡片動畫與未讀指示，點擊可標記為已讀。</td>
      </tr>
      <tr>
        <td><strong>📤 已發送 (Sent)</strong></td>
        <td>查閱你發送給其他人的留言記錄與寄出時間。<br><strong>【撤回功能】</strong>：如果你想收回留言，可點擊該留言右下方的「<strong>撤回</strong>」按鈕，撤回後接收者收件箱將同步移除。</td>
      </tr>
    </table>
  </div>

  <!-- ════════ 第一章：參加者操作手冊 (續) ════════ -->
  <div class="page-break">
    <div class="page-header">
      <span>第一章：參加者操作手冊</span>
      <span>獎項互選與個人資料</span>
    </div>

    <h2>1.4 獎項互選 / 投票流程</h2>
    <p>在投票開放時段，點擊底部導航欄的「<strong>Trophy (獎項)</strong>」即可進入本組專屬的獎項互選投票介面。</p>

    <ul class="step-list">
      <li class="step-item">
        <div class="step-num">1</div>
        <strong>檢視隊友卡片</strong>：系統會自動列出同組的所有隊友（例如組員 1B, 1C, 1D, 1E, 1F 等）。
      </li>
      <li class="step-item">
        <div class="step-num">2</div>
        <strong>配對專屬獎項</strong>：為每位隊友選取一個最適合他的獎項標籤（晶片）。頂部進度條會即時更新已配對進度（例如 <code>5/5 人已配對</code>）。
      </li>
      <li class="step-item">
        <div class="step-num">3</div>
        <strong>提交投票</strong>：所有隊友配對完成後，點擊「<strong>提交投票</strong>」確認送出。送出後畫面將顯示「投票已提交，等待管理員處理結果」。
      </li>
      <li class="step-item">
        <div class="step-num">4</div>
        <strong>即時彈窗接收得獎結果</strong>：當大會或組別 Staff 正式公布結果時，無論你身處哪個頁面，系統均會<strong>即時自動彈出專屬得獎榮譽視窗</strong>，無需手動重新整理頁面！
      </li>
    </ul>

    <div class="callout callout-success">
      <div class="callout-title">🏆 獨特演算法保證</div>
      大會採用智慧無衝突分配技術與「<strong>保底機制</strong>」，確保每位參加者都能獲得專屬的肯定與殊榮，絕不讓任何一人空手而回。
    </div>

    <h2>1.5 個人檔案與帳號管理（Profile）</h2>
    <p>點擊底部導航欄最右側的「<strong>我的</strong>」，可進行個人資訊自訂與安全管理：</p>

    <div class="card-box">
      <h3>個人功能面板</h3>
      <ul style="padding-left: 20px; margin-top: 6px;">
        <li style="margin-bottom: 8px;">
          <strong>自訂顯示名稱</strong>：輸入你希望在系統內顯示的暱稱（例如「小明」），點擊「儲存名稱」。更新後全系統的留言、獎項及隊友名單均會同步顯示該名稱（登入依然使用原編號）。
        </li>
        <li style="margin-bottom: 8px;">
          <strong>自主修改密碼</strong>：在「修改密碼」卡片輸入新密碼（至少 6 位字元），點擊「更新密碼」。修改後下次登入請使用新密碼。
        </li>
        <li style="margin-bottom: 8px;">
          <strong>互動統計數據</strong>：即時查看個人發送留言數、收件數、投票狀態等統計卡片。
        </li>
        <li>
          <strong>安全登出</strong>：點擊「登出」按鈕結束本次會話並返回登入介面。
        </li>
      </ul>
    </div>
  </div>

  <!-- ════════ 第二章：Staff 本組管理手冊 ════════ -->
  <div class="page-break">
    <div class="page-header">
      <span>第二章：Staff 本組管理手冊</span>
      <span>小組導師與工作人員專用</span>
    </div>

    <h1>第二章：Staff 本組管理手冊</h1>
    <p>具備 Staff 身份之工作人員（例如組別導師 / Facilitator），登入後在首頁頂部會看見專屬金黃色「<strong>本組管理</strong>」入口卡片。點擊即可進入該組的專屬管理控制台。</p>

    <h2>2.1 本組管理四大模組導覽</h2>
    <table>
      <tr>
        <th width="22%">模組標籤</th>
        <th width="78%">功能說明與日常操作</th>
      </tr>
      <tr>
        <td><strong>📊 Dashboard</strong></td>
        <td>查看本組組員名單、即時在線/登入狀態、組內發送留言總量、投票提交人數比例（例如 <code>5/6 人已投票</code>）。</td>
      </tr>
      <tr>
        <td><strong>💬 Messages</strong></td>
        <td><strong>組內即時留言監控</strong>：實時掌握本組組員寄出及收到之所有留言內容（含時間、寄件者、收件者），以確保組員交流正面友善。</td>
      </tr>
      <tr>
        <td><strong>🗳️ Voting</strong></td>
        <td><strong>本組投票獨立控制</strong>：可根據小組進度單獨開啟或關閉本組投票、單獨計算本組結果，或設定本組覆寫。</td>
      </tr>
      <tr>
        <td><strong>🏆 Results</strong></td>
        <td><strong>本組得獎成果檢視</strong>：查看本組各組員計算後的獲獎項目與提名明細。</td>
      </tr>
    </table>

    <h2>2.2 本組投票控制與「組別覆寫」機制</h2>
    <p>Staff 可以靈活掌控組內節奏，系統設計了清晰的狀態來源指示與防衝突機制：</p>

    <div class="card-box">
      <h3>投票狀態來源說明</h3>
      <p>• <span class="chip chip-blue">跟隨全域</span>：表示目前本組跟隨 Admin 的大會全域狀態。文字提示如「目前跟隨全域（投票進行中）」。</p>
      <p>• <span class="chip chip-yellow">本組覆寫</span>：當 Staff 點擊「開放本組投票」、「關閉本組投票」或「計算本組結果」後，本組狀態即轉為獨立覆寫，不受其他組別影響。</p>
      <p>• <span class="chip chip-gray">恢復跟隨全域</span>：若小組進度已同步，Staff 隨時可點擊「<strong>恢復跟隨全域</strong>」按鈕，立即清除組別覆寫並重新對齊大會設定。</p>
    </div>

    <div class="callout callout-warning">
      <div class="callout-title">⚡ Admin 全域操作之連鎖效應（重要）</div>
      當大會 Admin 執行全域投票切換（如統一開放投票、全域關閉、全域重置）時，系統會<strong>自動批次重置所有組別的覆寫</strong>，使全營整齊劃一。若小組隨後仍需特殊處理，Staff 可再次點擊組內按鈕重新建立本組覆寫。
    </div>
  </div>

  <!-- ════════ 第三章：管理員全域控制台 ════════ -->
  <div class="page-break">
    <div class="page-header">
      <span>第三章：管理員全域控制台</span>
      <span>Admin Console 核心功能</span>
    </div>

    <h1>第三章：管理員全域控制台</h1>
    <p>使用管理員帳號（<code>ADMIN</code>）登入後，將直接進入強大的後台管理系統。底部導航包含五大核心管理分頁：</p>

    <h2>3.1 管理員五大分頁功能</h2>

    <div class="card-box">
      <h3>1. Dashboard（全營儀表板）</h3>
      <p>提供全營即時數據鳥瞰：全營總留言數、有效留言與撤回數、各組投票提交率進度條、在線人數與即時連線負載監控。</p>
    </div>

    <div class="card-box">
      <h3>2. Messages（全域留言監控）</h3>
      <p>即時串流監控全營所有留言傳遞。支援按組別快速篩選（如 Group 1~6、Staff），並可針對特定不當留言執行管理員強制撤回。</p>
    </div>

    <div class="card-box">
      <h3>3. Voting（全域投票生命週期管理）</h3>
      <p>掌控整個營會的獎項評選進程。標準操作五部曲如下：</p>
      <table style="margin: 8px 0;">
        <tr>
          <th width="28%">狀態階段</th>
          <th width="72%">管理員操作與系統行為</th>
        </tr>
        <tr>
          <td><span class="chip chip-gray">1. DRAFT (準備中)</span></td>
          <td>初始階段，參加者端暫未開放投票。</td>
        </tr>
        <tr>
          <td><span class="chip chip-green">2. VOTING_OPEN (開放投票)</span></td>
          <td>全營參加者可進入配對獎項並提交。<strong>（會自動重置所有組別覆寫）</strong></td>
        </tr>
        <tr>
          <td><span class="chip chip-red">3. VOTING_CLOSED (截止投票)</span></td>
          <td>關閉提交入口，鎖定所有選票以備計票。</td>
        </tr>
        <tr>
          <td><span class="chip chip-yellow">4. CALCULATED (計算結果)</span></td>
          <td>點擊「<strong>計算結果</strong>」，演算法在數毫秒內完成全營無衝突得獎匹配與保底分配。</td>
        </tr>
        <tr>
          <td><span class="chip chip-blue">5. PUBLISHED (公布結果)</span></td>
          <td>點擊「<strong>公布結果</strong>」，全營在線參加者裝置<strong>即時彈出得獎名單</strong>！</td>
        </tr>
      </table>
    </div>

    <div class="card-box">
      <h3>4. Results（全營得獎名單檢視）</h3>
      <p>完整列出全營每位參加者的得獎結果卡片、被提名原因及互選細節，支援即時文字搜尋與獎項分類篩選。</p>
    </div>

    <div class="card-box">
      <h3>5. Settings（系統設定、組別控制與人員維護）</h3>
      <p>• <strong>組別狀態細部控制</strong>：個別開啟/關閉某組留言或投票，並可一鍵「恢復跟隨全域」。<br>
      • <strong>參加者管理（修改密碼與分組）</strong>：選擇任一參加者，可直接<strong>修改其登入密碼</strong>、變更分組、撤回其全部留言或重置其個人投票。<br>
      • <strong>危險操作區</strong>：提供「重置全部參加者投票」與「刪除全部紀錄」（彩排清空專用）。</p>
    </div>
  </div>

  <!-- ════════ 第四章：常見問題與小貼士 ════════ -->
  <div class="page-break">
    <div class="page-header">
      <span>第四章：FAQ 與技術支援</span>
      <span>常見問題解答</span>
    </div>

    <h1>第四章：常見問題解答 (FAQ)</h1>

    <div class="card-box">
      <h3>Q1：參加者忘記密碼或無法登入怎麼辦？</h3>
      <p><strong>解答</strong>：管理員只需進入後台 <strong>Settings (設定)</strong> 分頁，在「參加者管理」下拉清單中選取該位參加者，在「密碼」欄位直接輸入新密碼並點擊「儲存修改」，該參加者即可立即使用新密碼登入。</p>
    </div>

    <div class="card-box">
      <h3>Q2：留言寄出後可以修改或收回嗎？</h3>
      <p><strong>解答</strong>：參加者可前往「<strong>已發送</strong>」分頁，找到該條留言並點擊「<strong>撤回</strong>」。撤回後，對方的收件箱會即時消失，保障操作彈性。</p>
    </div>

    <div class="card-box">
      <h3>Q3：投票提交後可以重新修改嗎？</h3>
      <p><strong>解答</strong>：在投票開放期間（VOTING_OPEN），若允許重新提交，參加者可重新進入 Trophy 頁面調整配對並再次提交；一旦大會進入 VOTING_CLOSED 或計算階段，選票即告鎖定。</p>
    </div>

    <div class="card-box">
      <h3>Q4：Admin 全域設定與 Staff 本組設定發生衝突時如何處理？</h3>
      <p><strong>解答</strong>：系統具備完善的 <strong>Zero-Clash 狀態架構</strong>：
      <br>1. <strong>全域優先</strong>：Admin 每次變更全域投票狀態時，會自動清除所有組別的覆寫欄位，確保全營同步。
      <br>2. <strong>獨立微調</strong>：Staff 在全域變更後如有特別需要，仍可手動將本組設為覆寫。
      <br>3. <strong>隨時還原</strong>：Staff 或 Admin 隨時可點擊「恢復跟隨全域」，完全不會發生系統崩潰或數據衝突。</p>
    </div>

    <div class="card-box">
      <h3>Q5：如何確保每位組員都有獎項？</h3>
      <p><strong>解答</strong>：計票核心內建<strong>保底互補演算法（No-one-left-behind Fallback）</strong>。系統會優先依據組員互選得票最高者分配專屬獎項，對於少數未獲提名的組員，演算法會智慧挑選該組最契合的剩餘特色獎項進行頒發，確保每位組員皆獲得正面肯定與掌聲。</p>
    </div>

    <div style="text-align: center; margin-top: 40px; color: #A0AEC0; font-size: 9pt;">
      <p>— 本手冊由 TNIT 系統開發團隊編制・版權所有 © 2026 —</p>
    </div>
  </div>

</body>
</html>
`;

async function buildPdf() {
  console.log('啟動 Chromium 引擎...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('載入教學手冊內容與版面配置...');
  await page.setContent(htmlContent, { waitUntil: 'networkidle' });

  const outputPath = path.resolve(process.cwd(), 'TNIT_Just_For_You_操作教學手冊.pdf');
  console.log('正在導出高品質 PDF 至:', outputPath);

  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '0mm',
      bottom: '0mm',
      left: '0mm',
      right: '0mm'
    }
  });

  await browser.close();
  console.log('✅ PDF 製作成功！檔案大小:', fs.statSync(outputPath).size, '位元組');
}

buildPdf().catch(err => {
  console.error('PDF 導出失敗:', err);
  process.exit(1);
});
