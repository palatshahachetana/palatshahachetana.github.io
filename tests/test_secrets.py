"""Fails the GitHub check if a secret is ever uploaded by mistake (AI key, teacher PIN, Google client secret)."""
import os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATTERNS = [(re.compile(r"AIza[0-9A-Za-z_\-]{30,}"), "Google API key"),
            (re.compile(r"GOCSPX-[0-9A-Za-z_\-]{10,}"), "Google OAuth client secret"),
            (re.compile(r"const\s+KEY\s*=\s*'[^']+'"), "Gemini key left in setGeminiKey"),
            (re.compile(r"const\s+NEW_PIN\s*=\s*'[^']+'"), "Teacher PIN left in setTeacherPin")]


def test_no_secrets_in_the_repository():
    found = []
    for base, dirs, files in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in (".git", "node_modules", "__pycache__")]
        for f in files:
            if f.endswith((".js", ".gs", ".html", ".md", ".json", ".py", ".yml", ".css", ".txt", ".webmanifest")) and f != "axe.min.js" and f != "three.min.js":
                path = os.path.join(base, f)
                text = open(path, encoding="utf-8", errors="ignore").read()
                for rx, what in PATTERNS:
                    if rx.search(text) and not path.endswith("test_secrets.py"):
                        found.append(f"{os.path.relpath(path, ROOT)}: {what}")
    assert found == [], "Remove these before uploading: " + "; ".join(found)
