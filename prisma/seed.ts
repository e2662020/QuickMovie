/**
 * 数据库种子脚本 - 仅用于开发/测试环境
 * 创建测试管理员账号: admin / 123
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 开始数据库种子...')

  const testEmail = 'admin@test.com'
  const testPassword = '123456'
  const testName = 'Admin'

  // 检查是否已存在
  const existing = await prisma.user.findUnique({
    where: { email: testEmail },
  })

  if (existing) {
    console.log('✅ 测试管理员账号已存在，跳过创建')
    return
  }

  // 创建测试管理员账号
  const hashedPassword = await bcrypt.hash(testPassword, 10)
  
  const adminUser = await prisma.user.create({
    data: {
      email: testEmail,
      password: hashedPassword,
      name: testName,
    },
  })

  console.log(`✅ 创建测试管理员账号: ${testEmail}`)

  // 创建默认个人团队
  const inviteCode = crypto.randomUUID().replace(/-/g, '').substring(0, 8)
  await prisma.team.create({
    data: {
      name: `${testName} 的个人空间`,
      ownerId: adminUser.id,
      inviteCode,
    },
  })

  console.log(`✅ 创建默认团队`)
  console.log('🎉 数据库种子完成！')
  console.log('')
  console.log('📝 测试账号信息:')
  console.log('   邮箱: admin@test.com')
  console.log('   密码: 123456')
  console.log('')
  console.log('⚠️  警告: 此账号仅用于开发/测试，请勿在生产环境使用！')
}

main()
  .catch((e) => {
    console.error('❌ 种子脚本失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
