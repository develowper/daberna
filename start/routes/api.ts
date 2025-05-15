// import router from "@adonisjs/core/services/router";

import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
const UserController = () => import('../../app/controllers/api/user_controller.js')
const SettingController = () => import('../../app/controllers/api/setting_controller.js')
const RoomController = () => import('../../app/controllers/api/room_controller.js')
const TransactionController = () => import('../../app/controllers/api/transaction_controller.js')
const BotController = () => import('../../app/controllers/bot_controller.js')
const DoozController = () => import('../../app/controllers/api/dooz_controller.js')
const BlackJackController = () => import('../../app/controllers/api/blackjack_controller.js')
const AdvController = () => import('../../app/controllers/api/adv_controller.js')
const DabernaController = () => import('../../app/controllers/api/daberna_controller.js')

export default () => {
  router.any('api/payment/done', [TransactionController, 'done']).as('api.payment.done')
  router.any('api/send-log', [BotController, 'sendLog']).as('api.bot.telegram.log')
  router
    .post('api/bot/telegram/update', [BotController, 'getUpdates'])
    .as('api.bot.telegram.update')

  //auth
  router
    .group(() => {
      router
        .post('user/telegram/connect', [UserController, 'getTelegramLink'])
        .as('telegram.connect')
      router.delete('logout', [UserController, 'logout']).as('logout')
      router.get('user/info', [UserController, 'info']).as('info')
      router.post('user/update', [UserController, 'update']).as('update')
      router.get('settings', [SettingController, 'get']).as('settings')
      router.get('room/get', [RoomController, 'get']).as('room.get')
      router.post('room/join', [RoomController, 'payAndJoin']).as('room.join')
      router.post('transaction/create', [TransactionController, 'create']).as('transaction.create')
      router.get('transaction/search', [TransactionController, 'search']).as('transaction.search')
      router.get('dooz/find', [DoozController, 'find']).as('dooz.find')
      router.post('dooz/play', [DoozController, 'play']).as('dooz.play')
      router.get('blackjack/find', [BlackJackController, 'find']).as('blackjack.find')
      router.post('blackjack/play', [BlackJackController, 'play']).as('blackjack.play')
      router.get('adv/get', [AdvController, 'get']).as('adv.get')
      router.post('adv/click', [AdvController, 'click']).as('adv.click')
      router.get('daberna/search', [DabernaController, 'search']).as('daberna.search')
    })
    // .use(middleware.checkServerStatus)
    .use(
      middleware.auth_user({
        guards: ['api'],
      })
    )
    .as('api.user')
    .prefix('api')

  //guest
  router
    .group(() => {
      router.post('user/register', [UserController, 'register']).as('register')
      router.post('user/login', [UserController, 'login']).as('login')
      router.post('user/forget', [UserController, 'forget']).as('forget')
    })
    .use(
      middleware.guest_user({
        guards: ['api'],
      })
    )

    .as('api.user')
    .prefix('api')
}
