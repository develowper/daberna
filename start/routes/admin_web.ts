// import router from "@adonisjs/core/services/router";

import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import { HttpContext } from '@adonisjs/core/http'
import { throttleWebGuest } from '#start/limiter'
const DabernaController = () => import('#controllers/admin/daberna_controller')
const RoomController = () => import('#controllers/admin/room_controller')
const UserFinancialController = () => import('#controllers/admin/user_financial_controller')
const UserController = () => import('#controllers/admin/user_controller')
const TransactionController = () => import('#controllers/admin/transaction_controller')
const AdminController = () => import('#controllers/admin_controller')
const AuthController = () => import('#controllers/auth_controller')
const PanelController = () => import('#controllers/panel_controller')
const SettingController = () => import('#controllers/admin/setting_controller')
const SocketController = () => import('#controllers/admin/socket_controller')
const LogController = () => import('#controllers/admin/log_controller')

export default () => {
  router.get('daberna/search', [DabernaController, 'search']).as('daberna.search')

  router
    .group(() => {
      router.post('login', [AuthController, 'login']).as('auth.login').use(throttleWebGuest)
      router.on('login').renderInertia('Auth/Login', {}).as('login-form')
    })
    .use(
      middleware.guest_admin({
        guards: ['web' /*, 'api'*/],
      })
    )

    .as('admin')
    .prefix('admin')

  //auth
  router
    .group(() => {
      router
        .group(() => {
          router.get('', [PanelController, 'index']).as('index')
          router.on('ticket/index').renderInertia('Panel/Admin/Ticket/Index').as('ticket.index')
          router
            .on('notification/index')
            .renderInertia('Panel/Admin/Notification/Index')
            .as('notification.index')
          router
            .route('transaction/index', ['GET', 'POST'], [TransactionController, 'index'])
            .as('transaction.index')

          router
            .get('transaction/search', [TransactionController, 'search'])
            .as('transaction.search')
          router
            .patch('transaction/update', [TransactionController, 'update'])
            .as('transaction.update')

          router.get('user/index', [UserController, 'index']).as('user.index')

          router.get('user/search', [UserController, 'search']).as('user.search')
          router
            .get('user/financial-search', [UserFinancialController, 'search'])
            .as('user.financial.search')
          router.get('user/create', [UserController, 'create']).as('user.create')
          router.post('user/store', [UserController, 'store']).as('user.store')
          router.patch('user/update', [UserController, 'update']).as('user.update')
          router.get('user/:id', [UserController, 'edit']).as('user.edit')

          router.get('room/search', [RoomController, 'search']).as('room.search')
          router.get('room/index', [RoomController, 'index']).as('room.index')
          router.get('room/create', [RoomController, 'create']).as('room.create')
          router.post('room/store', [RoomController, 'store']).as('room.store')
          router.patch('room/update', [RoomController, 'update']).as('room.update')
          router.get('room/:id', [RoomController, 'edit']).as('room.edit')
          router.get('room-live/:id', [RoomController, 'live']).as('room.live')

          router.get('setting/index', [SettingController, 'index']).as('setting.index')
          router.get('setting/search', [SettingController, 'search']).as('setting.search')
          router.patch('setting/update', [SettingController, 'update']).as('setting.update')

          router.get('log/search', [LogController, 'search']).as('log.search')
          router.get('log/index', [LogController, 'index']).as('log.index')

          router.get('daberna/search', [DabernaController, 'search']).as('daberna.search')
          router.get('daberna/index', [DabernaController, 'index']).as('daberna.index')
        })
        .prefix('panel')
        .as('panel')

      router.post('logout', [AuthController, 'logout']).as('auth.logout')
    })
    .use(
      middleware.auth_admin({
        guards: ['admin_web' /*, 'api'*/],
      })
    )

    .as('admin')
    .prefix('admin')
}

router
  .any('socket.io', [SocketController, 'connect'])
  .as('socket.connect')
  .use(
    middleware.auth_admin({
      guards: ['admin_web' /*, 'api'*/],
    })
  )
