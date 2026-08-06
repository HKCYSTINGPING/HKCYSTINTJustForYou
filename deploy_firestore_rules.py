#!/usr/bin/env python3
"""
Publish firestore.rules to the live project.

Uploading through the API rather than pasting into the console means the rules
in git are always the rules being enforced, and a syntax error fails here
instead of silently locking everyone out.

    python3 deploy_firestore_rules.py --credentials ~/Downloads/service-account.json
"""

import argparse

PROJECT_ID = "tnit-6c48d"
RULES_FILE = "firestore.rules"
RELEASE = f"projects/{PROJECT_ID}/releases/cloud.firestore"
SCOPES = ["https://www.googleapis.com/auth/firebase"]


def main():
    parser = argparse.ArgumentParser(description="發布 Firestore 安全規則")
    parser.add_argument("--credentials", required=True, help="服務帳戶 JSON 路徑")
    args = parser.parse_args()

    try:
        import requests
        from google.auth.transport.requests import Request
        from google.oauth2 import service_account
    except ImportError:
        raise SystemExit("請先安裝：pip3 install firebase-admin")

    with open(RULES_FILE, encoding="utf-8") as f:
        source = f.read()

    creds = service_account.Credentials.from_service_account_file(
        args.credentials, scopes=SCOPES
    )
    creds.refresh(Request())
    headers = {"Authorization": f"Bearer {creds.token}"}

    print(f"上載 {RULES_FILE}（{len(source)} 字元）…")
    created = requests.post(
        f"https://firebaserules.googleapis.com/v1/projects/{PROJECT_ID}/rulesets",
        headers=headers,
        json={"source": {"files": [{"name": RULES_FILE, "content": source}]}},
        timeout=60,
    )
    if not created.ok:
        raise SystemExit(f"規則有問題，未發布：\n{created.text}")
    ruleset = created.json()["name"]
    print(f"  通過語法檢查：{ruleset}")

    print("發布…")
    released = requests.put(
        f"https://firebaserules.googleapis.com/v1/{RELEASE}",
        headers=headers,
        json={"name": RELEASE, "rulesetName": ruleset},
        timeout=60,
    )
    if released.status_code == 404:
        released = requests.post(
            f"https://firebaserules.googleapis.com/v1/projects/{PROJECT_ID}/releases",
            headers=headers,
            json={"name": RELEASE, "rulesetName": ruleset},
            timeout=60,
        )
    if not released.ok:
        raise SystemExit(f"發布失敗：\n{released.text}")

    print("完成，規則已生效。")


if __name__ == "__main__":
    main()
