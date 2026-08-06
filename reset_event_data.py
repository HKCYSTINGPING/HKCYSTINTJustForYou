#!/usr/bin/env python3
"""
Clear everything the participants produced and put the event back to the start.

Use this after a rehearsal, so the real night begins with an empty board. The
roster, the trophy list and the login accounts are left untouched; only what
people did is removed.

    python3 reset_event_data.py --credentials ~/Downloads/service-account.json

Add --voting-status VOTING_OPEN if you want voting open right away.
"""

import argparse

WIPE_COLLECTIONS = ("messages", "submissions", "results", "presence")


def main():
    parser = argparse.ArgumentParser(description="清除留言、投票同結果，回到活動起點")
    parser.add_argument("--credentials", required=True, help="服務帳戶 JSON 路徑")
    parser.add_argument("--voting-status", default="DRAFT",
                        choices=["DRAFT", "VOTING_OPEN", "VOTING_CLOSED"],
                        help="重設後嘅投票狀態，預設 DRAFT")
    parser.add_argument("--messaging-status", default="OPEN", choices=["OPEN", "CLOSE"],
                        help="重設後嘅留言開關，預設 OPEN")
    parser.add_argument("--yes", action="store_true", help="唔使再確認")
    args = parser.parse_args()

    if not args.yes:
        answer = input("會刪除全部留言、投票同結果，無法復原。輸入 YES 確認：")
        if answer.strip() != "YES":
            raise SystemExit("已取消")

    try:
        import firebase_admin
        from firebase_admin import credentials, firestore
    except ImportError:
        raise SystemExit("請先安裝：pip3 install firebase-admin")

    firebase_admin.initialize_app(credentials.Certificate(args.credentials))
    db = firestore.client()

    for name in WIPE_COLLECTIONS:
        removed = 0
        # Delete in batches; a single batch is capped at 500 operations.
        while True:
            docs = list(db.collection(name).limit(400).stream())
            if not docs:
                break
            batch = db.batch()
            for doc in docs:
                batch.delete(doc.reference)
            batch.commit()
            removed += len(docs)
        print(f"  {name}: 刪除 {removed} 份")

    db.collection("config").document("voting").set({
        "voting_status": args.voting_status,
        "allow_resubmit": False,
        "calculated_at": "",
        "published_at": "",
        "fallback_activated": False,
    }, merge=True)
    db.collection("config").document("messaging").set(
        {"status": args.messaging_status}, merge=True
    )

    print(f"投票狀態設為 {args.voting_status}，留言開關設為 {args.messaging_status}")
    print("完成。名單、獎項同登入帳戶未受影響。")


if __name__ == "__main__":
    main()
