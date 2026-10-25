/**
 * @design D-U-02
 * 应用更新横幅的判定：只在「有新版本」且「用户没关过」时显示。
 *
 * 依据 `ChatWindow.tsx:102-106`（模块级 `appUpdateCheck` 缓存 + `/api/app-update`）。
 * 缓存放模块级是 pi-web 的写法：横幅不该每次渲染都打一次接口。
 */
export interface AppUpdateInfo {
  version: string
  url?: string
}

let cached: Promise<AppUpdateInfo | null> | null = null
let dismissed: string | null = null

export function shouldShowUpdate(info: AppUpdateInfo | null, currentVersion: string): boolean {
  if (!info) return false
  if (info.version === currentVersion) return false
  return dismissed !== info.version
}

export function dismissUpdate(version: string): void {
  dismissed = version
}

/** 清缓存（测试与"检查更新"按钮用） */
export function resetUpdateCache(): void {
  cached = null
  dismissed = null
}

export async function checkAppUpdate(
  fetchImpl: (input: string) => Promise<{ ok: boolean; json(): Promise<AppUpdateInfo> }> = (
    input,
  ) => fetch(input) as never,
): Promise<AppUpdateInfo | null> {
  cached ??= fetchImpl('/api/app-update')
    .then((response) => (response.ok ? response.json() : null))
    .catch(() => null)
  return cached
}
