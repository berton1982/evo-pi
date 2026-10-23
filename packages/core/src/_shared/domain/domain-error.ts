/**
 * DomainError abstract base class.
 *
 * 所有 capability 内部抛出的业务错误的根（per capability-boundary-final §5.2）。
 * 子类必须声明 readonly `kind` discriminator（per ADR 0003 + Clean Architecture
 * use-cases 异常约定）。
 *
 * 为什么用 class 而非 discriminated union：
 * - DomainError 需要携带 cause（底层 SDK / fs error）
 * - 子类需要被 instance-of 检查（catch block 分流）
 * - 与 Error 原型链集成（stack trace 正确）
 *
 * 子类示例（per capability）：
 *   class SessionNotFoundError extends DomainError {
 *     readonly kind = 'session_not_found' as const
 *   }
 */

export abstract class DomainError extends Error {
  abstract readonly kind: string

  constructor(
    message: string,
    public override readonly cause?: unknown,
  ) {
    super(message)
    // 保留正确的 prototype chain（TypeScript class extends Error 时必需）
    Object.setPrototypeOf(this, new.target.prototype)
    this.name = new.target.name
  }
}
