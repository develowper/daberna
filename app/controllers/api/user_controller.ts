import { HttpContext, Route } from '@adonisjs/core/http'
import { loginValidator, registerValidator, updateValidator } from '#validators/auth'
import User from '#models/user'
import Helper, { __ } from '../../services/helper_service.js'
import UserFinancial from '../../models/user_financial.js'
import hash from '@adonisjs/core/services/hash'
import Setting from '#models/setting'
import { DateTime } from 'luxon'
import Telegram from '#services/telegram_service'

export default class UserController {
  async update({ response, request, auth }) {
    const user: User = auth?.user

    const financial = await UserFinancial.firstOrCreate({ userId: user?.id })
    const type = request.input('type')
    const fullName = request.input('full_name')
    const username = request.input('username')
    const phone = request.input('phone')
    const card = request.input('card')
    const sheba = request.input('sheba')
    const password = request.input('password')
    const data = await request.validateUsing(updateValidator, { meta: { id: user?.id } })
    switch (type) {
      case 'user':
        if (fullName && user?.fullName && fullName != user?.fullName)
          return response.badRequest({
            message: __('only_editable_by_admin_*', { item: __('full_name') }),
          })
        if (username && user?.username && username != user?.username)
          return response.badRequest({
            message: __('only_editable_by_admin_*', { item: __('username') }),
          })
        user
          ?.merge({
            fullName: fullName ?? user.fullName,
            username: username,
            phone: phone,
          })
          .save()
        financial
          .merge({
            card: card,
            sheba: sheba,
          })
          .save()
        return response.send({
          status: 'success',
          message: __('edited_successfully'),
          user,
          financial,
        })

        break
      case 'password':
        if (password) {
          //hash automatically before save if is dirty
          user.password = password
          await user.save()
          return response.send({ status: 'success', message: __('edited_successfully') })
        }
        break
    }
  }

  async forget({ response }: HttpContext) {
    const telegram = await Setting.findBy('key', 'telegram_bot')
    return response.json({ url: `https://t.me/${telegram?.value}?start=recover_password` })
  }

  async register({ request, response, i18n }: HttpContext) {
    const isActive = await Helper.getSettings('register_is_active')
    if (!isActive)
      return response.badRequest({
        message: __('is_inactive_*', { item: __('register') }),
        status: 'danger',
      })
    const data = await request.validateUsing(registerValidator)

    const user = await User.create({ ...data, agencyId: 1, agencyLevel: 0, isActive: true })
    const tokenData = await User.accessTokens.create(user)
    const financial = await UserFinancial.create({ userId: user.id, balance: 0 })
    user.ip = request.ip()
    await Telegram.log(null, 'user_created', user)
    return response.json({
      status: 'success',
      token: tokenData.value!.release(),
      id: user?.id,
      username: user?.username,
      fullName: user?.fullName,
      isActive: user?.isActive,
      financial: financial,
      message: i18n.t('messages.welcome'),
    })
  }

  async login({ request, auth, response, i18n }: HttpContext) {
    const { username, password } = await request.validateUsing(loginValidator)

    const user = await User.verifyCredentials(username, password)

    if (!user.isActive)
      return response.status(Helper.ERROR_STATUS).json({
        status: 'danger',
        message: i18n.t('is_inactive_*', { item: i18n.t('user') }),
      })
    // auth.authenticateUsing(['api'])
    const tokenData = await User.accessTokens.create(user)

    return response.json({
      status: 'success',
      token: tokenData.value!.release(),
      message: i18n.t('messages.welcome'),
    })
  }

  async logout({ request, auth, response }: HttpContext) {
    let user
    if (request.url().indexOf('admin') >= 0) user = auth.use('admin_api').user!
    user = auth.use('api').user!
    const token = user?.currentAccessToken.identifier
    if (!token) {
      return response.badRequest({ message: 'Token not found' })
    }
    await User.accessTokens.delete(user, token)
    return { message: 'Success' }
  }

  async info({ auth, response }: HttpContext) {
    // await auth.check()
    const user: User = auth.use('api').user

    return response.json({
      status: 'success',
      user: user?.serialize(),
      financial: await user.getUserFinancial(),
    })
  }
  async getTelegramLink({ auth, response }: HttpContext) {
    const telegramBot = await Helper.getSettings('telegram_bot')
    const user = auth.user
    user.storage = `connect-${DateTime.now().toMillis()}`
    user?.save()
    const url = `https://t.me/${telegramBot ?? ''}?start=${user?.storage}`
    return response.json({ status: 'success', url: url })
  }
}
