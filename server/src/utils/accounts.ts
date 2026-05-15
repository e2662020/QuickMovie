import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_ROOT = path.resolve(__dirname, '../../../')

interface TestAccount {
  username: string
  password: string
  roles: string[]
  status: boolean
}

export function loadTestAccounts(): TestAccount[] {
  const accountFile = path.join(PROJECT_ROOT, 'TestAccount.json')
  try {
    const content = fs.readFileSync(accountFile, 'utf-8')
    const jsonContent = content.replace(/\/\/.*$/gm, '').trim()
    return JSON.parse(jsonContent)
  } catch {
    return [
      { username: 'admin@quickmovie.cn', password: '123456', roles: ['admin'], status: false },
      { username: 'demo@quickmovie.cn', password: '123456', roles: ['user'], status: false },
    ]
  }
}
