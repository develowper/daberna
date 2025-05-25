import router from '@adonisjs/core/services/router'

const AuthController = () => import('#controllers/auth_controller')
const PanelController = () => import('#controllers/panel_controller')
const DabernaController = (await import('#controllers/admin/daberna_controller'))?.default

import { middleware } from '#start/kernel'
import Daberna from '#models/daberna'
import Room from '#models/room'
import Helper, { __, asPrice, replace, sleep, startsWith } from '#services/helper_service'
import Transaction from '#models/transaction'
import Setting from '../../app/models/setting.js'
import User from '../../app/models/user.js'
import hash from '@adonisjs/core/services/hash'
import SettingController from '../../app/controllers/api/setting_controller.js'
import { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { fakerFA as faker } from '@faker-js/faker'
import vine from '@vinejs/vine'
import Telegram from '#services/telegram_service'
import collect from 'collect.js'
import env from '#start/env'
import { af } from '@faker-js/faker/dist/airline-BnpeTvY9.js'
import redis from '@adonisjs/redis/services/main'
export default function () {
  router.get('test', async () => {

    await redis.set('testKey', 'testValue', 'EX', 90)
    await sleep(2000)
    await redis.expire('testKey', 90)
    await sleep(2000)

    return await redis.ttl('testKey')

    return
    return collect(JSON.parse((await Setting.findBy({ key: 'gateways' }))?.value ?? '[]'))
      .where('key', 'ZARINPAL')
      .where('active', 1)
      .random()?.value
    return await Setting.create({
      key: 'gateways',
      title: __('pay_gates'),
      value: JSON.stringify([
        {
          key: 'ZARINPAL',
          active: 1,
          title: '1',
          value: env.get('ZARINPAL_1'),
        },
        {
          key: 'ZARINPAL',
          active: 0,
          title: '2',
          value: env.get('ZARINPAL_2'),
        },
      ]),
    })
    // return DabernaController.search()
    return await User.makeRefCode()
    const room = await Room.first()
    room.players = JSON.stringify([
      { user_id: 2, username: 'mojraj', user_role: 'us', card_count: 2 },
      { user_id: 3, username: 'mojraj2', user_role: 'us', card_count: 2 },
    ])
    room.cardCount = 4
    room.playerCount = 2
    room.save()
    // return room
    return Daberna.makeGame(room)

    return await Setting.findBy({ key: 'policy' })

    return await Setting.query()
      .where('key', 'withdraw_title')
      .update({
        value: __('withdraw_title', {
          item1: asPrice(`${Helper.MIN_WITHDRAW}`),
          item2: `${Helper.WITHDRAW_HOUR_LIMIT} ${__('hour')}`,
        }),
      })
    return await Setting.createMany([{ key: 'policy', value: __('policy_content') }])

    return Transaction.makePayUrl(Date.now(), 2000, 'ali', 'description', '09011111111', 2)
    return Daberna.makeGame(await Room.first())
  })

  router
    .get('policy', async ({ request, response }: HttpContext) => {
      if (request.header('Accept')?.includes('application/json'))
        return response.send({ data: (await Setting.findBy('key', 'policy'))?.value })
    })
    .as('policy')

  router.on('/').renderInertia('Main', { prop1: 'test' }).as('/')
  router.on('contact-us').renderInertia('ContactUs', { prop1: 'test' }).as('page.contact_us')
  router.on('articles').renderInertia('Article/Index', {}).as('article.index')

  router
    .group(() => {
      router.post('register', [AuthController, 'register']).as('auth.register')
      router.post('login', [AuthController, 'login']).as('auth.login')
      router.on('login').renderInertia('Auth/Login', {}).as('login-form')
    })
    .use(
      middleware.guest_user({
        guards: ['web' /*, 'api'*/],
      })
    )
    .as('user')

  router
    .group(() => {
      router.delete('logout', [AuthController, 'logout']).as('auth.logout')
      router.get('me', [AuthController, 'me']).as('auth.me')

      router
        .group(() => {
          router.get('', [PanelController, 'index']).as('index')
        })
        .prefix('panel')
        .as('panel')
    })
    .use(
      middleware.auth_user({
        guards: ['web' /*, 'api'*/],
      })
    )
    .as('user')
}
