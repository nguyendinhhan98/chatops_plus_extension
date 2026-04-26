#!/bin/bash
# Security Check Script — Chạy trước khi publish hoặc sau mỗi lần code
# Usage: npm run security-check

set -e

echo "🔐 Security Check — mcp-chatops"
echo "================================"
ERRORS=0

# 1. Token & Secret Leak
echo ""
echo "1️⃣  Checking for leaked tokens..."
LEAKED=$(grep -rn "MMAUTHTOKEN=[a-zA-Z0-9]\{10,\}" src/ docs/ --include="*.ts" --include="*.md" 2>/dev/null | grep -v "placeholder\|<your\|xxx\|example\|your_" || true)
if [ -n "$LEAKED" ]; then
  echo "   ❌ FOUND leaked tokens:"
  echo "$LEAKED"
  ERRORS=$((ERRORS + 1))
else
  echo "   ✅ No leaked tokens"
fi

# 2. npm Package Contents
echo ""
echo "2️⃣  Checking npm package contents..."
SENSITIVE=$(npm pack --dry-run 2>&1 | grep -iE "\.env[^.]|secret|password|scratch|mattermost" || true)
if [ -n "$SENSITIVE" ]; then
  echo "   ❌ Sensitive files found in package:"
  echo "$SENSITIVE"
  ERRORS=$((ERRORS + 1))
else
  echo "   ✅ No sensitive files in package"
fi

# 3. Code Injection
echo ""
echo "3️⃣  Checking for code injection risks..."
INJECTION=$(grep -rn "eval(\|new Function(" src/ --include="*.ts" 2>/dev/null || true)
if [ -n "$INJECTION" ]; then
  echo "   ❌ Code injection risk found:"
  echo "$INJECTION"
  ERRORS=$((ERRORS + 1))
else
  echo "   ✅ No code injection risks"
fi

# 4. External URLs
echo ""
echo "4️⃣  Checking for hardcoded external URLs..."
EXTERNAL=$(grep -rn "https\?://" src/ --include="*.ts" 2>/dev/null | grep -v "config\.\|chatopsUrl\|baseURL\|// " || true)
if [ -n "$EXTERNAL" ]; then
  echo "   ⚠️  External URLs found (review manually):"
  echo "$EXTERNAL"
else
  echo "   ✅ No hardcoded external URLs"
fi

# 5. Old mattermost artifacts
echo ""
echo "5️⃣  Checking for old mattermost artifacts..."
if [ -d "dist/mattermost" ]; then
  echo "   ❌ dist/mattermost/ still exists!"
  ERRORS=$((ERRORS + 1))
else
  echo "   ✅ No old artifacts"
fi

# 6. Build & Test
echo ""
echo "6️⃣  Running build & tests..."
npm run build --silent 2>&1 && echo "   ✅ Build passed" || { echo "   ❌ Build failed"; ERRORS=$((ERRORS + 1)); }
npm test --silent 2>&1 && echo "   ✅ Tests passed" || { echo "   ❌ Tests failed"; ERRORS=$((ERRORS + 1)); }

# 7. Dependency audit
echo ""
echo "7️⃣  Checking dependencies..."
npm audit --audit-level=high 2>&1 | tail -3 || true

# Summary
echo ""
echo "================================"
if [ $ERRORS -eq 0 ]; then
  echo "✅ All security checks passed! Safe to publish."
  exit 0
else
  echo "❌ $ERRORS issue(s) found. Fix before publishing."
  exit 1
fi
