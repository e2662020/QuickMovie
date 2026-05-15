'use client'

import { useAppStore } from '@/lib/store'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  AlertTriangle,
  Info,
  Wifi,
  WifiOff,
  Clock,
  Loader2,
} from 'lucide-react'

export type ModeSwitchDirection = 'to-offline' | 'to-remote'

interface ModeSwitchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  direction: ModeSwitchDirection
  onConfirm: () => void
  loading?: boolean
}

export function ModeSwitchDialog({
  open,
  onOpenChange,
  direction,
  onConfirm,
  loading = false,
}: ModeSwitchDialogProps) {
  const { pendingSyncActions, lastSyncTimestamp } = useAppStore()

  const pendingCount = pendingSyncActions.length

  const formatTimestamp = (ts: number | null) => {
    if (!ts) return null
    const date = new Date(ts)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const lastSyncStr = formatTimestamp(lastSyncTimestamp)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {direction === 'to-offline' ? (
              <>
                <WifiOff className="h-5 w-5 text-muted-foreground" />
                切换到离线模式
              </>
            ) : (
              <>
                <Wifi className="h-5 w-5 text-green-500" />
                连接到服务器
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {direction === 'to-offline'
              ? '确认将应用切换到离线模式？'
              : '确认将应用切换至在线协作模式？'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {direction === 'to-offline' && (
            <>
              <div className="flex items-start gap-3 rounded-md border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950/30">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800 dark:text-yellow-300">
                    注意
                  </p>
                  <p className="text-yellow-700 dark:text-yellow-400 mt-1">
                    断开服务器连接后，团队协作功能将不可用。
                    您在离线模式下的更改将在重新连接后同步到服务器。
                  </p>
                </div>
              </div>

              {pendingCount > 0 && (
                <div className="flex items-start gap-3 rounded-md border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-950/30">
                  <Info className="h-5 w-5 text-orange-600 dark:text-orange-500 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-orange-800 dark:text-orange-300">
                      未同步的更改
                    </p>
                    <p className="text-orange-700 dark:text-orange-400 mt-1">
                      您有 {pendingCount} 项未同步的操作。切换到离线模式后，这些更改将在重新连接后自动同步。
                    </p>
                  </div>
                </div>
              )}

              {lastSyncStr && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  上次同步时间: {lastSyncStr}
                </div>
              )}
            </>
          )}

          {direction === 'to-remote' && (
            <>
              <div className="flex items-start gap-3 rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/30">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-500 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-blue-800 dark:text-blue-300">
                    数据合并
                  </p>
                  <p className="text-blue-700 dark:text-blue-400 mt-1">
                    连接到服务器后，您的本地数据将与服务器数据合并。
                    离线期间所做的更改将保持有效。
                  </p>
                </div>
              </div>

              {pendingCount > 0 && (
                <div className="flex items-start gap-3 rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950/30">
                  <Info className="h-5 w-5 text-green-600 dark:text-green-500 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-green-800 dark:text-green-300">
                      待同步操作: {pendingCount} 项
                    </p>
                    <p className="text-green-700 dark:text-green-400 mt-1">
                      连接成功后，这些操作将自动同步到服务器。
                    </p>
                  </div>
                </div>
              )}

              {lastSyncStr && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  上次同步时间: {lastSyncStr}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            取消
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            variant={direction === 'to-offline' ? 'default' : 'default'}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {direction === 'to-offline' ? '切换到离线模式' : '连接到服务器'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
