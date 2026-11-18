"""Runs Code.gs inside Node with small fakes of Google's services, to test the security rules."""
import os, subprocess, json
HERE = os.path.dirname(os.path.abspath(__file__))


def test_apps_script_rules():
    r = subprocess.run(["node", os.path.join(HERE, "gs_harness.js")], capture_output=True, text=True, timeout=60)
    assert r.returncode == 0, r.stdout + r.stderr
    assert r.stdout.strip().endswith("ALL OK"), r.stdout
