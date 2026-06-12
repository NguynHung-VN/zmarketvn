#!/usr/bin/env bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ZMarketVN - Schema Switcher for Vercel Deployment
#
# Local dev:  uses SQLite (prisma/schema.sqlite.prisma)
# Vercel:     uses PostgreSQL (prisma/schema.postgresql.prisma)
#
# This script is called by package.json build script.
# On Vercel (VERCEL=1), it switches to PostgreSQL schema before build.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

set -e

if [ "$VERCEL" = "1" ]; then
  echo "🔧 Vercel detected - switching to PostgreSQL schema..."
  cp prisma/schema.postgresql.prisma prisma/schema.prisma
  echo "✅ Using PostgreSQL schema"
else
  echo "🏠 Local development - using SQLite schema..."
  cp prisma/schema.sqlite.prisma prisma/schema.prisma
  echo "✅ Using SQLite schema"
fi
