#!/usr/bin/env python3
"""Sichere Bridge vom Software-Repository zur offiziellen Obsidian CLI.

Keine direkten Dateisystem-Schreibzugriffe auf den Vault. Schreibziele werden aus einer
projektlokalen .claude/wiki-docs.json berechnet und strikt begrenzt.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path, PurePosixPath
from typing import Iterable

CONFIG_REL = Path('.claude/wiki-docs.json')
MANAGED_MARKER_RE = re.compile(r'(?m)^managed_by:\s*["\']?projekt-dokumentieren["\']?\s*$')
PUBLISH_FALSE_RE = re.compile(r'(?m)^publish:\s*false\s*$')
INVALID_NAME_RE = re.compile(r'[<>:"/\\|?*]')
STATE_MAP = {'active': 'Active', 'incubator': 'Incubator', 'archive': 'Archive', 'archived': 'Archive'}
DEFAULT_READ_ROOTS = ['10 Wiki', '40 Collections', '90 Meta/MOCs']
ALLOWED_READ_ROOTS = tuple(DEFAULT_READ_ROOTS)
ALLOWED_HANDOFF_ROOT = '00 Inbox/Imports'
CHUNK_SIZE = 16000


class BridgeError(RuntimeError):
    pass


def run(cmd: list[str], *, cwd: Path | None = None, check: bool = True) -> subprocess.CompletedProcess[str]:
    cp = subprocess.run(cmd, cwd=cwd, text=True, capture_output=True)
    if check and cp.returncode != 0:
        detail = (cp.stderr or cp.stdout or '').strip()
        raise BridgeError(f"Befehl fehlgeschlagen ({cp.returncode}): {' '.join(cmd[:3])}\n{detail}")
    return cp


def git_root(start: Path) -> Path:
    cp = run(['git', 'rev-parse', '--show-toplevel'], cwd=start, check=False)
    if cp.returncode == 0 and cp.stdout.strip():
        return Path(cp.stdout.strip()).resolve()
    return start.resolve()


def git_value(root: Path, args: list[str]) -> str:
    cp = run(['git', *args], cwd=root, check=False)
    return cp.stdout.strip() if cp.returncode == 0 else ''


def normalize_root(value: str) -> str:
    p = PurePosixPath(value.strip().replace('\\', '/'))
    if p.is_absolute() or '..' in p.parts:
        raise BridgeError(f'Ungueltiger Vault-Pfad: {value}')
    return p.as_posix().strip('/')


def safe_project_name(value: str) -> str:
    value = value.strip()
    if not value:
        raise BridgeError('project_name ist leer und konnte nicht abgeleitet werden')
    if value in {'.', '..'} or '/' in value or '\\' in value:
        raise BridgeError('project_name darf keine Pfadtrenner enthalten')
    value = INVALID_NAME_RE.sub('-', value).rstrip(' .')
    if not value:
        raise BridgeError('project_name ist nach Bereinigung leer')
    return value


@dataclass(frozen=True)
class Context:
    repo: Path
    config_path: Path
    vault: str
    project_name: str
    project_state: str
    documentation_folder: str
    handoff_root: str
    read_roots: tuple[str, ...]

    @property
    def project_base(self) -> str:
        return f'20 Projects/{self.project_state}/{self.project_name}'

    @property
    def docs_base(self) -> str:
        return f'{self.project_base}/{self.documentation_folder}'

    @property
    def handoff_base(self) -> str:
        return f'{self.handoff_root}/{self.project_name}'

    @property
    def project_index(self) -> str:
        return f'{self.project_base}/{self.project_name}.md'


def load_context(start: Path) -> Context:
    repo = git_root(start)
    env_cfg = os.environ.get('OBSIDIAN_WIKI_CONFIG')
    cfg_path = Path(env_cfg).expanduser().resolve() if env_cfg else (repo / CONFIG_REL)
    if not cfg_path.exists():
        raise BridgeError(
            f'Konfiguration fehlt: {cfg_path}\n'
            'Kopiere wiki-docs.example.json nach .claude/wiki-docs.json und setze mindestens "vault".'
        )
    try:
        cfg = json.loads(cfg_path.read_text(encoding='utf-8'))
    except Exception as exc:
        raise BridgeError(f'Konfiguration kann nicht gelesen werden: {exc}') from exc

    vault = str(cfg.get('vault', '')).strip()
    if not vault:
        raise BridgeError('In .claude/wiki-docs.json fehlt "vault".')

    project_name = safe_project_name(str(cfg.get('project_name') or repo.name))
    raw_state = str(cfg.get('project_state', 'Active')).strip()
    state = STATE_MAP.get(raw_state.lower(), raw_state)
    if state not in {'Active', 'Incubator', 'Archive'}:
        raise BridgeError('project_state muss Active, Incubator oder Archive sein.')

    doc_folder = normalize_root(str(cfg.get('documentation_folder', 'Documentation')))
    if '/' in doc_folder or not doc_folder:
        raise BridgeError('documentation_folder muss ein einzelner Ordnername sein.')
    handoff_root = normalize_root(str(cfg.get('handoff_root', ALLOWED_HANDOFF_ROOT)))
    if not path_under(handoff_root, (ALLOWED_HANDOFF_ROOT,)):
        raise BridgeError(f'handoff_root muss unter {ALLOWED_HANDOFF_ROOT} liegen.')

    roots_raw = cfg.get('read_roots', DEFAULT_READ_ROOTS)
    if not isinstance(roots_raw, list) or not roots_raw:
        raise BridgeError('read_roots muss eine nichtleere Liste sein.')
    read_roots = tuple(normalize_root(str(x)) for x in roots_raw)
    for root in read_roots:
        if not path_under(root, ALLOWED_READ_ROOTS):
            raise BridgeError(
                'read_roots darf nur Teilbereiche der fest eingebauten Allowlist verwenden: ' +
                ', '.join(ALLOWED_READ_ROOTS)
            )

    return Context(repo, cfg_path, vault, project_name, state, doc_folder, handoff_root, read_roots)


def obsidian(ctx: Context, *args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    exe = shutil.which('obsidian')
    if not exe:
        raise BridgeError('Obsidian CLI nicht gefunden (Befehl "obsidian").')
    return run([exe, f'vault={ctx.vault}', *args], cwd=ctx.repo, check=check)


def repository_id(ctx: Context) -> str:
    roots_raw = git_value(ctx.repo, ['rev-list', '--max-parents=0', 'HEAD'])
    roots = sorted(x.strip() for x in roots_raw.splitlines() if x.strip())
    if roots:
        digest = hashlib.sha256('\n'.join(roots).encode('ascii')).hexdigest()[:20]
        return f'git-{digest}'
    digest = hashlib.sha256(str(ctx.repo).encode('utf-8')).hexdigest()[:20]
    return f'path-{digest}'


def git_metadata(ctx: Context) -> dict:
    commit = git_value(ctx.repo, ['rev-parse', 'HEAD'])
    branch = git_value(ctx.repo, ['branch', '--show-current'])
    status = git_value(ctx.repo, ['status', '--porcelain'])
    return {
        'repository_root': str(ctx.repo),
        'project_name': ctx.project_name,
        'project_state': ctx.project_state,
        'repository_id': repository_id(ctx),
        'vault': ctx.vault,
        'project_base': ctx.project_base,
        'documentation_base': ctx.docs_base,
        'handoff_base': ctx.handoff_base,
        'git_commit': commit,
        'git_commit_short': commit[:12] if commit else '',
        'git_branch': branch,
        'git_dirty': bool(status),
        'documented_at': date.today().isoformat(),
    }


# Die Obsidian CLI meldet eine fehlende Datei nicht ueber den Rueckgabewert, sondern schreibt
# `Error: File "<pfad>" not found.` nach stdout und beendet sich mit 0 (gemessen am 2026-09-10 mit
# der CLI unter /usr/local/bin/obsidian). Ohne diese Erkennung gilt jede noch nicht existierende
# Datei als vorhanden und unverwaltet: write-doc verweigert die Erstellung, ensure-index meldet
# "UNVERAENDERT" ohne etwas zu schreiben, und handoff_name laeuft in eine Endlosschleife, weil kein
# Kandidat je frei ist.
NOT_FOUND_RE = re.compile(r'^Error: (File|Folder) "[^"]*" not found\.\s*$')


def read_optional(ctx: Context, path: str) -> str | None:
    cp = obsidian(ctx, 'read', f'path={path}', check=False)
    if cp.returncode != 0:
        return None
    if NOT_FOUND_RE.match(cp.stdout.strip()):
        return None
    return cp.stdout


def path_under(path: str, roots: Iterable[str]) -> bool:
    norm = normalize_root(path)
    return any(norm == root or norm.startswith(root.rstrip('/') + '/') for root in roots)


def require_readable(ctx: Context, path: str) -> str:
    norm = normalize_root(path)
    roots = (*ctx.read_roots, ctx.project_base, ctx.handoff_base)
    if not path_under(norm, roots):
        raise BridgeError('Lesepfad liegt ausserhalb der erlaubten Vault-Bereiche.')
    return norm


def require_doc_relative(ctx: Context, relative: str) -> str:
    rel = normalize_root(relative)
    if not rel.lower().endswith('.md'):
        raise BridgeError('write-doc akzeptiert nur .md-Dateien.')
    if rel.startswith('/') or '..' in PurePosixPath(rel).parts:
        raise BridgeError('Ungueltiger relativer Dokumentationspfad.')
    return f'{ctx.docs_base}/{rel}'


def frontmatter_value(content: str, key: str) -> str | None:
    match = re.search(rf'(?m)^{re.escape(key)}:\s*["\']?([^"\'\n]+)["\']?\s*$', content)
    return match.group(1).strip() if match else None


def validate_content(ctx: Context, content: str, *, managed_required: bool = False, provenance_required: bool = False) -> None:
    if not PUBLISH_FALSE_RE.search(content):
        raise BridgeError('Sicherheitsregel: zu schreibender Inhalt muss "publish: false" enthalten.')
    if managed_required and not MANAGED_MARKER_RE.search(content):
        raise BridgeError('Generierte Dokumentation muss "managed_by: projekt-dokumentieren" enthalten.')
    if provenance_required:
        expected_repo = repository_id(ctx)
        if frontmatter_value(content, 'source_repository_id') != expected_repo:
            raise BridgeError(f'source_repository_id muss dem aktuellen Repository entsprechen: {expected_repo}')
        if frontmatter_value(content, 'source_project') != ctx.project_name:
            raise BridgeError(f'source_project muss dem konfigurierten Projektnamen entsprechen: {ctx.project_name}')


def write_chunks(ctx: Context, path: str, content: str, *, overwrite: bool) -> None:
    chunks = [content[i:i + CHUNK_SIZE] for i in range(0, len(content), CHUNK_SIZE)] or ['']
    first = ['create', f'path={path}', f'content={chunks[0]}']
    if overwrite:
        first.append('overwrite')
    obsidian(ctx, *first)
    for chunk in chunks[1:]:
        obsidian(ctx, 'append', f'path={path}', f'content={chunk}', 'inline')


def cmd_preflight(ctx: Context) -> int:
    name = obsidian(ctx, 'vault', 'info=name').stdout.strip()
    meta = git_metadata(ctx)
    print('OK: Obsidian CLI erreichbar.')
    print(f'Vault: {name or ctx.vault}')
    print(f'Projekt: {ctx.project_name}')
    print(f'Ziel: {ctx.project_base}')
    print(f'Commit: {meta["git_commit_short"] or "kein Git-Commit"}')
    print(f'Working Tree dirty: {str(meta["git_dirty"]).lower()}')
    return 0


def cmd_search(ctx: Context, query: str, limit: int) -> int:
    if not query.strip():
        raise BridgeError('Leere Suchabfrage.')
    seen: set[str] = set()
    rows: list[dict] = []
    per_root = max(1, min(limit, 50))
    for root in ctx.read_roots:
        cp = obsidian(ctx, 'search', f'query={query}', f'path={root}', f'limit={per_root}', 'format=json', check=False)
        if cp.returncode != 0 or not cp.stdout.strip():
            continue
        try:
            data = json.loads(cp.stdout)
        except json.JSONDecodeError:
            data = [x.strip() for x in cp.stdout.splitlines() if x.strip()]
        if not isinstance(data, list):
            data = [data]
        for item in data:
            if isinstance(item, str):
                path = item
                obj = {'path': item}
            elif isinstance(item, dict):
                path = str(item.get('path') or item.get('file') or item.get('name') or item)
                obj = item
            else:
                path = str(item)
                obj = {'value': item}
            key = path.casefold()
            if key not in seen:
                seen.add(key)
                rows.append(obj)
            if len(rows) >= limit:
                break
        if len(rows) >= limit:
            break
    print(json.dumps(rows[:limit], ensure_ascii=False, indent=2))
    return 0


def cmd_read(ctx: Context, path: str) -> int:
    norm = require_readable(ctx, path)
    cp = obsidian(ctx, 'read', f'path={norm}')
    sys.stdout.write(cp.stdout)
    return 0


def cmd_write_doc(ctx: Context, relative: str, content_file: Path) -> int:
    path = require_doc_relative(ctx, relative)
    content = content_file.read_text(encoding='utf-8')
    validate_content(ctx, content, managed_required=True, provenance_required=True)
    existing = read_optional(ctx, path)
    if existing is not None and not MANAGED_MARKER_RE.search(existing):
        raise BridgeError(f'Verweigert: bestehende Datei ist nicht als verwaltet markiert: {path}')
    if existing is not None:
        existing_repo = frontmatter_value(existing, 'source_repository_id')
        if existing_repo != repository_id(ctx):
            label = existing_repo or 'keine Kennung'
            raise BridgeError(f'Verweigert: Datei gehoert zu einem anderen oder unbekannten Repository ({label}).')
    write_chunks(ctx, path, content, overwrite=existing is not None)
    print(('AKTUALISIERT: ' if existing is not None else 'ERSTELLT: ') + path)
    return 0


def cmd_ensure_index(ctx: Context, content_file: Path) -> int:
    content = content_file.read_text(encoding='utf-8')
    validate_content(ctx, content, managed_required=False, provenance_required=False)
    existing = read_optional(ctx, ctx.project_index)
    if existing is not None:
        print(f'UNVERAENDERT: {ctx.project_index}')
        return 0
    write_chunks(ctx, ctx.project_index, content, overwrite=False)
    print(f'ERSTELLT: {ctx.project_index}')
    return 0


def handoff_name(ctx: Context) -> str:
    meta = git_metadata(ctx)
    stamp = date.today().isoformat()
    sha = meta['git_commit_short'] or 'no-git'
    base = f'{stamp} -- {ctx.project_name} -- {sha} -- Wissens-Kandidaten.md'
    candidate = f'{ctx.handoff_base}/{base}'
    if read_optional(ctx, candidate) is None:
        return candidate
    counter = 2
    while True:
        candidate = f'{ctx.handoff_base}/{stamp} -- {ctx.project_name} -- {sha} -- Wissens-Kandidaten-{counter}.md'
        if read_optional(ctx, candidate) is None:
            return candidate
        counter += 1


def cmd_handoff(ctx: Context, content_file: Path) -> int:
    content = content_file.read_text(encoding='utf-8')
    validate_content(ctx, content, managed_required=False, provenance_required=True)
    path = handoff_name(ctx)
    write_chunks(ctx, path, content, overwrite=False)
    print(f'ERSTELLT: {path}')
    return 0


def cmd_unresolved(ctx: Context, project_only: bool) -> int:
    cp = obsidian(ctx, 'unresolved', 'verbose', 'format=tsv', check=False)
    if cp.returncode != 0:
        detail = (cp.stderr or cp.stdout).strip()
        raise BridgeError('Obsidian unresolved fehlgeschlagen: ' + detail)
    lines = cp.stdout.splitlines()
    if project_only:
        needle = ctx.project_base.casefold()
        lines = [line for line in lines if needle in line.casefold()]
    if lines:
        print('\n'.join(lines))
        return 1
    print('Keine ungelösten Links im aktuellen Projekt gefunden.' if project_only else 'Keine ungelösten Links gefunden.')
    return 0


def build_parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(description='Sichere Obsidian-CLI-Bridge fuer Softwareprojekt-Dokumentation')
    sub = ap.add_subparsers(dest='command', required=True)
    sub.add_parser('preflight')
    sub.add_parser('metadata')
    p = sub.add_parser('search'); p.add_argument('--query', required=True); p.add_argument('--limit', type=int, default=12)
    p = sub.add_parser('read'); p.add_argument('--path', required=True)
    p = sub.add_parser('write-doc'); p.add_argument('--relative', required=True); p.add_argument('--content-file', required=True, type=Path)
    p = sub.add_parser('ensure-index'); p.add_argument('--content-file', required=True, type=Path)
    p = sub.add_parser('handoff'); p.add_argument('--content-file', required=True, type=Path)
    p = sub.add_parser('unresolved'); p.add_argument('--project-only', action='store_true')
    return ap


def main() -> int:
    args = build_parser().parse_args()
    try:
        ctx = load_context(Path.cwd())
        if args.command == 'preflight': return cmd_preflight(ctx)
        if args.command == 'metadata':
            print(json.dumps(git_metadata(ctx), ensure_ascii=False, indent=2)); return 0
        if args.command == 'search': return cmd_search(ctx, args.query, max(1, args.limit))
        if args.command == 'read': return cmd_read(ctx, args.path)
        if args.command == 'write-doc': return cmd_write_doc(ctx, args.relative, args.content_file)
        if args.command == 'ensure-index': return cmd_ensure_index(ctx, args.content_file)
        if args.command == 'handoff': return cmd_handoff(ctx, args.content_file)
        if args.command == 'unresolved': return cmd_unresolved(ctx, args.project_only)
        raise BridgeError(f'Unbekannter Befehl: {args.command}')
    except BridgeError as exc:
        print(f'FEHLER: {exc}', file=sys.stderr)
        return 2
    except FileNotFoundError as exc:
        print(f'FEHLER: Datei nicht gefunden: {exc}', file=sys.stderr)
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
