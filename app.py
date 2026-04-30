#!/usr/bin/env python3
"""Company Editor — standalone PyWebView app for editing .comp files."""

import sys
import os
import json
import threading
import traceback
import webview

try:
    import bottle
    from bottle import route, request, response, static_file
except ImportError:
    bottle = None

_this_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _this_dir)

from prodlib.company import Company, Contact


_log_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "company-editor.log")
def log(msg):
    print(f"[company-editor] {msg}", file=sys.stderr, flush=True)
    try:
        with open(_log_path, "a") as f:
            f.write(f"{msg}\n")
    except Exception:
        pass


def log_error(msg):
    print(f"[company-editor ERROR] {msg}", file=sys.stderr, flush=True)
    traceback.print_exc(file=sys.stderr)


# ---------------------------------------------------------------------------
# Bottle HTTP server
# ---------------------------------------------------------------------------
if bottle is not None:
    bottle_app = bottle.Bottle()

    def json_ok(data):
        response.content_type = "application/json"
        return json.dumps({"ok": True, "data": data})

    def json_err(msg, status=400):
        response.content_type = "application/json"
        response.status = status
        return json.dumps({"ok": False, "error": msg})

    # ── Static files ──
    @bottle_app.route("/")
    def index():
        return static_file("index.html", root=os.path.join(_this_dir, "frontend"))

    @bottle_app.route("/src/<filename>")
    def static_src(filename):
        return static_file(filename, root=os.path.join(_this_dir, "frontend", "src"))

    # ── Health ──
    @bottle_app.get("/api/health")
    def api_health():
        return json_ok({"status": "ok", "version": "1.0.0"})

    @bottle_app.get("/api/open")
    def api_open_launch():
        """GET: Load the company from the launch file (set when app launched with a file arg)."""
        try:
            info_path = os.path.join(_this_dir, "data", "launch_file.json")
            log(f"Reading launch file from: {info_path}")
            if not os.path.isfile(info_path):
                log("No launch file found")
                return json_ok({"ok": False})
            with open(info_path, "r") as f:
                launch = json.load(f)
            path = launch.get("path", "")
            log(f"Launch file content: path={path}")
            if not path or not os.path.isfile(path):
                log(f"File not found at path: {path}")
                return json_ok({"ok": False})
            directory = os.path.dirname(path)
            log(f"Loading company from directory: {directory}")
            c = Company.load(directory)
            return json_ok({
                "ok": True,
                "data": {
                    "company": c.to_dict(),
                    "filepath": path,
                    "filename": c.filename,
                    "directory": directory,
                }
            })
        except Exception as e:
            return json_err(str(e))

    # ── Open a .comp file (POST with path) ──
    @bottle_app.post("/api/open")
    def api_open():
        """Load a .comp file and return its data."""
        body = request.json or {}
        path = body.get("path", "")
        if not path:
            return json_err("path is required")
        if not os.path.isfile(path):
            return json_err(f"File not found: {path}")
        try:
            directory = os.path.dirname(path)
            c = Company.load(directory)
            return json_ok({
                "company": c.to_dict(),
                "filepath": path,
                "filename": c.filename,
                "directory": directory,
            })
        except Exception as e:
            return json_err(str(e))

    # ── Save a .comp file ──
    @bottle_app.post("/api/save")
    def api_save():
        """Save company data to a .comp file."""
        body = request.json or {}
        directory = body.get("directory", "")
        company_data = body.get("company", {})
        if not directory:
            return json_err("directory is required")
        try:
            # First see if there's an existing .comp file
            existing = Company.find_company_file(directory)
            c = Company(directory)
            if existing:
                c.filename = os.path.basename(existing)

            c.name = company_data.get("name", "")
            c.address = company_data.get("address", "")
            c.website = company_data.get("website", "")
            c.company_type = company_data.get("company_type", "")
            c.emails = company_data.get("emails", [])
            c.phones = company_data.get("phones", [])

            # If a filename is explicitly provided (e.g. from a rename), use it
            explicit_filename = company_data.get("filename", "")
            if explicit_filename:
                c.filename = explicit_filename

            for cd in company_data.get("contacts", []):
                c.contacts.append(Contact.from_dict(cd))

            c.save()
            return json_ok({
                "company": c.to_dict(),
                "filepath": os.path.join(directory, c.filename),
                "filename": c.filename,
                "directory": directory,
            })
        except Exception as e:
            return json_err(str(e))

    # ── Browse for file ──
    @bottle_app.get("/api/open-file")
    def api_open_file():
        """Open a native file dialog for .comp files."""
        try:
            file_types = ("Company files (*.comp)",)
            result = webview.windows[0].create_file_dialog(
                webview.FileDialog.OPEN, allow_multiple=False,
                file_types=file_types
            )
            path = result[0] if result else ""
            return json_ok({"path": path})
        except Exception as e:
            return json_err(str(e))

    # ── Browse for directory ──
    @bottle_app.get("/api/browse-directory")
    def api_browse_directory():
        """Open a native directory picker."""
        try:
            result = webview.windows[0].create_file_dialog(
                webview.FileDialog.FOLDER
            )
            path = result[0] if result else ""
            return json_ok({"path": path})
        except Exception as e:
            return json_err(str(e))

    # ── Open URI with system handler ──
    @bottle_app.get("/api/open-system")
    def api_open_system():
        """Open a URI (mailto:, tel:, https:) with the system default handler."""
        uri = request.query.get("uri", "")
        if not uri:
            return json_err("uri is required")
        try:
            import subprocess
            import platform
            system = platform.system()
            if system == "Darwin":
                subprocess.Popen(["open", uri])
            elif system == "Windows":
                import webbrowser
                webbrowser.open(uri)
            else:
                subprocess.Popen(["xdg-open", uri])
            return json_ok({"opened": True})
        except Exception as e:
            return json_err(str(e))

    # ── CORS ──
    @bottle_app.hook("after_request")
    def enable_cors():
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type"

else:
    bottle_app = None


# ---------------------------------------------------------------------------
# PyWebView
# ---------------------------------------------------------------------------
def start_server():
    if bottle_app:
        bottle_app.run(host="127.0.0.1", port=18092, quiet=True)


def main():
    # Accept file from command line
    file_to_open = ""
    if len(sys.argv) > 1:
        arg_path = sys.argv[1].strip()
        if arg_path.endswith(".comp") and os.path.isfile(arg_path):
            file_to_open = os.path.realpath(arg_path)

    # Write launch file BEFORE creating the window — frontend checks this on load
    if file_to_open:
        info_path = os.path.join(_this_dir, "data", "launch_file.json")
        os.makedirs(os.path.dirname(info_path), exist_ok=True)
        with open(info_path, "w") as f:
            json.dump({"path": file_to_open}, f)
        log(f"Launch file written: {file_to_open}")
    else:
        log("No file argument — start page will be shown")

    t = threading.Thread(target=start_server, daemon=True)
    t.start()

    webview.create_window(
        "Company Editor",
        "http://127.0.0.1:18092",
        width=900,
        height=700,
        resizable=True,
        text_select=True,
    )

    webview.start(debug=False)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        log_error("Fatal crash in main()")
        sys.exit(1)
