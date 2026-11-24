"""
Previews the site locally the way GitHub Pages serves it, so links like /code
work (they load code.html). Plain `python -m http.server` can't do that.

    python serve.py          # http://127.0.0.1:8000
    python serve.py 4173     # another port
"""
import functools
import http.server
import sys
from pathlib import Path

SITE = Path(__file__).resolve().parent


class Handler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        real = Path(super().translate_path(path))
        # /code -> code.html, like GitHub Pages
        if not real.exists() and real.with_suffix(".html").is_file():
            return str(real.with_suffix(".html"))
        return str(real)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    host = sys.argv[2] if len(sys.argv) > 2 else "127.0.0.1"
    handler = functools.partial(Handler, directory=str(SITE))
    print(f"Serving on http://{host}:{port}")
    http.server.ThreadingHTTPServer((host, port), handler).serve_forever()
