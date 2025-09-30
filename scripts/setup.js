#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

console.log('🚀 Setting up Electron + React + Next.js Auth App...\n')

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local')
if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env.local from template...')
  const envExample = fs.readFileSync(path.join(process.cwd(), 'env.example'), 'utf8')
  fs.writeFileSync(envPath, envExample)
  console.log('✅ .env.local created! Please update it with your configuration values.\n')
} else {
  console.log('✅ .env.local already exists.\n')
}

// Check if node_modules exists
const nodeModulesPath = path.join(process.cwd(), 'node_modules')
if (!fs.existsSync(nodeModulesPath)) {
  console.log('📦 Installing dependencies...')
  console.log('Run: npm install\n')
} else {
  console.log('✅ Dependencies are installed.\n')
}

console.log('🎯 Next steps:')
console.log('1. Update .env.local with your Azure AD and Supabase credentials')
console.log('2. Run: npm install')
console.log('3. Set up your Supabase database with the SQL from supabase-schema.sql')
console.log('4. Run: npm run dev (for Next.js)')
console.log('5. Run: npm run electron-dev (for Electron app)')
console.log('\n📚 Check README.md for detailed setup instructions!')



