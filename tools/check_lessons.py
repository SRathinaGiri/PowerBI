"""Fail if the lesson list in assets/site.js and the cards in index.html disagree.

A shared lessons.json was not used: pages must keep working when opened from disk,
and fetch() is blocked for file:// pages. Run from anywhere: python tools/check_lessons.py
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main() -> int:
    site = (ROOT / "assets/site.js").read_text(encoding="utf-8")
    index = (ROOT / "index.html").read_text(encoding="utf-8")
    registry = re.findall(r"path:\s*'([^']+)'", site)
    cards = re.findall(r'<a class="lesson" href="([^"]+)"', index)
    numbers = [int(n) for n in re.findall(r'<span class="lesson-num">(\d+)</span>', index)]
    problems = []

    if cards != registry:
        problems.append("index.html cards and site.js LESSONS differ in content or order:")
        problems += [f"  position {i + 1}: card {c}, registry {r}" for i, (c, r) in enumerate(zip(cards, registry)) if c != r]
        problems += [f"  only on the home page: {p}" for p in cards if p not in registry]
        problems += [f"  only in site.js: {p}" for p in registry if p not in cards]
    if numbers != list(range(1, len(cards) + 1)):
        problems.append(f"Lesson numbers on the home page are not 1 to {len(cards)}: {numbers}")
    problems += [f"Missing page: {p}" for p in registry if not (ROOT / p).is_file()]

    if problems:
        print("\n".join(problems))
        return 1
    print(f"OK: {len(registry)} lessons match")
    return 0


if __name__ == "__main__":
    sys.exit(main())
