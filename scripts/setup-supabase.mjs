#!/usr/bin/env node
/**
 * Needin Platform — Supabase Migration Setup Script
 * Run this after you've updated both DATABASE_URL and DIRECT_URL in .env
 * 
 * Usage: node scripts/setup-supabase.mjs
 */

import { execSync } from "child_process";

function run(cmd, label) {
  console.log(`\n🔄 ${label}...`);
  try {
    execSync(cmd, { stdio: "inherit", cwd: process.cwd() });
    console.log(`✅ ${label} — Done!`);
  } catch (err) {
    console.error(`❌ ${label} failed!`);
    process.exit(1);
  }
}

console.log("🚀 Needin Platform — Supabase Migration\n");
console.log("Project: dbnkcgatdpsrniyaoqdm");
console.log("─".repeat(50));

// Step 1: Generate Prisma client for PostgreSQL
run("npx prisma generate", "Generate Prisma Client (PostgreSQL)");

// Step 2: Push schema to Supabase (creates all tables)
run("npx prisma db push --force-reset", "Push schema to Supabase (creates all tables)");

// Step 3: Seed the database
run("npx tsx prisma/seed.ts", "Seed database (staff, services, templates, sample data)");

console.log("\n" + "═".repeat(50));
console.log("🎉 Supabase migration complete!");
console.log("✅ All tables created in Supabase");
console.log("✅ 20 WhatsApp templates seeded");
console.log("✅ Staff accounts seeded (owner@needin.com / Needin@2026)");
console.log("✅ Sample customers & dogs seeded");
console.log("═".repeat(50));
console.log("\nNext: Restart your dev server with: npm run dev");
