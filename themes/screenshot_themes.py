"""
Takes a screenshot of every theme on the example site and saves it as
themes/<id>/preview.webp. Those images are the thumbnails on the Themes page,
in the Themes popup and on the Design page showcase.

Run it from the site folder after adding or changing a theme:

    python themes/screenshot_themes.py            # every theme
    python themes/screenshot_themes.py saas aero  # just these

Needs:  pip install playwright pillow   then   playwright install chromium
"""
import functools
import http.server
import io
import re
import sys
import threading
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

SITE = Path(__file__).resolve().parent.parent
WIDTH, HEIGHT = 1280, 800        # the size the page is rendered at
SAVE_WIDTH = 960                 # the size the thumbnail is saved at
PORT = 8765


def theme_ids():
    """Reads the theme ids from the THEMES list in themes/engine.js."""
    source = (SITE / "themes" / "engine.js").read_text(encoding="utf-8")
    block = source.split("const THEMES = [", 1)[1].split("];", 1)[0]
    return re.findall(r"id:\s*'([\w-]+)'", block)


def serve():
    """Serves the site folder on localhost so the pages load like they would online."""
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass

    handler = functools.partial(Quiet, directory=str(SITE))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


def main():
    wanted = sys.argv[1:] or theme_ids()
    server = serve()
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": WIDTH, "height": HEIGHT}, color_scheme="light", reduced_motion="reduce")
        for theme in wanted:
            # #preview-<id> shows a theme without saving it, with no sound or intros.
            # (about:blank first, because changing only the #part wouldn't reload the page)
            page.goto("about:blank")
            page.goto(f"http://127.0.0.1:{PORT}/themes/_example/index.html#preview-{theme}")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(1200)            # let fonts and the theme settle
            png = page.screenshot()
            image = Image.open(io.BytesIO(png)).convert("RGB")
            image = image.resize((SAVE_WIDTH, round(SAVE_WIDTH * HEIGHT / WIDTH)), Image.LANCZOS)
            out = SITE / "themes" / theme / "preview.webp"
            out.parent.mkdir(parents=True, exist_ok=True)
            image.save(out, "WEBP", quality=82, method=6)
            print(f"saved {out.relative_to(SITE)} ({out.stat().st_size // 1024} KB)")
        browser.close()
    server.shutdown()


if __name__ == "__main__":
    main()
