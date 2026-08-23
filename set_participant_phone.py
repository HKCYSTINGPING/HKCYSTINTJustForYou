#!/usr/bin/env python3
"""
Change a participant's phone number, which is also their login password.

Firebase only lets a signed-in user change their own password, so the admin
page in the browser cannot do this for someone else. This script can, because
it runs with the service account.

    python3 set_participant_phone.py A1 91234567 \
        --credentials ~/Downloads/service-account.json

Takes effect immediately; the participant simply logs in with the new number.
"""

import argparse

from migrate_to_firestore import ADMIN_EMAIL, participant_email


def main():
    parser = argparse.ArgumentParser(description="修改參加者電話號碼（等同登入密碼）")
    parser.add_argument("participant_id", help="參加者編號，例如 A1")
    parser.add_argument("phone", help="新電話號碼")
    parser.add_argument("--credentials", required=True, help="服務帳戶 JSON 路徑")
    args = parser.parse_args()

    participant_id = args.participant_id.strip().upper()
    phone = str(args.phone or "").strip()
    if not phone:
        raise SystemExit("請輸入新密碼")

    auth_password = phone
    while len(auth_password) < 6:
        auth_password += phone

    try:
        import firebase_admin
        from firebase_admin import auth, credentials, firestore
    except ImportError:
        raise SystemExit("請先安裝：pip3 install firebase-admin")

    firebase_admin.initialize_app(credentials.Certificate(args.credentials))
    db = firestore.client()

    email = ADMIN_EMAIL if participant_id == "ADMIN" else participant_email(participant_id)
    try:
        user = auth.get_user_by_email(email)
    except auth.UserNotFoundError:
        raise SystemExit(f"搵唔到 {participant_id} 呢個帳戶，請確認編號")

    auth.update_user(user.uid, password=auth_password)
    db.collection("contacts").document(participant_id).set(
        {"participant_id": participant_id, "phone_number": phone}, merge=True
    )

    print(f"{participant_id} 嘅電話號碼已改為 {phone}，即刻可以用新號碼登入。")
    print("記得同步更新 Google Sheet，否則下次執行搬遷腳本會改返舊號碼。")


if __name__ == "__main__":
    main()
