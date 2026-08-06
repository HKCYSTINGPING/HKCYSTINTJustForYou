#!/usr/bin/env python3
"""
Regenerate participants.json from the live Google Sheet.

The login screen reads that file straight from GitHub Pages so the page can
render immediately without waiting on any backend.

Phone numbers are deliberately left out. They are the login passwords now, and
Firebase Authentication checks them, so the browser never needs to see anyone
else's. Run migrate_to_firestore.py to push phone changes to Firebase.

Run this whenever participant IDs or groups change in the sheet:

    python3 sync_participants.py

Then commit and push participants.json.
"""

import json
import sys
import urllib.request
from datetime import datetime, timezone

API_URL = (
    "https://script.google.com/macros/s/"
    "AKfycbwNHsaZ4-smjmdCaYvmNcANIhIiXtUWUH5QHG0KJwSwpq4RxlelkRSa7QRJXFJQKpwV6A/exec"
)
OUTPUT = "participants.json"


def fetch_participants():
    with urllib.request.urlopen(f"{API_URL}?action=bootstrap", timeout=60) as res:
        payload = json.load(res)

    if payload.get("status") != "success":
        raise SystemExit(f"API 回傳錯誤：{payload.get('message', payload)}")

    participants = payload.get("participants") or []
    if not participants:
        raise SystemExit("API 冇回傳任何參加者，已中止，避免覆蓋成個檔案")

    return participants


def normalize(participants):
    rows = []
    missing_phone = []
    for p in participants:
        pid = str(p.get("participant_id", "")).strip().upper()
        phone = "".join(ch for ch in str(p.get("phone_number", "")) if ch.isdigit())
        group = str(p.get("group_id", "")).strip()
        if pid:
            rows.append({"participant_id": pid, "group_id": group})
            if not phone:
                missing_phone.append(pid)
    rows.sort(key=lambda r: (r["group_id"], r["participant_id"]))
    return rows, missing_phone


def main():
    rows, missing = normalize(fetch_participants())

    if missing:
        print(f"警告：以下參加者冇電話號碼，將無法登入：{', '.join(missing)}", file=sys.stderr)

    document = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "count": len(rows),
        "participants": rows,
    }

    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(document, f, ensure_ascii=False, indent=2)
        f.write("\n")

    groups = {}
    for r in rows:
        groups.setdefault(r["group_id"] or "(空白)", 0)
        groups[r["group_id"] or "(空白)"] += 1

    print(f"已寫入 {OUTPUT}，共 {len(rows)} 人")
    for group in sorted(groups):
        print(f"  {group}: {groups[group]} 人")
    print("\n記得 commit 同 push，GitHub Pages 先會更新。")


if __name__ == "__main__":
    main()
