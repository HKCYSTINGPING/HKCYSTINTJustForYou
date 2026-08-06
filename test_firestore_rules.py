#!/usr/bin/env python3
"""
Check the deployed security rules against the live project.

Signs in as a real participant and as the admin, then confirms that each thing
we expect to work does work and each thing we expect to be blocked really is
blocked. Rules are the only thing standing between a curious teenager and
everyone else's messages, so "it looked right" is not good enough.

    python3 test_firestore_rules.py
"""

import json
import urllib.error
import urllib.request

API_KEY = "AIzaSyBIQrLARWje_fe7TX7f2u0Wk7xjFDAyNcs"
PROJECT = "tnit-6c48d"
BASE = f"https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents"

results = []


def sign_in(email, password):
    body = json.dumps({
        "email": email, "password": password, "returnSecureToken": True
    }).encode()
    req = urllib.request.Request(
        f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={API_KEY}",
        data=body, headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=30) as res:
        return json.load(res)["idToken"]


def call(token, path, method="GET", payload=None):
    """Returns (allowed, detail). A 404 means the rules let us look but the
    document simply is not there yet, which still counts as allowed."""
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(
        f"{BASE}{path}", data=data, method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            return True, json.load(res)
    except urllib.error.HTTPError as err:
        if err.code == 404:
            return True, "文件未存在"
        return False, f"HTTP {err.code}"


def check(label, should_pass, ok, detail):
    verdict = "通過" if ok == should_pass else "**不符預期**"
    want = "應該准許" if should_pass else "應該拒絕"
    got = "准許" if ok else f"拒絕（{detail}）"
    results.append(ok == should_pass)
    print(f"  [{verdict}] {label} — {want}，實際{got}")


def query(collection, field=None, value=None):
    where = None
    if field:
        where = {
            "fieldFilter": {
                "field": {"fieldPath": field},
                "op": "EQUAL",
                "value": {"stringValue": value},
            }
        }
    q = {"from": [{"collectionId": collection}], "limit": 5}
    if where:
        q["where"] = where
    return {"structuredQuery": q}


def main():
    print("以參加者 1A 登入…")
    p = sign_in("1a@tnit.local", "98765432")
    print("以管理員登入…")
    a = sign_in("admin@tnit.local", "23082026")

    print("\n參加者應該做得到嘅嘢：")
    check("讀取自己嘅名冊資料", True, *call(p, "/participants/1A"))
    check("讀取留言開關設定", True, *call(p, "/config/messaging"))
    check("讀取獎項清單", True, *call(p, "/trophies/T01"))
    ok, detail = call(p, ":runQuery", "POST", query("messages", "receiver_id", "1A"))
    check("查詢寄畀自己嘅留言", True, ok, detail)
    ok, detail = call(p, ":runQuery", "POST", query("messages", "sender_id", "1A"))
    check("查詢自己寄出嘅留言", True, ok, detail)
    check("讀取自己嘅投票紀錄", True, *call(p, "/submissions/1A"))

    print("\n參加者應該被擋嘅嘢：")
    ok, detail = call(p, ":runQuery", "POST", query("messages"))
    check("偷睇全部人嘅留言", False, ok, detail)
    ok, detail = call(p, ":runQuery", "POST", query("messages", "receiver_id", "2B"))
    check("偷睇 2B 收到嘅留言", False, ok, detail)
    check("偷睇 2B 嘅投票紀錄", False, *call(p, "/submissions/2B"))
    check("未公布就睇成績", False, *call(p, "/results/1A"))
    check("改名冊（改自己組別）", False, *call(
        p, "/participants/1A", "PATCH",
        {"fields": {"group_id": {"stringValue": "HACKED"}}},
    ))
    check("擅自改留言開關", False, *call(
        p, "/config/messaging?updateMask.fieldPaths=status", "PATCH",
        {"fields": {"status": {"stringValue": "CLOSE"}}},
    ))
    check("冒充 2B 寄留言", False, *call(
        p, "/messages?documentId=rules-probe", "POST",
        {"fields": {
            "sender_id": {"stringValue": "2B"},
            "receiver_id": {"stringValue": "3C"},
            "content": {"stringValue": "冒充測試"},
            "status": {"stringValue": "active"},
            "created_at": {"stringValue": "2026-01-01"},
        }},
    ))

    print("\n管理員應該做得到嘅嘢：")
    ok, detail = call(a, ":runQuery", "POST", query("messages"))
    check("讀取全部留言", True, ok, detail)
    check("讀取任何人嘅投票紀錄", True, *call(a, "/submissions/2B"))
    check("讀取電話號碼", True, *call(a, "/contacts/1A"))
    check("修改留言開關", True, *call(
        a, "/config/messaging?updateMask.fieldPaths=status", "PATCH",
        {"fields": {"status": {"stringValue": "OPEN"}}},
    ))

    # Clearing records between rehearsal and the real night happens from the
    # admin page, so deleting has to actually be permitted. Two probes, because
    # deleting something that is already gone would pass no matter what.
    for probe in ("cleanup-a", "cleanup-b"):
        call(a, f"/messages?documentId={probe}", "POST", {"fields": {
            "sender_id": {"stringValue": "1A"},
            "receiver_id": {"stringValue": "2B"},
            "content": {"stringValue": "清理測試"},
            "status": {"stringValue": "active"},
        }})
    check("刪除留言", True, *call(a, "/messages/cleanup-a", "DELETE"))

    print("\n參加者仍然唔可以：")
    check("刪走留言", False, *call(p, "/messages/cleanup-b", "DELETE"))
    check("讀取電話號碼", False, *call(p, "/contacts/1A"))
    call(a, "/messages/cleanup-b", "DELETE")

    passed = sum(results)
    print(f"\n{passed}/{len(results)} 項符合預期。")
    if passed != len(results):
        raise SystemExit("有項目唔符合預期，規則要再調整。")


if __name__ == "__main__":
    main()
