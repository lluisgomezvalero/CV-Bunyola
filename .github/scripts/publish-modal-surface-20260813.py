from pathlib import Path

VERSION_OLD = "20260813i"
VERSION_NEW = "20260813j"

config = Path("supabase-config.js")
text = config.read_text(encoding="utf-8")
text = text.replace(f"window.VOLLEY_ASSET_VERSION = '{VERSION_OLD}';", f"window.VOLLEY_ASSET_VERSION = '{VERSION_NEW}';")
needle = "'mobile-modal-balance-20260813.js?v=20260813i'"
replacement = needle + ",'modal-surface-clarity-20260813.js?v=20260813j'"
if "modal-surface-clarity-20260813.js" not in text:
    if needle not in text:
        raise SystemExit("Loader anchor not found")
    text = text.replace(needle, replacement)
config.write_text(text, encoding="utf-8")

index = Path("index.html")
html = index.read_text(encoding="utf-8")
html = html.replace(f"?v={VERSION_OLD}", f"?v={VERSION_NEW}")
index.write_text(html, encoding="utf-8")
