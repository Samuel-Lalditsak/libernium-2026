"""Build a plain-files copy of the site into docs/ for free hosting on GitHub Pages.

Run after changing anything:  python build_static.py
Then commit and push the docs/ folder.
"""
import shutil
from pathlib import Path

from app import BASE_DIR, app

OUT = BASE_DIR / "docs"


def main():
    with app.test_client() as client:
        html = client.get("/").get_data(as_text=True)
    # GitHub Pages serves the site from a subfolder (/libernium-2026/), so links must be relative.
    html = html.replace('"/static/', '"static/')

    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()
    (OUT / "index.html").write_text(html, encoding="utf-8")
    (OUT / ".nojekyll").write_text("")  # serve files as-is
    shutil.copytree(BASE_DIR / "static", OUT / "static")
    print(f"Built static site in {OUT}")


if __name__ == "__main__":
    main()
