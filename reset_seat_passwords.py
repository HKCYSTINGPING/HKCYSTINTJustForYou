#!/usr/bin/env python3
"""
Reset seat ids to A1 format, letter groups (A/B/C/D), display names, and
the 4-digit login passwords.

Firebase Auth needs at least 6 characters, so 8489 is stored as 84898489
(the web app expands the same way). Participants still type the 4 digits.

    .venv/bin/python reset_seat_passwords.py \\
        --credentials ~/Downloads/tnit-6c48d-firebase-adminsdk-....json
"""

import argparse
import re

SEAT_RE = re.compile(r"^[A-H]\d+$", re.I)
LEGACY_SEAT_RE = re.compile(r"^\d+[A-H]$", re.I)
EMAIL_DOMAINS = ("tnit.org", "tnit.local")

# Keep leading zeros. These are the passwords participants type.
SEAT_PASSWORDS = {
    "A1": "8489", "A2": "6250", "A3": "3875", "A4": "4628",
    "A5": "8994", "A6": "9453", "A7": "4570", "A8": "2229",
    "B1": "1863", "B2": "0959", "B3": "3291", "B4": "3587",
    "B5": "6430", "B6": "3304", "B7": "4006", "B8": "7602",
    "C1": "2990", "C2": "2173", "C3": "1962", "C4": "6329",
    "C5": "5162", "C6": "4103",
    "D1": "0593", "D2": "5431", "D3": "1414", "D4": "2351",
    "D5": "4693", "D6": "4780", "D7": "6089", "D8": "5277",
}

GROUP_FROM_OLD = {
    "GROUP_1": "A", "GROUP_2": "B", "GROUP_3": "C",
    "GROUP_4": "D", "GROUP_5": "E", "GROUP_6": "F",
}


def normalize_seat_id(value):
    raw = str(value or "").strip().upper()
    m = re.fullmatch(r"(\d+)([A-H])", raw)
    return f"{m.group(2)}{m.group(1)}" if m else raw


def is_seat_id(value):
    raw = str(value or "").strip().upper()
    return bool(SEAT_RE.fullmatch(raw) or LEGACY_SEAT_RE.fullmatch(raw))


def group_from_seat(seat_id):
    seat_id = normalize_seat_id(seat_id)
    return seat_id[0] if SEAT_RE.fullmatch(seat_id) else ""


def expand_auth_password(raw):
    password = str(raw or "").strip()
    if not password:
        return ""
    while len(password) < 6:
        password += str(raw).strip()
    return password


def participant_emails(participant_id):
    local = str(participant_id).strip().lower()
    flipped = ""
    m = re.fullmatch(r"([a-h])(\d+)", local)
    if m:
        flipped = f"{m.group(2)}{m.group(1)}"
    emails = [f"{local}@{domain}" for domain in EMAIL_DOMAINS]
    if flipped and flipped != local:
        emails.extend(f"{flipped}@{domain}" for domain in EMAIL_DOMAINS)
    return emails


def normalize_group_id(group_id):
    g = str(group_id or "").strip()
    if not g:
        return ""
    upper = g.upper()
    if upper in GROUP_FROM_OLD:
        return GROUP_FROM_OLD[upper]
    if re.fullmatch(r"[A-H]", upper):
        return upper
    return g


def copy_doc(db, collection, old_id, new_id, extra):
    snap = db.collection(collection).document(old_id).get()
    if not snap.exists:
        return False
    payload = dict(snap.to_dict() or {})
    payload.update(extra)
    db.collection(collection).document(new_id).set(payload)
    return True


def rewrite_id_references(db, old_id, new_id, new_group):
    messages = db.collection("messages").stream()
    for doc in messages:
        raw = doc.to_dict() or {}
        patch = {}
        if raw.get("sender_id") == old_id:
            patch["sender_id"] = new_id
            if new_group:
                patch["sender_group_id"] = new_group
        if raw.get("receiver_id") == old_id:
            patch["receiver_id"] = new_id
            if new_group:
                patch["receiver_group_id"] = new_group
        if patch:
            thread = raw.get("thread_group_id") or ""
            sender_g = patch.get("sender_group_id") or raw.get("sender_group_id") or ""
            if thread and sender_g and thread == (raw.get("sender_group_id") or ""):
                patch["thread_group_id"] = sender_g
            doc.reference.update(patch)

    submissions = db.collection("submissions").stream()
    for doc in submissions:
        if doc.id == old_id:
            continue
        raw = doc.to_dict() or {}
        pairings = raw.get("pairings") or []
        changed = False
        next_pairs = []
        for pair in pairings:
            if pair and pair.get("receiver_id") == old_id:
                next_pairs.append({**pair, "receiver_id": new_id})
                changed = True
            else:
                next_pairs.append(pair)
        if changed:
            doc.reference.update({"pairings": next_pairs})


def delete_docs(db, collection, doc_id):
    db.collection(collection).document(doc_id).delete()


def upsert_auth_password(auth, email, password):
    try:
        user = auth.get_user_by_email(email)
    except auth.UserNotFoundError:
        auth.create_user(email=email, password=password, email_verified=True)
        return "created"
    auth.update_user(user.uid, password=password)
    return "updated"


def rename_auth_email(auth, old_id, new_id):
    if old_id == new_id:
        return
    old_emails = participant_emails(old_id)
    new_primary = f"{new_id.lower()}@tnit.org"
    for email in old_emails:
        try:
            user = auth.get_user_by_email(email)
        except auth.UserNotFoundError:
            continue
        if user.email.lower() == new_primary:
            continue
        try:
            auth.update_user(user.uid, email=new_primary, email_verified=True)
            return
        except Exception:
            # Keep the old address; login still tries both locals.
            return


def rename_seat(db, auth, old_id, new_id, group_id, display_name, dry_run):
    if old_id == new_id:
        return "same"
    existing = db.collection("participants").document(new_id).get()
    if existing.exists:
        return "conflict"
    if dry_run:
        return "rename"
    if not copy_doc(db, "participants", old_id, new_id, {
        "participant_id": new_id,
        "group_id": group_id,
        "display_name": display_name,
        "force_logout_rev": 0,
    }):
        return "missing"
    copy_doc(db, "contacts", old_id, new_id, {
        "participant_id": new_id,
        "phone_number": SEAT_PASSWORDS.get(new_id, new_id),
    })
    if copy_doc(db, "submissions", old_id, new_id, {"participant_id": new_id}):
        snap = db.collection("submissions").document(new_id).get()
        raw = snap.to_dict() or {}
        pairings = [
            ({**pair, "receiver_id": new_id} if pair and pair.get("receiver_id") == old_id else pair)
            for pair in (raw.get("pairings") or [])
        ]
        db.collection("submissions").document(new_id).set({**raw, "pairings": pairings, "participant_id": new_id})
    copy_doc(db, "results", old_id, new_id, {"participant_id": new_id})
    copy_doc(db, "presence", old_id, new_id, {"participant_id": new_id})
    copy_doc(db, "push_tokens", old_id, new_id, {"participant_id": new_id})
    rewrite_id_references(db, old_id, new_id, group_id)
    for collection in ("participants", "contacts", "submissions", "results", "presence", "push_tokens"):
        delete_docs(db, collection, old_id)
    rename_auth_email(auth, old_id, new_id)
    return "renamed"


def migrate_group_docs(db, dry_run):
    moved = 0
    for old_id, new_id in GROUP_FROM_OLD.items():
        snap = db.collection("groups").document(old_id).get()
        if not snap.exists:
            continue
        if dry_run:
            print(f"  groups/{old_id} → groups/{new_id}")
            moved += 1
            continue
        payload = dict(snap.to_dict() or {})
        payload["group_id"] = new_id
        target = db.collection("groups").document(new_id).get()
        if not target.exists:
            db.collection("groups").document(new_id).set(payload)
        snap.reference.delete()
        moved += 1
    return moved


def apply_seat_record(db, auth, seat_id, dry_run):
    group = group_from_seat(seat_id)
    phone = SEAT_PASSWORDS.get(seat_id, "")
    auth_password = expand_auth_password(phone) if phone else ""
    if dry_run:
        print(f"  {seat_id}: group={group} display={seat_id} password={phone or '(unchanged)'}")
        return "preview"

    db.collection("participants").document(seat_id).set({
        "participant_id": seat_id,
        "group_id": group,
        "display_name": seat_id,
        "force_logout_rev": 0,
    }, merge=True)

    if phone:
        db.collection("contacts").document(seat_id).set({
            "participant_id": seat_id,
            "phone_number": phone,
        }, merge=True)
        for email in participant_emails(seat_id)[:2]:
            upsert_auth_password(auth, email, auth_password)
    return "updated"


def main():
    parser = argparse.ArgumentParser(description="重設座位編號、組別、顯示名稱同 4 位密碼")
    parser.add_argument("--credentials", help="服務帳戶 JSON 路徑")
    parser.add_argument("--dry-run", action="store_true", help="只顯示會做咩，唔會寫入")
    args = parser.parse_args()

    wanted = list(SEAT_PASSWORDS)
    print(f"目標座位 {len(wanted)} 個：{wanted[0]} … {wanted[-1]}")
    print("密碼係 4 位；Auth 會存成重複後嘅 6+ 字元（例如 8489 → 84898489）")

    if args.dry_run and not args.credentials:
        for seat in wanted:
            apply_seat_record(None, None, seat, True)
        print("\n[dry-run] 未連線 Firebase，只預覽目標名冊。")
        return

    if not args.credentials:
        raise SystemExit("需要 --credentials，或者加 --dry-run 試行")

    try:
        import firebase_admin
        from firebase_admin import auth, credentials, firestore
    except ImportError:
        raise SystemExit("請先安裝：pip3 install firebase-admin")

    firebase_admin.initialize_app(credentials.Certificate(args.credentials))
    db = firestore.client()

    live = list(db.collection("participants").stream())
    live_ids = [doc.id.strip().upper() for doc in live]
    print(f"\nLive Firestore 現有 {len(live_ids)} 個參加者")
    leftovers = [pid for pid in live_ids if is_seat_id(pid) and normalize_seat_id(pid) != pid]
    if leftovers:
        print(f"  仍係舊格式：{', '.join(leftovers)}")
    else:
        print("  未發現 1A 舊格式編號")

    renamed = conflicts = 0
    for pid in live_ids:
        if not is_seat_id(pid):
            continue
        new_id = normalize_seat_id(pid)
        if new_id == pid:
            continue
        result = rename_seat(db, auth, pid, new_id, group_from_seat(new_id), new_id, args.dry_run)
        print(f"  {pid} → {new_id}: {result}")
        if result == "renamed" or result == "rename":
            renamed += 1
        elif result == "conflict":
            conflicts += 1

    moved_groups = migrate_group_docs(db, args.dry_run)

    # Refresh after renames.
    if not args.dry_run:
        live = list(db.collection("participants").stream())

    updated = created = 0
    for seat in wanted:
        snap = db.collection("participants").document(seat).get()
        if args.dry_run:
            apply_seat_record(db, auth, seat, True)
            continue
        existed = snap.exists
        apply_seat_record(db, auth, seat, False)
        if existed:
            updated += 1
        else:
            created += 1

    extras = []
    for doc in live:
        pid = normalize_seat_id(doc.id)
        if not is_seat_id(pid):
            continue
        if pid in SEAT_PASSWORDS:
            continue
        extras.append(pid)
        group = group_from_seat(pid)
        if args.dry_run:
            print(f"  額外座位 {pid}: 改組 {group}、顯示 {pid}（冇指定密碼）")
            continue
        db.collection("participants").document(pid).set({
            "participant_id": pid,
            "group_id": group,
            "display_name": pid,
        }, merge=True)

    if args.dry_run:
        print(f"\n[dry-run] 將改名 {renamed}，衝突 {conflicts}，組別文件 {moved_groups}")
        return

    print(
        f"\n完成：改名 {renamed}，衝突 {conflicts}，"
        f"更新 {updated}，新建 {created}，"
        f"額外座位 {len(extras)}，組別文件 {moved_groups}"
    )
    if conflicts:
        print("有衝突嘅舊編號（例如 1A 同 A1 同時存在）未自動刪除，請喺 Admin 名冊檢查。")
    print("參加者用座位編號 + 4 位密碼登入，例如 A1 / 8489。")


if __name__ == "__main__":
    main()
