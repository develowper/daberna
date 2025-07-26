import type { HttpContext } from '@adonisjs/core/http'
import collect from 'collect.js'
import Helper, { __ } from '#services/helper_service'
import Setting from '#models/setting'
import Room from '#models/room'
import Telegram from '#services/telegram_service'
import { updateRoomValidator } from '#validators/room'
import { updateSettingValidator } from '#validators/setting'

export default class SettingController {
  async index({ request, inertia }: HttpContext) {
    return inertia.render('Panel/Admin/Setting/Index', {})
  }

  async search({ request, response, auth }: HttpContext) {
    const admin = auth.user

    const page = request.input('page') ?? 1
    const paginate = request.input('paginate') ?? Helper.PAGINATE
    const search = request.input('search')
    const dir = request.input('dir') ?? 'DESC'
    const sort = request.input('order_by') ?? 'id'

    let query = Setting.query()

    if (search) query.where('key', 'like', `%${search}%`)

    return response.json(await query.orderBy(sort, dir).paginate(page, paginate))
  }

  async update({ request, response, auth, session, inertia }: HttpContext) {
    const admin = auth.user
    const id = request.input('id')
    const data = await Setting.query().where('id', '=', id).first()
    if (!data)
      return response.badRequest({
        status: 'danger',
        message: __('not_found_*', {
          item: `${__('settings')}`,
        }),
      })
    await request.validateUsing(updateSettingValidator, { meta: { id: data.id } })

    data.title = request.input('title')
    data.key = request.input('key')
    data.value = request.input('value')

    await data.save()
    Telegram.log(null, 'setting_edited', data)

    return response.json({ message: __('updated_successfully'), status: 'success' })

    return response.badRequest({
      status: 'danger',
      message: __('not_found_*', {
        item: `${__('operation')}`,
      }),
    })
  }
}
