#!/usr/bin/env python3
"""Synthetic graph for the brain mock.

This is not a vault export. Ids are integers. Groups are integers 0–3.
No titles, paths, folder names, or note text are written.
"""

import json
import random
from pathlib import Path

SEED = 20261102
OUT = Path(__file__).with_name("graph.json")

# Four coarse groups. Sizes are uneven on purpose. The lists are sub-clusters
# used only while generating edges. They are not stored.
GROUPS = [
    [240, 190, 170, 150, 110],
    [180, 150, 130, 110, 70],
    [140, 110, 100, 70],
    [110, 90, 80],
]


def main():
    rng = random.Random(SEED)
    degree = {}
    seen = set()
    links = []
    nodes = []
    subs_by_group = []

    def connect(a, b):
        if a == b:
            return False
        if a > b:
            a, b = b, a
        key = (a, b)
        if key in seen:
            return False
        seen.add(key)
        links.append((a, b))
        degree[a] = degree.get(a, 0) + 1
        degree[b] = degree.get(b, 0) + 1
        return True

    def pick(present):
        total = 0
        for node in present:
            total += degree.get(node, 0)
        if total <= 0:
            return rng.choice(present)
        roll = rng.randrange(total)
        acc = 0
        for node in present:
            acc += degree.get(node, 0)
            if roll < acc:
                return node
        return present[-1]

    nid = 0
    for group, sizes in enumerate(GROUPS):
        subs = []
        for size in sizes:
            ids = list(range(nid, nid + size))
            nid += size
            for node in ids:
                nodes.append((node, group))
                degree.setdefault(node, 0)
            present = [ids[0]]
            for node in ids[1:]:
                connect(node, pick(present))
                if rng.random() < 0.38:
                    window = present[max(0, len(present) - 8):]
                    connect(node, rng.choice(window))
                present.append(node)
            ranked = sorted(ids, key=lambda node: degree[node], reverse=True)
            for hub in ranked[:2]:
                for _ in range(26):
                    connect(hub, rng.choice(ids))
            subs.append(ids)
        for i, left in enumerate(subs):
            for j in range(i + 1, len(subs)):
                right = subs[j]
                count = 12 if j == i + 1 else 4
                for _ in range(count):
                    connect(rng.choice(left), rng.choice(right))
        subs_by_group.append([node for sub in subs for node in sub])

    def endpoint(ids):
        if rng.random() < 0.65:
            return pick(ids)
        return rng.choice(ids)

    bridges = [(0, 1, 34), (0, 2, 20), (0, 3, 12), (1, 2, 16), (1, 3, 9), (2, 3, 7)]
    for a, b, count in bridges:
        left = subs_by_group[a]
        right = subs_by_group[b]
        for _ in range(count):
            connect(endpoint(left), endpoint(right))
    for _ in range(10):
        a, b = rng.sample(range(len(subs_by_group)), 2)
        connect(rng.choice(subs_by_group[a]), rng.choice(subs_by_group[b]))

    # Shuffle ids so a group is not a contiguous id range.
    order = list(range(nid))
    rng.shuffle(order)
    remap = {old: new for new, old in enumerate(order)}
    group_of = {remap[old]: group for old, group in nodes}
    out_nodes = [{"id": i, "g": group_of[i]} for i in range(nid)]
    out_links = [{"s": remap[a], "t": remap[b]} for a, b in links]
    out_links.sort(key=lambda link: (link["s"], link["t"]))

    parent = list(range(nid))

    def find(node):
        while parent[node] != node:
            parent[node] = parent[parent[node]]
            node = parent[node]
        return node

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[rb] = ra

    for link in out_links:
        union(link["s"], link["t"])
    components = len({find(i) for i in range(nid)})
    if components != 1:
        raise SystemExit(f"expected 1 component, found {components}")

    data = {"v": 1, "nodes": out_nodes, "links": out_links}
    raw = json.dumps(data, separators=(",", ":"))
    allowed = set('0123456789{}[]",:vnodeslinkidgst')
    extra = sorted(set(raw) - allowed)
    if extra:
        raise SystemExit(f"disallowed characters: {extra}")
    OUT.write_text(raw + "\n")

    degrees = [0] * nid
    cross = 0
    for link in out_links:
        degrees[link["s"]] += 1
        degrees[link["t"]] += 1
        if group_of[link["s"]] != group_of[link["t"]]:
            cross += 1
    ordered = sorted(degrees)
    mean = sum(degrees) / nid
    print(f"nodes {nid}")
    print(f"links {len(out_links)}")
    print(f"cross {cross}")
    print(f"degree min {ordered[0]} median {ordered[nid // 2]} max {ordered[-1]} mean {mean:.2f}")
    print(f"bytes {OUT.stat().st_size}")


if __name__ == "__main__":
    main()
