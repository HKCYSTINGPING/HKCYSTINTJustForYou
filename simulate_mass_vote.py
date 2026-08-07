#!/usr/bin/env python3
"""
Simulate the whole room voting concurrently so you can watch the admin console.

Rules matched to the live app:
  - Each trophy may be given to at most one teammate (unique pairing).
  - The same teammate may receive more than one trophy from one voter.

Votes are submitted from several worker threads with random start delays, so
the admin counters tick up in overlapping bursts rather than a neat queue.

    python3 simulate_mass_vote.py
    python3 simulate_mass_vote.py --workers 12 --wave 8 --countdown 6
"""

import argparse
import random
import threading
import time
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed

CRED_DEFAULT = "/Users/waiwaichan212/Downloads/tnit-6c48d-firebase-adminsdk-fbsvc-4caec585e5.json"


def clear_collection(db, name):
    removed = 0
    while True:
        docs = list(db.collection(name).limit(400).stream())
        if not docs:
            break
        batch = db.batch()
        for doc in docs:
            batch.delete(doc.reference)
        batch.commit()
        removed += len(docs)
    return removed


def ballot_for(voter_id, teammates, trophies):
    """
    - Every trophy at most once.
    - Every teammate gets at least one trophy when trophies >= teammates.
    - Leftover trophies may stack onto the same person.
    """
    if not teammates or not trophies:
        return []

    pool = list(trophies)
    random.shuffle(pool)
    receivers = list(teammates)
    random.shuffle(receivers)

    # Not enough trophies to cover everyone (e.g. Staff): cover as many as we can.
    if len(pool) < len(receivers):
        return [
            {"receiver_id": receivers[i], "trophy_id": pool[i]}
            for i in range(len(pool))
        ]

    pairings = []
    for i, teammate in enumerate(receivers):
        pairings.append({"receiver_id": teammate, "trophy_id": pool[i]})

    leftover = pool[len(receivers):]
    if leftover:
        favorite = random.choice(teammates)
        for j, trophy_id in enumerate(leftover):
            # Bias extras onto one favorite so admins see multi-trophy cells.
            receiver = favorite if (j == 0 or random.random() < 0.6) else random.choice(teammates)
            pairings.append({"receiver_id": receiver, "trophy_id": trophy_id})

    seen = set()
    clean = []
    for pair in pairings:
        if pair["trophy_id"] in seen:
            continue
        seen.add(pair["trophy_id"])
        clean.append(pair)
    return clean


def main():
    parser = argparse.ArgumentParser(description="多線程模擬全員隨機投票")
    parser.add_argument("--credentials", default=CRED_DEFAULT)
    parser.add_argument("--countdown", type=int, default=6,
                        help="開始前倒數秒數，畀你時間打開 Admin")
    parser.add_argument("--workers", type=int, default=10,
                        help="同時投票嘅 worker 線程數（預設 10）")
    parser.add_argument("--wave", type=float, default=10.0,
                        help="每人隨機延遲 0～wave 秒先交票（預設 10）")
    parser.add_argument("--rounds", type=int, default=1,
                        help="連續模擬幾輪（每輪先清空再投，預設 1）")
    parser.add_argument("--clear-first", action="store_true", default=True)
    args = parser.parse_args()

    import firebase_admin
    from firebase_admin import credentials, firestore

    try:
        firebase_admin.get_app()
    except ValueError:
        firebase_admin.initialize_app(credentials.Certificate(args.credentials))
    db = firestore.client()

    participants = []
    for doc in db.collection("participants").stream():
        data = doc.to_dict() or {}
        group_id = data.get("group_id") or ""
        if "STAFF" in str(group_id).upper():
            continue
        participants.append({
            "participant_id": data.get("participant_id") or doc.id,
            "group_id": group_id,
        })
    participants.sort(key=lambda p: (p["group_id"], p["participant_id"]))

    if not participants:
        raise SystemExit("冇非 Staff 參加者可以模擬投票")

    trophies = []
    for doc in db.collection("trophies").stream():
        data = doc.to_dict() or {}
        tid = data.get("trophy_id") or doc.id
        if str(tid).upper().startswith("T"):
            trophies.append(tid)
    trophies.sort()

    by_group = defaultdict(list)
    for p in participants:
        by_group[p["group_id"]].append(p["participant_id"])

    print(f"參加者 {len(participants)} 人（已排除 Staff），獎項 {len(trophies)} 個")
    print(f"將用 {args.workers} 條線程、每人隨機 0–{args.wave:.0f}s 延遲交票")
    print()
    print("請而家打開 Admin → 投票：")
    print("  https://tomchan212.github.io/TNIT_For_you/")
    print("  admin / 23082026")
    print()

    rounds = max(1, int(getattr(args, "rounds", 1)))
    for round_i in range(1, rounds + 1):
        if rounds > 1:
            print()
            print(f"════ 第 {round_i}/{rounds} 輪 ════")
        for sec in range(args.countdown if round_i == 1 else min(3, args.countdown), 0, -1):
            print(f"  {sec} 秒後開始…", flush=True)
            time.sleep(1)

        deleted_sub = clear_collection(db, "submissions") if args.clear_first else 0
        deleted_res = clear_collection(db, "results") if args.clear_first else 0
        db.collection("config").document("voting").set({
            "voting_status": "VOTING_OPEN",
            "allow_resubmit": True,
            "calculated_at": "",
            "published_at": "",
            "fallback_activated": False,
        }, merge=True)
        print(f"已清空投票／結果（submissions={deleted_sub}, results={deleted_res}），投票已 OPEN")
        print("開始併發投票（只有 Group 1–6，Staff 唔投）：")

        print_lock = threading.Lock()
        done = {"n": 0}
        multi_trophy_voters = []
        t0 = time.time()

        def submit_one(person):
            delay = random.uniform(0, max(0.05, args.wave))
            time.sleep(delay)
            voter_id = person["participant_id"]
            teammates = [pid for pid in by_group[person["group_id"]] if pid != voter_id]
            pairings = ballot_for(voter_id, teammates, trophies)
            db.collection("submissions").document(voter_id).set({
                "participant_id": voter_id,
                "status": "submitted",
                "pairings": pairings,
                "updated_at": firestore.SERVER_TIMESTAMP,
                "submitted_at": firestore.SERVER_TIMESTAMP,
            })
            recv_counts = Counter(p["receiver_id"] for p in pairings)
            stacked = sum(1 for _, n in recv_counts.items() if n > 1)
            with print_lock:
                done["n"] += 1
                i = done["n"]
                stack_note = ""
                if stacked:
                    multi_trophy_voters.append(voter_id)
                    fav = recv_counts.most_common(1)[0]
                    stack_note = f" · {fav[0]} 獲 {fav[1]} 個 Trophy"
                print(
                    f"  [{i:02d}/{len(participants)}] +{delay:4.1f}s  "
                    f"{voter_id} ({person['group_id']}) · {len(pairings)} 票{stack_note}",
                    flush=True,
                )
            return voter_id

        errors = []
        with ThreadPoolExecutor(max_workers=max(1, args.workers)) as pool:
            futures = [pool.submit(submit_one, person) for person in participants]
            for fut in as_completed(futures):
                try:
                    fut.result()
                except Exception as err:
                    errors.append(str(err))
                    with print_lock:
                        print(f"  ERROR: {err}", flush=True)

        elapsed = time.time() - t0
        submitted = len(list(db.collection("submissions").stream()))
        print()
        print(f"完成第 {round_i} 輪：{submitted}/{len(participants)} 人已提交，用時 {elapsed:.1f}s")
        print(f"其中 {len(multi_trophy_voters)} 人將多於一個 Trophy 配畀同一隊友")
        if errors:
            print(f"錯誤 {len(errors)} 宗")

    print()
    print(f"全部 {rounds} 輪完成。Admin「已完成投票」同組別 matrix 應會即時跳動。")


if __name__ == "__main__":
    main()
