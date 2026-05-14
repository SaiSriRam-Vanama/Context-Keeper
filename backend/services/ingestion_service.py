import os
import stat
import shutil
from collections import defaultdict
from git import Repo
from git.exc import GitCommandError
from github import Github
from datetime import datetime
import re

from config import settings

REPOS_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "repos"))
os.makedirs(REPOS_DIR, exist_ok=True)


INGESTION_STATUS: dict[str, dict] = {}


def _force_rm(func, path, exc_info):
    try:
        os.chmod(path, stat.S_IWRITE)
        func(path)
    except Exception:
        pass


def get_ingestion_status(repo_url: str) -> dict | None:
    key = repo_url.replace("https://github.com/", "").replace(".git", "").replace("/", "_")
    return INGESTION_STATUS.get(key)


def set_ingestion_status(repo_url: str, status: str, message: str = "", progress: int = 0):
    key = repo_url.replace("https://github.com/", "").replace(".git", "").replace("/", "_")
    INGESTION_STATUS[key] = {
        "repo_url": repo_url,
        "status": status,
        "message": message,
        "progress": progress
    }


def clone_repository(repo_url: str):
    repo_name = repo_url.replace("https://github.com/", "").replace(".git", "")
    safe_name = repo_name.replace("/", "_").replace(" ", "_")
    target_dir = os.path.join(REPOS_DIR, safe_name)
    if os.path.exists(target_dir):
        shutil.rmtree(target_dir, onerror=_force_rm)
    print(f"Cloning {repo_url} into {target_dir}...")
    try:
        Repo.clone_from(repo_url, target_dir)
    except GitCommandError as e:
        error_msg = str(e)
        if "128" in error_msg and "not found" in error_msg.lower():
            raise RuntimeError(
                f"Repository '{repo_url}' not found or is private. "
                "Make sure the URL is correct and the repo is public "
                "(or set GITHUB_TOKEN in .env for private repos)."
            )
        raise RuntimeError(f"Git clone failed: {error_msg[:300]}")
    print("Clone complete.")
    return target_dir


def fetch_issues(repo_name: str):
    token = settings.GITHUB_TOKEN
    g = Github(token) if token else Github()
    try:
        repo = g.get_repo(repo_name)
        issues = repo.get_issues(state='all')[:100]
        issue_data = []
        for issue in issues:
            issue_data.append({
                "id": issue.number,
                "title": issue.title,
                "body": issue.body if issue.body else "",
                "state": issue.state,
                "created_at": issue.created_at.isoformat() if issue.created_at else None,
                "closed_at": issue.closed_at.isoformat() if issue.closed_at else None,
                "is_pull_request": issue.pull_request is not None,
                "user": issue.user.login if issue.user else "Unknown"
            })
        print(f"Fetched {len(issue_data)} issues/PRs from {repo_name}.")
        return issue_data
    except Exception as e:
        print(f"Error fetching issues for {repo_name}: {e}")
        return []


def extract_timeline_data(repo_path: str, issue_data: list, force_refresh: bool = False) -> list:
    """Extract monthly commit/issue/PR activity with caching."""
    cache_file = os.path.join(repo_path, ".context_keeper_timeline.json")
    if not force_refresh and os.path.exists(cache_file):
        try:
            import json
            with open(cache_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception: pass

    timeline = defaultdict(lambda: {"commits": 0, "issues": 0, "prs": 0})
    try:
        repo = Repo(repo_path)
        for commit in repo.iter_commits('HEAD', max_count=1000):
            date_str = datetime.fromtimestamp(commit.committed_date).strftime('%Y-%m')
            timeline[date_str]["commits"] += 1
        for item in issue_data:
            if not item["created_at"]: continue
            date_str = item["created_at"][:7]
            if item["is_pull_request"]:
                timeline[date_str]["prs"] += 1
            else:
                timeline[date_str]["issues"] += 1
        formatted = []
        for date, counts in sorted(timeline.items()):
            formatted.append({
                "date": date,
                "commits": counts.get("commits", 0),
                "issues": counts.get("issues", 0),
                "prs": counts.get("prs", 0)
            })
    except Exception as e:
        print(f"Error extracting timeline: {e}")
        return []
    
    # Save to cache
    try:
        import json
        with open(os.path.join(repo_path, ".context_keeper_timeline.json"), 'w', encoding='utf-8') as f:
            json.dump(formatted[-24:], f)
    except Exception: pass

    return formatted[-24:]


def extract_contributor_data(repo_path: str, force_refresh: bool = False) -> list:
    """Identify top contributors and their expertise with caching."""
    cache_file = os.path.join(repo_path, ".context_keeper_contributors.json")
    if not force_refresh and os.path.exists(cache_file):
        try:
            import json
            with open(cache_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception: pass

    contributors = {}
    try:
        repo = Repo(repo_path)
        for commit in repo.iter_commits('HEAD', max_count=2000):
            author = commit.author.name
            email = commit.author.email
            user_id = f"{author}_{email}"
            if user_id not in contributors:
                contributors[user_id] = {"id": user_id, "name": author, "commits": 0, "extensions_touched": defaultdict(int)}
            contributors[user_id]["commits"] += 1
            for file_path in commit.stats.files.keys():
                ext = os.path.splitext(file_path)[1].lower()
                if ext:
                    contributors[user_id]["extensions_touched"][ext] += 1
        formatted = []
        for _, data in contributors.items():
            top_exts = sorted(data["extensions_touched"].items(), key=lambda x: x[1], reverse=True)[:3]
            expertise = [ext[0].replace('.', '') for ext in top_exts if ext[0]]
            expertise_labels = []
            for ext in expertise:
                if ext in ['js', 'ts', 'jsx', 'tsx', 'css', 'html']:
                    if "frontend" not in expertise_labels: expertise_labels.append("frontend")
                elif ext in ['py', 'go', 'rs', 'java', 'cpp', 'c']:
                    if "backend" not in expertise_labels: expertise_labels.append("backend")
                elif ext in ['yml', 'yaml', 'toml', 'json', 'dockerfile']:
                    if "devops" not in expertise_labels: expertise_labels.append("config/devops")
                else:
                    expertise_labels.append(ext)
            formatted.append({"id": data["id"], "name": data["name"], "commits": data["commits"], "expertise": list(set(expertise_labels))[:3]})
        result = sorted(formatted, key=lambda x: x["commits"], reverse=True)[:20]
        
        # Save to cache
        try:
            import json
            with open(os.path.join(repo_path, ".context_keeper_contributors.json"), 'w', encoding='utf-8') as f:
                json.dump(result, f)
        except Exception: pass
        
        return result
    except Exception as e:
        print(f"Error extracting contributors: {e}")
        return []


def extract_architecture_data(repo_path: str, force_refresh: bool = False) -> dict:
    """Build a clean, high-level component architecture map with caching."""
    cache_file = os.path.join(repo_path, ".context_keeper_arch.json")
    
    if not force_refresh and os.path.exists(cache_file):
        try:
            with open(cache_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass

    ignore_dirs = {'.git', 'node_modules', 'venv', '__pycache__', '.next',
                   'build', 'dist', 'coverage', '.vscode', '.idea', '.venv',
                   'egg-info', '.tox', '.mypy_cache', '.pytest_cache', 'env'}

    # ── 1. Inventory every source file ──────────────────────────────
    py_import_re = re.compile(
        r'^(?:from\s+([a-zA-Z0-9_\.]+)\s+import|import\s+([a-zA-Z0-9_\.]+))',
        re.MULTILINE,
    )
    js_import_re = re.compile(
        r'(?:import\s+.*?from\s+[\'"](.+?)[\'"]|require\([\'"](.+?)[\'"]\))'
    )

    # Map: component_name -> { files: [...], imports_raw: [...] }
    components: dict[str, dict] = {}
    root_files: list[dict] = []  # files sitting at the repo root

    for root, dirs, files in os.walk(repo_path):
        dirs[:] = [d for d in dirs if d.lower() not in ignore_dirs and not d.startswith('.')]
        for fname in files:
            ext = os.path.splitext(fname)[1].lower()
            if fname.startswith(".context_keeper_"): continue
            if ext not in {'.py', '.js', '.jsx', '.ts', '.tsx', '.json', '.yml',
                           '.yaml', '.md', '.html', '.css', '.java', '.go',
                           '.rs', '.c', '.cpp', '.h', '.toml', '.cfg'}:
                continue
            
            fpath = os.path.join(root, fname)
            rel = os.path.relpath(fpath, repo_path).replace("\\", "/")
            parts = rel.split("/")

            # Determine which component this file belongs to
            comp_name = parts[0] if len(parts) > 1 else "_root"
            if comp_name not in components:
                components[comp_name] = {"files": [], "extensions": set(), "imports_raw": [], "mentions": set()}

            components[comp_name]["files"].append(rel)
            components[comp_name]["extensions"].add(ext)

            # Parse imports and fuzzy mentions (only code files)
            if ext in {'.py', '.js', '.jsx', '.ts', '.tsx'}:
                try:
                    with open(fpath, 'r', encoding='utf-8', errors='ignore') as f_in:
                        content = f_in.read(12000)
                        content_lower = content.lower()
                    
                    # 1. Regex imports
                    if ext == '.py':
                        for m in py_import_re.finditer(content):
                            imp = m.group(1) or m.group(2)
                            if imp: components[comp_name]["imports_raw"].append(imp)
                    else:
                        for m in js_import_re.finditer(content):
                            imp = m.group(1) or m.group(2)
                            if imp: components[comp_name]["imports_raw"].append(imp)
                    
                    # 2. Store content for later fuzzy mention check (to avoid multiple passes)
                    components[comp_name]["_temp_content"] = components[comp_name].get("_temp_content", "") + " " + content_lower
                except Exception: pass


    # ── 2. Classify each component ──────────────────────────────────
    ROLE_MAP = {
        "frontend": {"frontend", "client", "web", "app", "ui", "pages", "components", "views", "public", "static"},
        "backend":  {"backend", "server", "api", "routes", "controllers", "handlers", "services", "core", "lib"},
        "database": {"db", "database", "models", "migrations", "schemas", "prisma", "orm"},
        "config":   {"config", "configs", "settings", "env", "infra", "infrastructure", "deploy", "deployment", "terraform", "k8s", "helm"},
        "tests":    {"tests", "test", "spec", "specs", "__tests__", "e2e", "integration"},
        "docs":     {"docs", "documentation", "doc", "wiki"},
        "scripts":  {"scripts", "tools", "bin", "cli", "cmd"},
    }
    EXT_HINTS = {
        "frontend": {'.jsx', '.tsx', '.css', '.html', '.vue', '.svelte'},
        "backend":  {'.py', '.go', '.rs', '.java', '.rb'},
        "config":   {'.yml', '.yaml', '.toml', '.cfg'},
        "docs":     {'.md', '.rst', '.txt'},
    }

    def classify(name: str, exts: set[str]) -> str:
        low = name.lower()
        for role, keywords in ROLE_MAP.items():
            if low in keywords:
                return role
        # Fallback: majority extension heuristic
        for role, role_exts in EXT_HINTS.items():
            if exts & role_exts:
                return role
        return "module"

    ROLE_COLORS = {
        "frontend": "#8b5cf6",   # purple
        "backend":  "#3b82f6",   # blue
        "database": "#f59e0b",   # amber
        "config":   "#6b7280",   # gray
        "tests":    "#10b981",   # emerald
        "docs":     "#64748b",   # slate
        "scripts":  "#f97316",   # orange
        "module":   "#06b6d4",   # cyan
    }

    ROLE_LABELS = {
        "frontend": "🖥️  Frontend",
        "backend":  "⚙️  Backend",
        "database": "🗄️  Database",
        "config":   "🔧  Config",
        "tests":    "🧪  Tests",
        "docs":     "📄  Docs",
        "scripts":  "📜  Scripts",
        "module":   "📦  Module",
    }

    # ── 3. Build nodes ──────────────────────────────────────────────
    # Merge _root files into a "Root Config" pseudo-component if small
    if "_root" in components:
        root_comp = components.pop("_root")
        root_label = "Root / Config"
        components["_root_config"] = root_comp
        components["_root_config"]["_override_label"] = root_label
        components["_root_config"]["_override_role"] = "config"

    # Sort by file count descending for layout importance
    sorted_comps = sorted(components.items(), key=lambda x: len(x[1]["files"]), reverse=True)

    # Limit to top 15 components for readability
    if len(sorted_comps) > 15:
        others_files = []
        others_exts: set[str] = set()
        for _, data in sorted_comps[14:]:
            others_files.extend(data["files"])
            others_exts.update(data["extensions"])
        sorted_comps = sorted_comps[:14]
        sorted_comps.append(("_others", {
            "files": others_files, "extensions": others_exts,
            "imports_raw": [], "_override_label": f"Other ({len(others_files)} files)",
            "_override_role": "module"
        }))

    nodes = []
    node_id_map: dict[str, str] = {}  # comp_name -> node_id
    comp_names = set()

    # Arrange in a clean grid layout
    cols = 4
    x_gap, y_gap = 300, 200

    for idx, (comp_name, data) in enumerate(sorted_comps):
        nid = f"comp_{idx}"
        node_id_map[comp_name] = nid
        comp_names.add(comp_name)

        role = data.get("_override_role") or classify(comp_name, data["extensions"])
        color = ROLE_COLORS.get(role, "#06b6d4")
        role_label = ROLE_LABELS.get(role, "📦  Module")
        display_name = data.get("_override_label") or comp_name
        file_count = len(data["files"])

        # Determine key files (entry points)
        key_files = []
        for f in data["files"][:5]:
            key_files.append(f.split("/")[-1])

        col = idx % cols
        row = idx // cols

        nodes.append({
            "id": nid,
            "position": {"x": col * x_gap + 50, "y": row * y_gap + 50},
            "data": {
                "label": display_name,
                "role": role,
                "roleLabel": role_label,
                "color": color,
                "fileCount": file_count,
                "keyFiles": key_files[:4],
            },
        })

    # ── 4. Build edges (inter-component dependencies) ───────────────
    edges = []
    seen_edge_pairs: set[tuple[str, str]] = set()

    for comp_name, data in sorted_comps:
        src_id = node_id_map.get(comp_name)
        if not src_id: continue
        
        # Collect all raw imports from this component
        raw_imports = set(data.get("imports_raw", []))
        
        for imp in raw_imports:
            # Clean import for comparison
            imp_norm = imp.lower().replace("\\", "/").strip("./@ ")
            imp_parts = imp_norm.split("/")
            
            # Check if any other component matches this import
            for other_name in comp_names:
                if other_name == comp_name or other_name in ["_root_config", "_others"]:
                    continue
                
                other_norm = other_name.lower()
                
                # Check for relative imports (e.g. "../services")
                is_relative = imp.startswith(".")
                resolved_imp = imp_norm
                if is_relative:
                    # Resolve relative path against first file's directory
                    file_dir = "/".join(data["files"][0].split("/")[:-1])
                    if imp.startswith("./"):
                        resolved_imp = (file_dir + "/" + imp_norm[2:]).strip("/")
                    elif imp.startswith("../"):
                        up_levels = imp.count("../")
                        dir_parts = file_dir.split("/")
                        if len(dir_parts) >= up_levels:
                            resolved_imp = ("/".join(dir_parts[:-up_levels]) + "/" + imp_norm.replace("../", "")).strip("/")
                
                # 1. Path-based resolution (imports)
                is_match = (
                    resolved_imp == other_norm or 
                    resolved_imp.startswith(f"{other_norm}/") or
                    other_norm in imp_parts or
                    resolved_imp.split(".")[0] == other_norm
                )
                
                # 2. Fuzzy fallback (mentions in imports)
                if not is_match and other_norm in imp_norm:
                    is_match = True

                if is_match:
                    tgt_id = node_id_map.get(other_name)
                    if tgt_id and (src_id, tgt_id) not in seen_edge_pairs:
                        seen_edge_pairs.add((src_id, tgt_id))
                        edges.append({
                            "id": f"e_{src_id}_{tgt_id}",
                            "source": src_id,
                            "target": tgt_id,
                            "label": "uses",
                        })

        # 3. Full-text mentions (Service Discovery)
        content_blob = data.get("_temp_content", "")
        for other_name in comp_names:
            if other_name == comp_name or other_name in ["_root_config", "_others"]:
                continue
            
            # If the other component name appears in our code blob, it's a likely dependency
            if other_name.lower() in content_blob:
                tgt_id = node_id_map.get(other_name)
                if tgt_id and (src_id, tgt_id) not in seen_edge_pairs:
                    seen_edge_pairs.add((src_id, tgt_id))
                    edges.append({
                        "id": f"f_{src_id}_{tgt_id}",
                        "source": src_id,
                        "target": tgt_id,
                        "label": "uses",
                    })


    # ── 5. Generate a summary ───────────────────────────────────────
    total_files = sum(len(d["files"]) for _, d in sorted_comps)
    comp_summary = []
    for comp_name, data in sorted_comps:
        role = data.get("_override_role") or classify(comp_name, data["extensions"])
        label = data.get("_override_label") or comp_name
        comp_summary.append(f"{label} ({role}, {len(data['files'])} files)")

    summary = (
        f"This repository contains {total_files} source files organized into "
        f"{len(sorted_comps)} main components: {', '.join(comp_summary[:8])}."
    )
    if len(comp_summary) > 8:
        summary += f" And {len(comp_summary) - 8} more."

    result = {"nodes": nodes, "edges": edges, "summary": summary}
    
    # Save to cache
    try:
        import json
        with open(os.path.join(repo_path, ".context_keeper_arch.json"), 'w', encoding='utf-8') as f:
            json.dump(result, f)
    except Exception:
        pass

    return result

