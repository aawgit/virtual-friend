#!/usr/bin/env python3
"""
Development server for blendshape-project.

Required for:
 - WASM-based AI libraries (kokoro-js TTS) which need SharedArrayBuffer
 - SharedArrayBuffer requires Cross-Origin-Isolation headers

Usage:
    python3 server.py [port]

Default port: 8000
"""

import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler


class COIHandler(SimpleHTTPRequestHandler):
    """HTTP handler that adds Cross-Origin-Isolation headers required for WASM/SharedArrayBuffer."""

    def end_headers(self):
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        super().end_headers()

    def log_message(self, fmt, *args):
        # Suppress verbose access logs; only show errors
        if args[1] not in ('200', '304'):
            super().log_message(fmt, *args)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    server = HTTPServer(("", port), COIHandler)
    print(f"Serving on http://localhost:{port}")
    print("Cross-Origin-Isolation headers enabled for WASM support.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
