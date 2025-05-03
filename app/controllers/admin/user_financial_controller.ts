// import type { HttpContext } from '@adonisjs/core/http'

import type { HttpContext } from '@adonisjs/core/http'
import UserFinancial from '#models/user_financial'
import Helper, { isPG } from '#services/helper_service'
import User from '#models/user'
import db from '@adonisjs/lucid/services/db'

export default class UserFinancialController {
  //
  async search({ request, response, auth }: HttpContext) {
    const user = auth.user
    const forTable = ['balance', 'card', 'sheba'].includes(request.input('order_by'))
      ? 'user_financials'
      : 'users'
    const userId = request.input('user_id') ?? null
    const page = request.input('page') ?? 1
    const search = request.input('search')
    // const type = request.input('type')
    const dir = request.input('dir') ?? 'DESC'
    const payedAt = request.input('payed_at')
    const sort = `${forTable}.${request.input('order_by') ?? 'created_at'}`
    const paginate = request.input('paginate') ?? Helper.PAGINATE
    let query = db.from('users').join('user_financials', (query) => {
      query.on('users.id', '=', 'user_financials.user_id')
      // .andOnVal('user_logins.created_at', '>', '2020-10-09')
    })
    // .whereNotNull('payed_at')
    // .where((query) => {
    //   query.where({ fromId: userId, fromType: 'user' }).orWhere({ toId: userId, toType: 'user' })
    // })
    query.select(
      'users.id as id',
      'users.full_name as full_name',
      'users.username as username',
      'users.phone as phone',
      'users.role as role',
      'users.is_active as is_active',
      'users.ref_count as ref_count',
      'users.telegram_id as telegram_id',
      'users.created_at as created_at',
      'user_financials.balance as balance',
      'user_financials.card as card'
    )
    if (search) {
      if (isPG())
        query.where((q) => {
          q.orWhereRaw(`users.id::text ILIKE ?`, [`%${search}%`])
          q.orWhereRaw(`users.full_name ILIKE ?`, [`%${search}%`])
          q.orWhereRaw(`users.username ILIKE ?`, [`%${search}%`])
          q.orWhereRaw(`users.telegram_id ILIKE ?`, [`%${search}%`])
        })
      else
        query.where((q) => {
          q.orWhere('users.id', `%${search}%`)
            .orWhere('users.full_name', 'like', `%${search}%`)
            .orWhere('users.username', 'like', `%${search}%`)
            .orWhere('users.telegram_id', 'like', `%${search}%`)
        })
    }
    if (userId) {
      if (isPG()) query.where('users.id', Number(userId))
      else query.where('users.id', userId)
    }

    return response.json(await query.orderBy(sort, dir).paginate(page, paginate))
  }
}
