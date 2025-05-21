#!/bin/bash

# Script to compile the DB Analyzer application for multiple platforms

# Create bin directory structure
mkdir -p bin/linux
mkdir -p bin/mac
mkdir -p bin/win

echo "=== Building DB Analyzer for multiple platforms ==="

# Linux builds (x86_64 and ARM64)
echo "Building for Linux (x86_64)..."
deno compile --allow-net --allow-read --allow-write --allow-env \
  --target x86_64-unknown-linux-gnu \
  --output bin/linux/db_analyzer-x86_64 \
  main.ts

echo "Building for Linux (ARM64)..."
deno compile --allow-net --allow-read --allow-write --allow-env \
  --target aarch64-unknown-linux-gnu \
  --output bin/linux/db_analyzer-arm64 \
  main.ts

# macOS builds (x86_64 and ARM64)
echo "Building for macOS (x86_64)..."
deno compile --allow-net --allow-read --allow-write --allow-env \
  --target x86_64-apple-darwin \
  --output bin/mac/db_analyzer-x86_64 \
  main.ts

echo "Building for macOS (ARM64)..."
deno compile --allow-net --allow-read --allow-write --allow-env \
  --target aarch64-apple-darwin \
  --output bin/mac/db_analyzer-arm64 \
  main.ts

# Windows builds (x86_64)
echo "Building for Windows (x86_64)..."
deno compile --allow-net --allow-read --allow-write --allow-env \
  --target x86_64-pc-windows-msvc \
  --output bin/win/db_analyzer.exe \
  main.ts

# No need to copy mappings.json as the application will generate it if it doesn't exist

# Create README files for each platform
echo "Creating README files..."

# Linux README
cat > bin/linux/README.txt << 'EOL'
DB Analyzer - Linux Binaries

Usage:
  ./db_analyzer-x86_64 [OPTIONS]  # For x86_64 systems
  ./db_analyzer-arm64 [OPTIONS]   # For ARM64 systems

Make sure to:
1. Create a .env file with your DATABASE_URL in the same directory as the binary

Note: The application will automatically generate a default mappings.json file if one doesn't exist.

For more information, run:
  ./db_analyzer-x86_64 --help
EOL

# macOS README
cat > bin/mac/README.txt << 'EOL'
DB Analyzer - macOS Binaries

Usage:
  ./db_analyzer-x86_64 [OPTIONS]  # For Intel Macs
  ./db_analyzer-arm64 [OPTIONS]   # For Apple Silicon Macs

Make sure to:
1. Create a .env file with your DATABASE_URL in the same directory as the binary

Note: The application will automatically generate a default mappings.json file if one doesn't exist.

For more information, run:
  ./db_analyzer-x86_64 --help
EOL

# Windows README
cat > bin/win/README.txt << 'EOL'
DB Analyzer - Windows Binaries

Usage:
  db_analyzer.exe [OPTIONS]

Make sure to:
1. Create a .env file with your DATABASE_URL in the same directory as the binary

Note: The application will automatically generate a default mappings.json file if one doesn't exist.

For more information, run:
  db_analyzer.exe --help
EOL

echo "=== Build Complete ==="
echo "Binaries are available in the bin directory:"
echo "  - Linux: bin/linux/"
echo "  - macOS: bin/mac/"
echo "  - Windows: bin/win/"
