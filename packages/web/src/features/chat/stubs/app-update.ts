/**
 * @design D-U-02 的桩：应用更新检查。
 *
 * pi-web 有 `GET /api/app-update`（`ref_projects/pi-web/components/ChatWindow.tsx:106`），
 * evo-pi 还没有对应端点。桩返回**形状与 pi-web 相同**的对象，
 * 让 `app-update-banner` 可以先独立开发并单测。
 * 桩是契约实现，不是 mock 发挥：形状来自 `lib/types.ts` 的 `AppUpdateResponse`。
 */
export interface AppUpdateResponse {
  updateAvailable: boolean
  currentVersion: string
  latestVersion?: string
}

export async function fetchAppUpdateStub(): Promise<AppUpdateResponse> {
  return { updateAvailable: false, currentVersion: '0.0.0' }
}
