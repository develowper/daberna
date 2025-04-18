import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { Authenticators } from '@adonisjs/auth/types'
import i18nManager from '@adonisjs/i18n/services/main'

/**
 * Guest middleware is used to deny access to routes that should
 * be accessed by unauthenticated users.
 *
 * For example, the login page should not be accessible if the user
 * is already logged-in
 */
export default class GuestAdminMiddleware {
  /**
   * The URL to redirect to when user is logged-in
   */
  redirectTo = '/'

  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: { guards?: (keyof Authenticators)[] } = {}
  ) {
    for (let guard of options.guards || [ctx.auth.defaultGuard]) {
      if (guard.includes('admin') && (await ctx.auth.use(guard).check())) {
        return ctx.response.redirect(this.redirectTo, true)
      }
    }
    if ('inertia' in ctx) {
      ctx.inertia.share({
        errors: ctx.session.flashMessages.get('errors'),
      })
    }
    await next()
    // if ('inertia' in ctx) {
    //   ctx.inertia.share({
    //     errors: ctx.session.flashMessages.get('errors'),
    //   })
    // }
  }
}
