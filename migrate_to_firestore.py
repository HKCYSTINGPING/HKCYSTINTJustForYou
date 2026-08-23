#!/usr/bin/env python3
"""
One-time migration from Google Sheets + Apps Script to Firebase Firestore.

Creates one Firebase Auth account per participant so that Firestore security
rules have a verified identity to work with. The address is derived from the
participant id and the password is the phone number, which keeps the login
screen unchanged while moving enforcement from the frontend to Google:

    A1 / 98765432  ->  a1@tnit.local  with password 98765432

Safe to run more than once: documents are overwritten and existing accounts
have their password reset rather than causing an error.

    pip3 install firebase-admin
    python3 migrate_to_firestore.py --credentials ~/Downloads/service-account.json \
        --admin-password 23082026

Add --with-messages to carry the existing messages over, and --dry-run to see
what would happen without touching anything.
"""

import argparse
import json
import urllib.parse
import urllib.request
from datetime import datetime, timezone

API_URL = (
    "https://script.google.com/macros/s/"
    "AKfycbwNHsaZ4-smjmdCaYvmNcANIhIiXtUWUH5QHG0KJwSwpq4RxlelkRSa7QRJXFJQKpwV6A/exec"
)
EMAIL_DOMAIN = "tnit.local"
ADMIN_EMAIL = f"admin@{EMAIL_DOMAIN}"
ADMIN_SHEET_ID = "ADMIN"
ADMIN_SHEET_PHONE = "23082026"


def participant_email(participant_id):
    return f"{participant_id.lower()}@{EMAIL_DOMAIN}"


def fetch_json(params):
    query = urllib.parse.urlencode(params)
    with urllib.request.urlopen(f"{API_URL}?{query}", timeout=90) as res:
        payload = json.load(res)
    if payload.get("status") != "success":
        raise SystemExit(f"Apps Script 回傳錯誤：{payload.get('message', payload)}")
    return payload


def load_roster():
    """Reads from the sheet rather than participants.json, because the public
    file no longer carries phone numbers and we need them as passwords."""
    payload = fetch_json({"action": "bootstrap"})
    roster = []
    for person in payload.get("participants") or []:
        pid = str(person.get("participant_id", "")).strip().upper()
        phone = "".join(ch for ch in str(person.get("phone_number", "")) if ch.isdigit())
        if pid:
            roster.append({
                "participant_id": pid,
                "phone_number": phone,
                "group_id": str(person.get("group_id", "")).strip(),
            })
    if not roster:
        raise SystemExit("Google Sheet 冇回傳任何參加者，已中止")
    return roster


def load_source_data(with_messages):
    """Everything still lives in the sheet, so read it through the old API."""
    sample = None
    roster = load_roster()
    for person in roster:
        if person.get("phone_number"):
            sample = person
            break
    if not sample:
        raise SystemExit("搵唔到有電話號碼嘅參加者，無法讀取 Trophy 清單")

    trophy_payload = fetch_json({
        "action": "trophy_bootstrap",
        "participant_id": sample["participant_id"],
        "phone_number": sample["phone_number"],
    })

    admin_payload = fetch_json({
        "action": "admin",
        "participant_id": ADMIN_SHEET_ID,
        "phone_number": ADMIN_SHEET_PHONE,
    })

    return {
        "roster": roster,
        "trophies": trophy_payload.get("trophies") or [],
        "voting_status": trophy_payload.get("voting_status") or "DRAFT",
        "messaging_status": admin_payload.get("messaging_status") or "OPEN",
        "messages": (admin_payload.get("messages") or []) if with_messages else [],
    }


def upsert_account(auth, email, password):
    """Returns 'created' or 'updated' so the summary can report both."""
    try:
        user = auth.get_user_by_email(email)
        auth.update_user(user.uid, password=password)
        return "updated"
    except auth.UserNotFoundError:
        auth.create_user(email=email, password=password, email_verified=True)
        return "created"


def main():
    parser = argparse.ArgumentParser(description="搬遷資料到 Firebase Firestore")
    parser.add_argument("--credentials", help="服務帳戶 JSON 路徑（--dry-run 時可以省略）")
    parser.add_argument("--admin-password", help="管理員登入密碼（至少 6 位）")
    parser.add_argument("--with-messages", action="store_true", help="連現有留言一齊搬")
    parser.add_argument("--dry-run", action="store_true", help="只顯示會做咩，唔會寫入")
    args = parser.parse_args()

    if not args.dry_run:
        if not args.credentials:
            raise SystemExit("需要 --credentials，或者加 --dry-run 試行")
        if not args.admin_password or len(args.admin_password) < 6:
            raise SystemExit("需要 --admin-password，Firebase 要求至少 6 個字元")

    print("讀取現有資料…")
    source = load_source_data(args.with_messages)
    roster = source["roster"]

    short_phones = [p["participant_id"] for p in roster if len(p.get("phone_number", "")) < 6]
    if short_phones:
        raise SystemExit(
            "以下參加者嘅電話少於 6 位，Firebase 會拒絕做密碼：" + ", ".join(short_phones)
        )

    print(f"  參加者 {len(roster)} 人")
    print(f"  獎項 {len(source['trophies'])} 個")
    print(f"  留言 {len(source['messages'])} 則")
    print(f"  留言開關 {source['messaging_status']}，投票狀態 {source['voting_status']}")

    if args.dry_run:
        print("\n[dry-run] 以下係會建立嘅嘢，但唔會實際寫入：")
        for person in roster[:3]:
            print(f"  帳戶 {participant_email(person['participant_id'])}")
        print(f"  …連同其餘 {max(len(roster) - 3, 0)} 個參加者帳戶同 {ADMIN_EMAIL}")
        print(f"  Firestore：participants {len(roster)}、trophies "
              f"{len(source['trophies'])}、config 2 份、messages {len(source['messages'])}")
        print("\n[dry-run] 完成，冇改動過任何嘢。")
        return

    try:
        import firebase_admin
        from firebase_admin import auth, credentials, firestore
    except ImportError:
        raise SystemExit("請先安裝：pip3 install firebase-admin")

    firebase_admin.initialize_app(credentials.Certificate(args.credentials))
    db = firestore.client()

    print("\n建立登入帳戶…")
    created = updated = 0
    for person in roster:
        result = upsert_account(
            auth, participant_email(person["participant_id"]), person["phone_number"]
        )
        created += result == "created"
        updated += result == "updated"
    admin_result = upsert_account(auth, ADMIN_EMAIL, args.admin_password)
    print(f"  新建 {created}，更新密碼 {updated}，管理員 {admin_result}")

    print("\n寫入 Firestore…")
    batch = db.batch()
    for person in roster:
        batch.set(db.collection("participants").document(person["participant_id"]), {
            "participant_id": person["participant_id"],
            "group_id": person.get("group_id", ""),
        })
        # Kept apart from the roster so that a signed-in participant, who can
        # read the roster to find teammates, cannot read everyone's password.
        batch.set(db.collection("contacts").document(person["participant_id"]), {
            "participant_id": person["participant_id"],
            "phone_number": person.get("phone_number", ""),
        })
    for trophy in source["trophies"]:
        batch.set(db.collection("trophies").document(trophy["trophy_id"]), {
            "trophy_id": trophy["trophy_id"],
            "trophy_name": trophy["trophy_name"],
        })
    batch.set(db.collection("config").document("messaging"), {
        "status": source["messaging_status"],
    })
    batch.set(db.collection("config").document("voting"), {
        "voting_status": source["voting_status"],
        "allow_resubmit": False,
        "calculated_at": "",
        "published_at": "",
    })
    batch.commit()
    print(f"  participants {len(roster)}、contacts {len(roster)}、"
          f"trophies {len(source['trophies'])}、config 2 份")

    if source["messages"]:
        message_batch = db.batch()
        for message in source["messages"]:
            doc = db.collection("messages").document(message["message_id"])
            message_batch.set(doc, {
                "sender_id": message["sender_id"],
                "receiver_id": message["receiver_id"],
                "content": message["content"],
                "created_at": message["created_at"],
                "status": message.get("status", "active"),
                "deleted_at": message.get("deleted_at", ""),
            })
        message_batch.commit()
        print(f"  messages {len(source['messages'])} 則")

    print(f"\n完成（{datetime.now(timezone.utc).isoformat(timespec='seconds')}）")
    print("下一步：喺 Firebase Console 貼上 firestore.rules 嘅內容並發布。")


if __name__ == "__main__":
    main()
