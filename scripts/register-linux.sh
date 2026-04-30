#!/usr/bin/env bash
# register-linux.sh — Register .comp file association on Linux
#
# Usage: ./register-linux.sh /path/to/Company-Editor-Linux

set -e

APP_BIN="${1:-$(dirname "$0")/../dist/Company-Editor-Linux/Company-Editor-Linux}"
APP_BIN="$(realpath "$APP_BIN" 2>/dev/null || echo "$APP_BIN")"

if [ ! -f "$APP_BIN" ]; then
    echo "❌ App binary not found at: $APP_BIN"
    echo "Usage: $0 /path/to/Company-Editor-Linux"
    exit 1
fi

mkdir -p ~/.local/share/applications
mkdir -p ~/.local/share/mime/packages

# MIME type definition
cat > ~/.local/share/mime/packages/application-x-comp.xml << 'XMLEOF'
<?xml version="1.0"?>
<mime-info xmlns="http://www.freedesktop.org/standards/shared-mime-info">
  <mime-type type="application/x-comp">
    <comment>Company file</comment>
    <glob pattern="*.comp"/>
    <icon name="application-x-comp"/>
  </mime-type>
</mime-info>
XMLEOF

# Desktop entry
cat > ~/.local/share/applications/company-editor.desktop << DESKTOPEOF
[Desktop Entry]
Type=Application
Name=Company Editor
Comment=Edit .comp company files
Exec="$APP_BIN" %f
Icon=${APP_BIN}
Terminal=false
Categories=Office;Database;
MimeType=application/x-comp;
NoDisplay=false
DESKTOPEOF

# Apply
update-mime-database ~/.local/share/mime 2>/dev/null || true
update-desktop-database ~/.local/share/applications 2>/dev/null || true
xdg-mime default company-editor.desktop application/x-comp 2>/dev/null || true

echo "✅ .comp file association registered for $(whoami)"
echo "   Double-click a .comp file to open with Company Editor"
