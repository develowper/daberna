import {defineConfig} from '@adonisjs/auth'
import {sessionGuard, sessionUserProvider} from '@adonisjs/auth/session'
import type {InferAuthEvents, Authenticators} from '@adonisjs/auth/types'
import {tokensGuard, tokensUserProvider} from "@adonisjs/auth/access_tokens";

const authConfig = defineConfig({
  default: 'web',
  guards: {
    web: sessionGuard({
      useRememberMeTokens: false,
      provider: sessionUserProvider({
        model: () => import('#models/user')
      }),
    }),
    api: tokensGuard({
      provider: tokensUserProvider({
        tokens: 'accessTokens',
        model: () => import('#models/user')
      }),
    }),
    admin_web: sessionGuard({
      useRememberMeTokens: false,
      provider: sessionUserProvider({
        model: () => import('#models/user')
      }),
    }),
    admin_api: tokensGuard({
      provider: tokensUserProvider({
        tokens: 'accessTokens',
        model: () => import('#models/user')
      }),
    }),
  },
})

export default authConfig

/**
 * Inferring types from the configured auth
 * guards.
 */
declare module '@adonisjs/auth/types' {
  export interface Authenticators extends InferAuthenticators<typeof authConfig> {
  }
}
declare module '@adonisjs/core/types' {
  interface EventsList extends InferAuthEvents<Authenticators> {
  }
}
