"""Shared fixtures and the Markdown report used in the project report (Cap. 10)."""
import datetime
import os

import pytest
import requests

from client import BASE_URL, User

REPORT = os.path.join(os.path.dirname(__file__), "report.md")
_rows = []


def pytest_configure(config):
    config.addinivalue_line("markers", "tst(*ids): test IDs of the report (Cap. 10)")


def pytest_sessionstart(session):
    try:
        requests.get(BASE_URL, verify=False, timeout=10)
    except requests.RequestException as e:
        pytest.exit(f"PictuRAS is not reachable at {BASE_URL} ({e}). "
                    "Start it with `docker compose up -d` first.", returncode=2)


# ------------------------------------------------------------------ users
def _user(kind):
    u = User(kind)
    yield u
    u.close()


@pytest.fixture(scope="session")
def free_user():
    yield from _user("free")


@pytest.fixture(scope="session")
def premium_user():
    yield from _user("premium")


@pytest.fixture(scope="session")
def other_user():
    yield from _user("free")


@pytest.fixture(scope="session")
def anon_user():
    yield from _user("anonymous")


@pytest.fixture
def fresh_free_user():
    """A new registered user (fresh daily quotas)."""
    yield from _user("free")


# ----------------------------------------------------------------- report
@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    rep = outcome.get_result()
    if rep.when == "call" or (rep.when == "setup" and rep.outcome != "passed"):
        ids = []
        for m in item.iter_markers("tst"):
            ids.extend(m.args)
        doc = (item.function.__doc__ or "").strip().splitlines()
        _rows.append({
            "ids": ", ".join(ids) or "—",
            "test": f"{os.path.basename(item.fspath)}::{item.name}",
            "desc": doc[0] if doc else "",
            "result": {"passed": "Passa", "failed": "Falha", "skipped": "Ignorado"}[rep.outcome],
            "secs": f"{rep.duration:.1f}",
            "detail": "" if rep.outcome == "passed" else str(rep.longrepr).splitlines()[-1][:200],
        })


def pytest_sessionfinish(session, exitstatus):
    if not _rows:
        return
    passed = sum(r["result"] == "Passa" for r in _rows)
    lines = [
        "# Resultados dos testes ponta a ponta",
        "",
        f"- Data: {datetime.datetime.now():%Y-%m-%d %H:%M}",
        f"- Alvo: {BASE_URL}",
        f"- Resultado: {passed}/{len(_rows)} testes passaram",
        "",
        "| ID(s) | Teste | Descrição | Resultado | Duração (s) | Detalhe |",
        "|---|---|---|---|---|---|",
    ]
    for r in _rows:
        lines.append(f"| {r['ids']} | `{r['test']}` | {r['desc']} | {r['result']} | {r['secs']} | {r['detail']} |")
    with open(REPORT, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
