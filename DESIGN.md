# HKCYS TINT — Just For You ❤️
## Mobile UI/UX Design System & Specification

---

## 1. Information Architecture

```
App
├── Splash（啟動畫面）
├── Login（登入）
├── Participant（參加者）
│   ├── Home（首頁 · 四大功能卡片）
│   ├── Send（匿名留言）
│   ├── Inbox（收件箱）
│   ├── Sent（已發送）
│   ├── Trophy（投票配對）
│   ├── Trophy Submitted（提交成功）
│   └── Profile（我的）
└── Admin（管理員）
    ├── Dashboard（總覽）
    ├── Messages（留言監控）
    ├── Voting（投票控制）
    ├── Results（結果 · 審計/檔案/摘要）
    └── Settings（設定 · 留言開關/參加者管理）
```

---

## 2. User Flow

### 參加者
1. Splash → Login → 輸入編號 + 電話
2. Home 卡片進入各功能
3. Bottom Nav：首頁 / Inbox / Trophy / 我的
4. 發送留言 → 自動跳轉已發送
5. Trophy 提交 → 成功頁 → 返回首頁
6. 管理員公布結果 → Glass 彈窗 + Confetti

### 管理員
1. Login（admin / 23082026）→ Dashboard
2. Bottom Nav 切換五大模組
3. Voting Stepper 控制投票生命週期
4. Results 檢視審計、個人檔案、摘要

---

## 3–4. Wireframes & High-Fidelity Screens

| # | Screen | 實作元素 |
|---|--------|----------|
| 1 | Splash | `#screen-splash` |
| 2 | Login | `#screen-login` |
| 3 | Participant Home | `#view-home` + 4 cards |
| 4 | Anonymous Message | `#view-send` |
| 5 | Inbox | `#view-inbox` |
| 6 | Sent | `#view-sent` |
| 7 | Trophy Voting | `#view-trophy` |
| 8 | Voting Submitted | `#view-trophy-submitted` |
| 9 | Award Popup | `#trophy-results-modal` (glass) |
| 10 | Profile | `#view-profile` |
| 11 | Admin Dashboard | `#admin-dashboard-panel` |
| 12 | Message Monitoring | `#admin-messages-panel` |
| 13 | Messaging Control | Settings 卡片 |
| 14 | Voting Control | `#admin-trophy-panel` + stepper |
| 15 | Voting Audit | `#result-audit` |
| 16 | Participant Profile | `#result-profiles` |
| 17 | Award Summary | `#result-summary` accordion |
| 18 | Settings | `#admin-participants-panel` |

---

## 5. Design System

### Color System
| Token | Hex | Usage |
|-------|-----|-------|
| Background | `#FFF9F2` | 頁面底色 |
| Primary | `#E9C46A` | 主按鈕、強調 |
| Secondary | `#D4A373` | 副標、數值 |
| Success | `#7FB77E` | 成功狀態 |
| Danger | `#D66A6A` | 危險操作 |
| Text | `#4A403A` | 正文 |
| Border | `#EFE4D2` | 分隔線 |

### Typography (Noto Sans TC)
| Level | Size | Weight |
|-------|------|--------|
| Title | 28px | 700 |
| Section | 22px | 700 |
| Subtitle | 18px | 600 |
| Body | 16px | 400 |
| Caption | 13px | 500 |
| Button | 17px | 600 |

### Spacing (8px grid)
`4 · 8 · 16 · 24 · 32 · 48`

### Radius
- Cards: 20–24px (`--radius-lg` / `--radius-xl`)
- Buttons: 16px
- Chips: pill

---

## 6. Component Library

| Component | Class | Variants |
|-----------|-------|----------|
| Button | `.btn` | primary, secondary, success, danger, ghost |
| Card | `.card` | default, glass (`.glass-card`) |
| Input | `.input-field` | text, tel, search, textarea |
| Combobox | `.combobox-wrapper` | searchable dropdown |
| Bottom Nav | `.bottom-nav` | participant / admin |
| Badge | `.badge` | pill, deleted, live |
| Chip | `.chip` | filter, secondary |
| Toast | `.toast` | info, success, error |
| Modal | `.modal-overlay` | glass popup |
| Empty State | `.empty-state` | illustration circle |
| Stepper | `.voting-stepper` | 5-step voting lifecycle |
| Accordion | `.summary-item` | trophy summary |

---

## 7–9. Systems Summary

- **Icons**: Emoji-first（💌📥🏆📤🏠👤）+ inline SVG（返回、登出、重新整理）
- **Touch targets**: min 48px
- **Shadows**: soft card shadow `--shadow-card`
- **Glassmorphism**: popup only (`backdrop-filter: blur(24px)`)

---

## 10. Icons Recommendation

- Primary: Emoji（跨平台一致、青少年友善）
- Secondary: Lucide / Heroicons SVG（導航、操作）
- Trophy: 🏆 · Message: 💌 · Success: ✅

---

## 11. Animation Specification

| Animation | Trigger | Duration | Easing |
|-----------|---------|----------|--------|
| Splash fade | App load | 400ms | ease-out |
| Page enter | Screen switch | 400ms | ease-out |
| View slide up | Tab change | 250ms | ease-out |
| Button press | `:active` | 150ms | scale(0.97) |
| Modal scale | Popup open | 250ms | spring |
| Toast slide | Notification | 250ms | ease-out |
| Confetti | Award popup | 2s | physics |
| Read fade | Inbox tap | 400ms | ease-out |
| Skeleton shimmer | Loading | 1.5s | infinite |

---

## 12. Responsive Rules

- **Target**: Mobile only (320–480px)
- **Max width**: 480px centered on larger screens
- **Safe areas**: `env(safe-area-inset-*)` for notch/home indicator
- **Bottom nav**: fixed, blur backdrop
- **No desktop layout** — phone frame on wide screens

---

## 13. Accessibility Guidelines

- `lang="zh-Hant"` on `<html>`
- All interactive elements ≥ 48px touch target
- `aria-label`, `role="tablist"`, `aria-selected` on navigation
- `aria-live="polite"` on toast container
- `prefers-reduced-motion` disables animations
- `:focus-visible` outline on keyboard focus
- Form labels linked via `for` / `id`

---

## 14. Figma-ready Layout Specification

- **Frame**: 390 × 844 (iPhone 14)
- **Grid**: 16px horizontal margin
- **Header height**: 72px
- **Bottom nav**: 64px + safe area
- **Card padding**: 16px
- **Card gap**: 16px
- **Home grid**: 2 × 2, gap 16px
- **Font**: Noto Sans TC

---

## 15. Export-ready Screen List

1. `01_splash.png`
2. `02_login.png`
3. `03_home.png`
4. `04_send_message.png`
5. `05_inbox.png`
6. `06_sent.png`
7. `07_trophy_voting.png`
8. `08_trophy_submitted.png`
9. `09_award_popup.png`
10. `10_profile.png`
11. `11_admin_dashboard.png`
12. `12_admin_messages.png`
13. `13_admin_messaging_control.png`
14. `14_admin_voting_control.png`
15. `15_admin_audit.png`
16. `16_admin_profiles.png`
17. `17_admin_summary.png`
18. `18_admin_settings.png`

---

*Implementation files: `index.html` · `styles.css` · `app.js`*
