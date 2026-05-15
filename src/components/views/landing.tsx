'use client'

import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import {
  ClipboardList,
  LayoutDashboard,
  FileText,
  Film,
  Users,
  Sparkles,
  ArrowRight,
  ChevronRight,
} from 'lucide-react'

// ─── Animation Variants ───────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
}

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
}

// ─── Feature Data ─────────────────────────────────────────────────────────────

const features = [
  {
    icon: ClipboardList,
    title: '策划管理',
    desc: '智能策划案生成，从创意灵感到完整策划方案，让前期筹备更高效。',
  },
  {
    icon: LayoutDashboard,
    title: '故事板',
    desc: '可视化故事板编辑，拖拽式操作快速构建分镜序列，直观呈现叙事节奏。',
  },
  {
    icon: FileText,
    title: '剧本编辑',
    desc: '专业剧本编辑器，支持行业标准格式，对白优化与场景描述。',
  },
  {
    icon: Film,
    title: '分镜设计',
    desc: '专业分镜设计工具，精确标注镜头语言，衔接策划与制作的桥梁。',
  },
  {
    icon: Users,
    title: '团队协作',
    desc: '实时协作与权限管理，导演、编剧、摄影无缝配合，提升团队效能。',
  },
  {
    icon: Sparkles,
    title: '智能增强',
    desc: '智能创作流程，场景分析、构图建议与风格迁移，释放创作潜能。',
  },
]

const workflowSteps = [
  {
    step: '01',
    title: '策划',
    desc: '智能完成创意构思与项目策划，快速生成专业策划文档。',
  },
  {
    step: '02',
    title: '创作',
    desc: '在故事板与剧本编辑器中将构思转化为可执行的分镜方案。',
  },
  {
    step: '03',
    title: '制作',
    desc: '导出完整分镜脚本，协同团队进入拍摄与后期制作阶段。',
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function LandingView() {
  const setView = useAppStore((s) => s.setView)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 overflow-x-hidden">
      {/* ── Hero Section ─────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center px-6 pt-24 pb-20 sm:pt-32 sm:pb-28 md:pt-40 md:pb-36 text-center overflow-hidden">
        {/* Background glow effects */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-gradient-to-b from-violet-600/20 via-indigo-600/10 to-transparent blur-3xl" />
          <div className="absolute left-1/4 top-1/3 h-[400px] w-[500px] rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute right-1/4 top-1/4 h-[350px] w-[450px] rounded-full bg-fuchsia-500/10 blur-3xl" />
        </div>

        <motion.div
          className="relative z-10 max-w-4xl mx-auto"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          {/* Badge */}
          <motion.div variants={fadeUp} custom={0} className="mb-6">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/60 bg-slate-800/60 px-4 py-1.5 text-xs font-medium tracking-wide text-slate-300 backdrop-blur-sm">
              <Sparkles className="size-3.5 text-amber-400" />
              专业工具 · 团队协作
            </span>
          </motion.div>

          {/* Title */}
          <motion.h1
            variants={fadeUp}
            custom={1}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-none"
          >
            <span className="bg-gradient-to-r from-violet-400 via-cyan-300 to-indigo-400 bg-clip-text text-transparent">
              快分镜
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={fadeUp}
            custom={2}
            className="mt-5 text-xl sm:text-2xl md:text-3xl font-semibold text-slate-200"
          >
            专业影视创作协作平台
          </motion.p>

          {/* Tagline */}
          <motion.p
            variants={fadeUp}
            custom={3}
            className="mt-4 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed text-slate-400"
          >
            从创意策划到分镜设计，为专业影视团队提供一站式创作工具。
            <br className="hidden sm:block" />
            让每一个故事，都能以最专业的方式被呈现。
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={fadeUp}
            custom={4}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button
              size="lg"
              className="h-12 px-8 text-base font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-500/25 transition-all duration-300 hover:shadow-violet-500/40 hover:scale-[1.03]"
              onClick={() => setView('login')}
            >
              开始创作
              <ArrowRight className="ml-1 size-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-12 px-8 text-base font-semibold border-slate-700 bg-slate-800/50 text-slate-200 hover:bg-slate-700/60 hover:text-white hover:border-slate-600 transition-all duration-300"
              onClick={() => {
                document
                  .getElementById('features')
                  ?.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              了解更多
              <ChevronRight className="ml-1 size-4" />
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Features Section ─────────────────────────────────────── */}
      <section id="features" className="relative px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl">
          {/* Section Header */}
          <motion.div
            className="text-center mb-14 sm:mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={staggerContainer}
          >
            <motion.p
              variants={fadeUp}
              className="text-sm font-semibold tracking-widest uppercase text-violet-400"
            >
              核心功能
            </motion.p>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="mt-3 text-3xl sm:text-4xl font-bold text-white"
            >
              专业级影视创作工具集
            </motion.h2>
            <motion.p
              variants={fadeUp}
              custom={2}
              className="mt-3 max-w-xl mx-auto text-slate-400"
            >
              覆盖从前期策划到制作准备的完整创作流程，深度赋能每一个环节。
            </motion.p>
          </motion.div>

          {/* Feature Cards Grid */}
          <motion.div
            className="grid gap-5 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={staggerContainer}
          >
            {features.map((feature, i) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={feature.title}
                  variants={fadeUp}
                  custom={i}
                  className="group relative rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 sm:p-7 backdrop-blur-sm transition-all duration-300 hover:border-slate-700 hover:bg-slate-800/70 hover:shadow-xl hover:shadow-violet-500/5"
                >
                  {/* Icon */}
                  <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 ring-1 ring-violet-500/20 transition-all duration-300 group-hover:from-violet-600/30 group-hover:to-indigo-600/30 group-hover:ring-violet-500/30">
                    <Icon className="size-5 text-violet-400" />
                  </div>

                  {/* Title & Desc */}
                  <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    {feature.desc}
                  </p>

                  {/* Hover glow */}
                  <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-gradient-to-br from-violet-600/5 via-transparent to-indigo-600/5" />
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* ── Workflow Section ─────────────────────────────────────── */}
      <section className="relative px-6 py-20 sm:py-28">
        {/* Subtle top divider */}
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-slate-700/60 to-transparent" />

        <div className="mx-auto max-w-5xl">
          {/* Section Header */}
          <motion.div
            className="text-center mb-14 sm:mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={staggerContainer}
          >
            <motion.p
              variants={fadeUp}
              className="text-sm font-semibold tracking-widest uppercase text-cyan-400"
            >
              创作流程
            </motion.p>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="mt-3 text-3xl sm:text-4xl font-bold text-white"
            >
              三步开启专业创作
            </motion.h2>
            <motion.p
              variants={fadeUp}
              custom={2}
              className="mt-3 max-w-xl mx-auto text-slate-400"
            >
              从想法到大银幕，快分镜让创作之路清晰高效。
            </motion.p>
          </motion.div>

          {/* Workflow Steps */}
          <motion.div
            className="grid gap-6 sm:gap-8 grid-cols-1 md:grid-cols-3"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={staggerContainer}
          >
            {workflowSteps.map((item, i) => (
              <motion.div
                key={item.step}
                variants={fadeUp}
                custom={i}
                className="relative flex flex-col items-center text-center"
              >
                {/* Connector line (not on last item) */}
                {i < workflowSteps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[calc(50%+48px)] right-[calc(-50%+48px)] h-px bg-gradient-to-r from-slate-600/60 via-slate-700/40 to-slate-600/60" />
                )}

                {/* Step circle */}
                <div className="relative z-10 mb-5 flex size-16 items-center justify-center rounded-2xl bg-slate-800/80 ring-1 ring-slate-700/80 shadow-lg shadow-black/20">
                  <span className="text-xl font-bold bg-gradient-to-b from-cyan-300 to-indigo-400 bg-clip-text text-transparent">
                    {item.step}
                  </span>
                </div>

                {/* Step label */}
                <span className="mb-2 text-xs font-semibold tracking-widest uppercase text-slate-500">
                  Step {item.step}
                </span>

                {/* Title */}
                <h3 className="text-2xl font-bold text-white">{item.title}</h3>

                {/* Description */}
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-400">
                  {item.desc}
                </p>

                {/* Arrow (not on last item, mobile only) */}
                {i < workflowSteps.length - 1 && (
                  <div className="mt-4 md:hidden text-slate-600">
                    <ArrowRight className="size-5" />
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────────── */}
      <section className="px-6 py-20 sm:py-28">
        <motion.div
          className="relative mx-auto max-w-3xl rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-900/90 to-slate-800/60 p-10 sm:p-14 text-center backdrop-blur-sm overflow-hidden"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
        >
          {/* Glow */}
          <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-60 w-80 rounded-full bg-violet-600/15 blur-3xl" />

          <div className="relative z-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              准备好开始创作了吗？
            </h2>
            <p className="mt-3 text-slate-400">
              立即加入快分镜，体验全新的影视创作方式。
            </p>
            <Button
              size="lg"
              className="mt-8 h-12 px-8 text-base font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-500/25 transition-all duration-300 hover:shadow-violet-500/40 hover:scale-[1.03]"
              onClick={() => setView('login')}
            >
              免费开始使用
              <ArrowRight className="ml-1 size-4" />
            </Button>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800/60 px-6 py-8">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
          <p>&copy; 2024 快分镜 - 专业影视创作平台</p>
          <p className="text-slate-600">Crafted for filmmakers.</p>
        </div>
      </footer>
    </div>
  )
}
