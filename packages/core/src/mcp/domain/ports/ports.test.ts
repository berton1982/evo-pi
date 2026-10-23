import { describe, expectTypeOf, it } from 'vitest'
import type { McpServerRef, Outcome } from '../mcp-types'
import type { McpRepository, McpSignInFlowPort, McpTestRunner, ProjectTrustPort } from './index'

/**
 * 端口是接口，这里的断言是「调用方拿得到这些方法，签名形状不漂」。
 * 运行期行为由各用例的桩测试覆盖（load-overview / actions / sign-in-flow）。
 */
describe('C-G 端口（编译期）', () => {
  it('T-04 McpRepository 四方法齐全', () => {
    expectTypeOf<McpRepository>().toHaveProperty('list')
    expectTypeOf<McpRepository>().toHaveProperty('write')
    expectTypeOf<McpRepository>().toHaveProperty('add')
    expectTypeOf<McpRepository>().toHaveProperty('remove')
    const fake: McpRepository = {
      list: async () => ({ ok: true, value: [] }),
      write: async (_ref: McpServerRef): Promise<Outcome<void>> => ({ ok: true }),
      add: async () => ({ ok: true, value: { servers: [] } }),
      remove: async () => ({ ok: true }),
    }
    expectTypeOf(fake.list).toBeFunction()
  })

  it('T-04 其余四个端口的形状', () => {
    expectTypeOf<McpTestRunner>().toHaveProperty('run')
    expectTypeOf<ProjectTrustPort>().toHaveProperty('request')
    expectTypeOf<McpSignInFlowPort>().toHaveProperty('begin')
  })
})
