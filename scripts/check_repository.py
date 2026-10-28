#!/usr/bin/env python3
"""Check files intended for publication without printing credential values."""

from __future__ import annotations

import re
import subprocess
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
MAX_FILE_BYTES = 50 * 1024 * 1024
MAX_TEXT_BYTES = 2 * 1024 * 1024
LOCAL_DIRECTORIES = {
    ".tools", ".venv", ".next", ".turbo", ".reasonix", "__pycache__", "node_modules",
}
LOCAL_PREFIXES = (
    "data/", "results/", "temp/", "univa/results/", "univa/logs/",
    "packages/remotion-compose/public/jobs/", "docs/assets/readme/collection/",
)
LOCAL_FILES = {
    "secrets.txt", "auth_config.json", "concat_list.txt",
    "univa/config/mcp_configs.json", "docs/assets/readme/editor-basics-acceptance.json",
}
TOKEN = re.compile(
    r"sk-(?:proj-|ant-)?[A-Za-z0-9_-]{20,}"
    r"|gh[pousr]_[A-Za-z0-9]{25,}|github_pat_[A-Za-z0-9_]{25,}"
    r"|AKIA[A-Z0-9]{16}"
    r"|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"
)
ASSIGNMENT = re.compile(
    r"(?i)\b([\w-]*(?:api[_-]?key|access[_-]?token|auth[_-]?token|secret|password))"
    r"[\"']?\s*[:=]\s*[\"']?([^\s\"',}#]+)"
)
MACHINE_PATH = re.compile(r"/(?:Users/[^/\s]+|home/u\d+[^/\s]*)/")
LINK = re.compile(r"\]\(([^)\s]+)\)|(?:src|href)=[\"']([^\"']+)[\"']")
DOCUMENTS = {
    "README.md", "README.zh-CN.md", "docs/local-setup-reference.md",
    "docs/local-setup-reference.zh-CN.md", "docs/showcase/index.html",
}


def git(*args: str) -> bytes:
    return subprocess.check_output(["git", *args], cwd=ROOT)


def local_file(name: str) -> bool:
    path = Path(name)
    if name.endswith("/.gitkeep"):
        return False
    return (
        bool(LOCAL_DIRECTORIES.intersection(path.parts))
        or name.startswith(LOCAL_PREFIXES)
        or name in LOCAL_FILES
        or (path.name.startswith(".env") and path.name != ".env.example")
        or path.suffix in {".log", ".pyc", ".tsbuildinfo", ".db"}
    )


def placeholder(value: str) -> bool:
    return bool(re.fullmatch(r"(?i)(?:sk-)?[x.*_-]+|your[\w-]*|dummy", value))


def inspect_text(name: str, raw: bytes, issues: set[str], *, staged: bool = False) -> None:
    if len(raw) > MAX_TEXT_BYTES or b"\0" in raw:
        return
    try:
        content = raw.decode("utf-8")
    except UnicodeDecodeError:
        return
    label = f"{name} (staged)" if staged else name
    for number, line in enumerate(content.splitlines(), 1):
        if any(not placeholder(match[0]) for match in TOKEN.finditer(line)):
            issues.add(f"{label}:{number}: possible credential; value withheld")
        if not line.lstrip().startswith(("#", "//")):
            for match in ASSIGNMENT.finditer(line):
                value = match[2]
                if (
                    len(value) >= 20
                    and re.fullmatch(r"[A-Za-z0-9_./+=-]+", value)
                    and not placeholder(value)
                    and not any(part in value.lower() for part in (
                        "example", "placeholder", "getenv", "environ", "process.env",
                        "config.", "settings.", "self.", "request.", "args.",
                    ))
                ):
                    issues.add(f"{label}:{number}: possible {match[1]}; value withheld")
        if Path(name).suffix in {".py", ".ts", ".tsx", ".json", ".toml"} and MACHINE_PATH.search(line):
            issues.add(f"{label}:{number}: machine-specific absolute path")


def inspect_links(name: str, publishable: set[str], issues: set[str]) -> None:
    content = (ROOT / name).read_text(encoding="utf-8")
    for match in LINK.finditer(content):
        target = urlsplit(next(group for group in match.groups() if group))
        if target.scheme or target.netloc or not target.path:
            continue
        path = ((ROOT / name).parent / unquote(target.path)).resolve()
        if not path.is_relative_to(ROOT):
            issues.add(f"{name}: link leaves repository")
        elif path.relative_to(ROOT).as_posix() not in publishable:
            issues.add(f"{name}: link target missing from publication: {target.path}")


def main() -> int:
    names = set(filter(None, git("ls-files", "--cached", "--others", "--exclude-standard", "-z").decode().split("\0")))
    publishable = {name for name in names if (ROOT / name).is_file()}
    issues: set[str] = set()
    ignored_tracked = git("ls-files", "--cached", "--ignored", "--exclude-standard", "-z").decode().split("\0")
    for name in filter(None, ignored_tracked):
        issues.add(f"{name}: local file is tracked despite ignore rules")
    total = 0
    for name in sorted(publishable):
        path = ROOT / name
        size = path.stat().st_size
        total += size
        if local_file(name):
            issues.add(f"{name}: local runtime file is in the publication set")
        if size > MAX_FILE_BYTES:
            issues.add(f"{name}: exceeds the repository's 50 MiB publication limit")
        if size <= MAX_TEXT_BYTES:
            inspect_text(name, path.read_bytes(), issues)
    # Catch a staged credential even if the working copy was subsequently cleaned.
    staged = git("diff", "--cached", "--name-only", "--diff-filter=ACM", "-z").decode().split("\0")
    for name in filter(None, staged):
        inspect_text(name, git("show", f":{name}"), issues, staged=True)
    for name in sorted(DOCUMENTS & publishable):
        inspect_links(name, publishable, issues)
    for issue in sorted(issues):
        print(f"FAIL {issue}")
    print(f"{'FAIL' if issues else 'PASS'}: {len(publishable)} publishable files, {total / 1024 / 1024:.1f} MiB; {len(issues)} issue(s)")
    return int(bool(issues))


if __name__ == "__main__":
    raise SystemExit(main())
