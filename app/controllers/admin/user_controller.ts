// import type { HttpContext } from '@adonisjs/core/http'

import type { HttpContext } from '@adonisjs/core/http'
import UserFinancial from '#models/user_financial'
import Helper, { __ } from '#services/helper_service'
import User from '#models/user'
import Transaction from '#models/transaction'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'
import collect from 'collect.js'
import { createUserFakeValidator, createUserValidator, updateUserValidator } from '#validators/user'
import Telegram from '#services/telegram_service'
import hash from '@adonisjs/core/services/hash'
import db from '@adonisjs/lucid/services/db'

export default class UserController {
  //
  async index({ request, inertia }: HttpContext) {
    return inertia.render('Panel/Admin/User/Index', {
      types: collect(Helper.TRANSACTION.types).map((item: string) => {
        return { name: item, color: Helper.TRANSACTION.colors[item] }
      }),
    })
  }
  async edit({ request, inertia, params }: HttpContext) {
    return inertia.render('Panel/Admin/User/Edit', {
      data: await User.query()
        .preload('financial')
        .where({ id: params.id ?? 0 })
        .first(),
      user_roles: Helper.USER_ROLES,
      user_statuses: collect(Helper.USER_STATUSES).pluck('name'),
    })
  }
  async create({ request, inertia }: HttpContext) {
    return inertia.render('Panel/Admin/User/Create', {
      user_roles: Helper.USER_ROLES,
      user_statuses: collect(Helper.USER_STATUSES).pluck('name'),
    })
  }
  async store({ request, response, inertia, auth, session }: HttpContext) {
    const admin = auth.user
    const role = request.input('role')

    if (role === 'bo') {
      const data = await request.validateUsing(createUserFakeValidator)
      await User.fake(data.count)
    } else {
      await request.validateUsing(createUserValidator)

      const user = await User.create({
        fullName: request.input('full_name'),
        username: request.input('username'),
        phone: request.input('phone'),
        isActive: true,
        password: request.input('password'),
        agencyId: /*request.input('agency_id') ?? */ admin?.agencyId,
        refId: await User.makeRefCode(),
      })

      const userFinancial = await user.related('financial').create({
        card: request.input('card'),
        sheba: request.input('sheba'),
      })
      Telegram.log(null, 'user_created', user)
    }
    session.flash('notification', { message: __('created_successfully'), status: 'success' })
    return response.redirect().toRoute('admin.panel.user.index')
  }
  async search({ request, response, auth }: HttpContext) {
    const user = auth.user
    const userId = user?.id
    const page = request.input('page') ?? 1
    const paginate = request.input('paginate') ?? Helper.PAGINATE
    const search = request.input('search')
    const type = request.input('type')
    const dir = request.input('dir') ?? 'DESC'
    const sort = request.input('order_by') ?? 'created_at'
    const where = request.input('where') ?? null
    let query = User.query()
    // .whereNotNull('payed_at')
    // .where((query) => {
    //   query.where({ fromId: userId, fromType: 'user' }).orWhere({ toId: userId, toType: 'user' })
    // })

    if (search)
      query.where((query) => {
        query.where('username', 'like', `%${search}%`).orWhere('id', 'like', `%${search}%`)
      })
    if (type) {
      query.where('type', type)
    }
    if (where) {
      query.where(where)
    }

    return response.json(await query.orderBy(sort, dir).paginate(page, paginate))
  }

  async update({ request, response, auth, session, inertia }: HttpContext) {
    const admin = auth.user
    const id = request.input('id')
    const desc = request.input('description')
    const cmnd = request.input('cmnd')
    const amount = Number.parseInt(request.input('amount'))
    const isActive = request.input('status') == 'active'
    const data = await User.query().preload('financial').where('id', '=', id).first()
    const now = DateTime.now()
    if (!data)
      return response.badRequest({
        status: 'danger',
        message: __('not_found_*', {
          item: `${__('user')}`,
        }),
      })

    switch (cmnd) {
      case 'status':
        data.isActive = isActive
        if (!isActive) await db.from('auth_access_tokens').where('tokenable_id', data.id).delete()
        data.save()
        Telegram.log(null, 'user_edited', data)
        return response.send({
          status: 'success',
          message: __('updated_successfully'),
          is_active: data.isActive ? 1 : 0,
        })

        break
      case 'remove':
        await User.deleteAllInfo(data)

        Telegram.log(null, 'user_removed', data)

        return response.send({
          status: 'success',
          message: __('updated_successfully'),
          removed: true,
        })
        break
      case 'withdraw':
      case 'charge':
        await request.validateUsing(
          vine.compile(
            vine.object({
              amount:
                cmnd == 'withdraw'
                  ? vine.number().positive().withoutDecimals().max(data.financial.balance)
                  : vine.number().positive().withoutDecimals(),
              description: vine.string().maxLength(255),
            })
          )
        )
        const t = await Transaction.create({
          agencyId: data?.agencyId,
          title: desc,
          type: cmnd,
          gateway: 'wallet',
          fromType: 'user',
          fromId: data?.id,
          toType: 'user',
          toId: data?.id,
          amount: amount,
          payId: now.toMillis(),
          payedAt: now,
          appVersion: null,
        })
        if (cmnd == 'withdraw') data.financial.balance -= amount
        else data.financial.balance += amount
        data.financial.save()
        Telegram.log(null, 'transaction_created', t)

        return response.send({
          status: 'success',
          message: __('updated_successfully'),
          balance: data.financial.balance,
        })
        break

      case 'info':
        await request.validateUsing(updateUserValidator, { meta: { id: data.id } })
        data.financial.card = request.input('card')
        data.financial.sheba = request.input('sheba')

        await data.financial.save()

        data.fullName = request.input('full_name')
        data.username = request.input('username')
        data.phone = request.input('phone')
        data.role = request.input('role')
        data.isActive = request.input('status') == 'active'
        if (request.input('password')) {
          data.password = request.input('password')
        }
        await data.save()
        session.flash('notification', { message: __('updated_successfully'), status: 'success' })
        Telegram.log(null, 'user_edited', data)

        return response.redirect().back()
        return response.redirect().toRoute('admin.panel.user.index')
        break
    }
    return response.badRequest({
      status: 'danger',
      message: __('not_found_*', {
        item: `${__('operation')}`,
      }),
    })
  }
}
