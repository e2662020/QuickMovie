import fs from 'node:fs'
import path from 'node:path'

const distPath = path.resolve('dist')
const isProduction = process.env.NODE_ENV === 'production' || process.argv.includes('--production')

function checkTestAccounts() {
  const testAccountPath = path.join(distPath, 'TestAccount.json')
  if (fs.existsSync(testAccountPath)) {
    if (isProduction) {
      console.error('ERROR: TestAccount.json found in production build!')
      process.exit(1)
    }
  }
  console.log('TestAccount.json check passed')
}

function checkBuildTarget() {
  const target = process.env.BUILD_TARGET || 'dev'
  console.log(`Build target: ${target}`)
}

checkTestAccounts()
checkBuildTarget()
console.log('Build check passed')
