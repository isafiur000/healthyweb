#!/bin/bash

set -e

echo "=== Canon LBP2900 Open-Source Driver Installer (captdriver) ==="

# Ensure root

if [ "$EUID" -ne 0 ]; then
echo "Re-running as root..."
exec sudo "$0" "$@"
fi

# Variables

PRINTER_NAME="LBP2900"
INSTALL_DIR="/opt/captdriver"

echo "[1/6] Installing dependencies..."
apt update
apt install -y git build-essential autoconf automake libcups2-dev cups

echo "[2/6] Cleaning previous install..."
rm -rf $INSTALL_DIR

echo "[3/6] Cloning captdriver..."
git clone https://github.com/mounaiban/captdriver.git $INSTALL_DIR
cd $INSTALL_DIR

echo "[4/6] Building driver..."
./autogen.sh || true
aclocal || true
autoconf || true
automake --add-missing || true

./configure
make
make ppd

echo "[5/6] Installing driver into CUPS..."
cp src/rastertocapt /usr/lib/cups/filter/
chmod 755 /usr/lib/cups/filter/rastertocapt

echo "[6/6] Detecting printer..."

DEVICE_URI=$(lpinfo -v | grep -i "Canon.*LBP2900" | head -n1 | awk '{print $2}')

if [ -z "$DEVICE_URI" ]; then
echo "⚠️ Printer not auto-detected."
echo "Available devices:"
lpinfo -v
echo ""
read -p "Enter your printer URI manually: " DEVICE_URI
fi

echo "Using device: $DEVICE_URI"

echo "Adding printer..."
lpadmin -p $PRINTER_NAME -E -v "$DEVICE_URI" 
-P $INSTALL_DIR/ppd/CanonLBP-2900-3000.ppd

echo "Setting as default..."
lpadmin -d $PRINTER_NAME

echo "Restarting CUPS..."
systemctl restart cups

echo "Printing test page..."
echo "Test Page - Canon LBP2900 (captdriver)" | lp

echo ""
echo "✅ Installation complete!"
echo "If printing fails, try:"
echo "  sudo systemctl restart cups"

