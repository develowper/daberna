// import type { HttpContext } from '@adonisjs/core/http'

import type { HttpContext } from '@adonisjs/core/http'
import {
  cardToCardValidator,
  chargeValidator,
  winWheelValidator,
  withdrawValidator,
} from '#validators/transaction'
import Transaction from '#models/transaction'
import Helper, { __, asPrice, getSettings } from '#services/helper_service'
import { DateTime } from 'luxon'
import User from '#models/user'
import Admin from '#models/admin'
import Telegram from '#services/telegram_service'
import Setting from '../../models/setting.js'
import UserFinancial from '../../models/user_financial.js'
import collect from 'collect.js'
import AgencyFinancial from '../../models/agency_financial.js'
import Daberna from '#models/daberna'
export default class TransactionsController {
  //
  async create({ request, response, auth, i18n }: HttpContext) {
    const amount = Helper.f2e(request.input('amount'))
    const type = request.input('type')
    const fromType = request.input('from_type')
    const user = auth.user
    const appVersion = request.input('app_version')
    const fromId = user?.id
    const orderId = Date.now()
    const fromCard = request.input('card')
    const toCard = request.input('to_card')
    const now = DateTime.now()
    let desc
    const gapTransactionMinutes = await getSettings('cardtocard_minute_limit')

    if (!user.isActive) {
      return response.status(Helper.ERROR_STATUS).json({
        status: 'danger',
        message: i18n.t('messages.is_inactive_*', { item: i18n.t('messages.user') }),
      })
    }

    switch (type) {
      case 'charge':
        await request.validateUsing(chargeValidator)
        const lastChargeTransaction = await Transaction.query()
          .where('type', type)
          .where('to_type', 'user')
          .where('to_id', user?.id)
          .where(
            'created_at',
            '>',
            DateTime.now().minus({ minutes: gapTransactionMinutes }).toJSDate()
          )
          .first()

        if (lastChargeTransaction) {
          return response.status(Helper.ERROR_STATUS).json({
            status: 'danger',
            message: __('gap_requests_is_*', {
              item: `${gapTransactionMinutes} ${__('minute')}`,
            }),
          })
        }

        desc = __('wallet_charge_*_by_*', {
          item1: `${asPrice(`${amount}`)} ${__('currency')}`,
          item2: `${__(fromType)} (${user?.username ?? fromId})`,
        })
        const res = await Transaction.makePayUrl(
          orderId,
          amount,
          user?.username as string,
          desc,
          user?.phone,
          user?.id
        )
        if (res.status !== 'success') {
          return response
            .status(Helper.ERROR_STATUS)
            .json({ status: 'danger', message: res.message })
        }
        await Transaction.create({
          agencyId: user?.agencyId,
          title: desc,
          type: type,
          gateway: Helper.BANK,
          fromType: 'user',
          fromId: user?.id,
          toType: 'user',
          toId: user?.id,
          amount: amount,
          payId: res.order_id,
          gatewayId: res.gateway_id,
          appVersion: appVersion,
        })

        // }
        return response.json({
          status: res.status,
          message: __('redirect_to_payment_page'),
          url: res.url,
        })
        break
      case 'cardtocard':
        await request.validateUsing(cardToCardValidator)

        desc = __('cardtocard_*_from_*_to_*', {
          item1: `${asPrice(amount)} ${__('currency')}`,
          item2: `${fromCard}`,
          item3: `${toCard}`,
        })
        const lastTransaction = await Transaction.query()
          .where('type', type)
          .where('to_type', 'user')
          .where('to_id', user?.id)
          .where(
            'created_at',
            '>',
            DateTime.now().minus({ minutes: gapTransactionMinutes }).toJSDate()
          )
          .first()

        if (lastTransaction) {
          return response.status(Helper.ERROR_STATUS).json({
            status: 'danger',
            message: __('gap_requests_is_*', {
              item: `${gapTransactionMinutes} ${__('minute')}`,
            }),
          })
        }
        const cards: { active: number; number: string; name: string }[] = JSON.parse(
          (await getSettings('card_to_card')) ?? '[]'
        )
        if (!collect(cards).where('active', 1).first()) {
          return response.status(Helper.ERROR_STATUS).json({
            status: 'danger',
            message: __('is_inactive_*', {
              item: __('cardtocard'),
            }),
          })
        }

        await Transaction.create({
          agencyId: user?.agencyId,
          title: desc,
          type: type,
          gateway: 'wallet',
          fromType: 'user',
          fromId: user?.id,
          toType: 'user',
          toId: user?.id,
          amount: amount,
          payId: `${orderId}`,
          appVersion: appVersion,
          info: JSON.stringify({ from_card: fromCard, to_card: toCard }),
        })
        return response.json({
          status: 'success',
          message: __('request_registered_successfully'),
        })

        break
      case 'winwheel':
        await request.validateUsing(winWheelValidator)

        const winWheel = JSON.parse((await Setting.query().where('key', 'winwheel').first())?.value)
        const winWheelGapHours = winWheel?.limit_hour

        if (!winWheel || winWheel.active != 1) {
          return response.status(Helper.ERROR_STATUS).json({
            status: 'danger',
            message: __('*_is_*', {
              item1: __('winwheel'),
              item2: __('inactive'),
            }),
          })
        }
        const lastWinWheel = await Transaction.query()
          .where('type', type)
          .where('to_type', 'user')
          .where('to_id', user?.id)
          .where('created_at', '>', now.minus({ hours: winWheelGapHours }).toJSDate())
          .first()

        if (lastWinWheel) {
          const diffInMinutes = Math.round(
            lastWinWheel.createdAt.plus({ hours: winWheelGapHours }).diff(now, 'minutes').minutes
          )
          const hour = Math.floor(diffInMinutes / 60)
          const min = Math.floor(diffInMinutes % 60)
          return response.status(Helper.ERROR_STATUS).json({
            status: 'danger',
            message: __('try_*_*_later', { item1: `${hour}`, item2: `${min}` }),
          })
        }

        const played = await Daberna.query()
          .where('boards', 'like', `%id":${fromId},%`)
          .count('* as total')
        const playedCount = played[0]?.$extras.total ?? 0
        if (playedCount < Helper.PLAY_COUNT_FOR_ACTIVE_WINWHEEL)
          return response.status(Helper.ERROR_STATUS).json({
            status: 'danger',
            message: __('you_most_play_*_for_winwheel_yours_*', {
              item1: Helper.PLAY_COUNT_FOR_ACTIVE_WINWHEEL,
              item2: playedCount,
            }),
          })

        const randomIndex = Math.floor(Math.random() * winWheel.labels.length)
        const winLabel = Number.parseInt(`${winWheel.labels[randomIndex].value}`)

        // rotate again
        if (winLabel == -1)
          return response.json({
            status: 'success',
            message: __('rotate_again'),
            prize: winLabel,
            index: randomIndex,
          })
        desc = __('winwheel_prize_*', { item: asPrice(`${winLabel}`) })

        const transaction = await Transaction.create({
          agencyId: user?.agencyId,
          title: desc,
          type: type,
          gateway: 'wallet',
          fromType: 'agency',
          fromId: user?.agencyId,
          toType: 'user',
          toId: user?.id,
          amount: winLabel,
          payId: `${orderId}`,
          appVersion: appVersion,
          info: null,
          payedAt: now,
        })
        let msg = __('no_prize_unfortunately')
        if (winLabel > 0) {
          const financial = await UserFinancial.firstOrNew({
            userId: transaction.toId,
          })
          financial.merge({
            balance: (financial.balance ?? 0) + transaction.amount,
          })
          await financial.save()

          const agencyFinancial = await AgencyFinancial.firstOrNew({
            agencyId: transaction.fromId,
          })
          agencyFinancial.merge({
            balance: (agencyFinancial.balance ?? 0) - transaction.amount,
          })
          await agencyFinancial.save()
          msg = __('wallet_added_*', { item: `${winLabel}` })
        }
        return response.json({
          status: 'success',
          message: msg,
          prize: winLabel,
          index: randomIndex,
        })
        break
      case 'withdraw':
        await request.validateUsing(withdrawValidator)

        const withdrawGapHours = Helper.WITHDRAW_HOUR_LIMIT
        const lastWthdraw = await Transaction.query()
          .where('to_type', 'user')
          .where('to_id', user?.id)
          .where('type', type)
          .where('created_at', '>', now.minus({ hours: withdrawGapHours }).toJSDate())
          .first()

        if (lastWthdraw) {
          const diffInMinutes = Math.round(
            lastWthdraw.createdAt.plus({ hours: withdrawGapHours }).diff(now, 'minutes').minutes
          )
          const hour = Math.floor(diffInMinutes / 60)
          const min = Math.floor(diffInMinutes % 60)
          return response.status(Helper.ERROR_STATUS).json({
            status: 'danger',
            message: __('try_*_*_later', { item1: `${hour}`, item2: `${min}` }),
          })
        }
        if (!user.fullName) {
          return response.status(Helper.ERROR_STATUS).json({
            status: 'danger',
            message: __('add_from_profile_*', { item: __('name') }),
          })
        }
        const financial = await UserFinancial.firstOrCreate({
          userId: user?.id,
        })

        if (!financial.card) {
          return response.status(Helper.ERROR_STATUS).json({
            status: 'danger',
            message: __('add_from_profile_*', { item: __('card') }),
          })
        }
        if (financial.balance < amount) {
          return response.status(Helper.ERROR_STATUS).json({
            status: 'danger',
            message: __('messages.validate.max', {
              item: __('amount'),
              value: `${Helper.asPrice(`${amount}`)} ${__('currency')}`,
            }),
          })
        }
        desc = __('withdraw_request_*_*_to_*', {
          item1: Helper.asPrice(`${amount}`),
          item2: `${__('user')} ${user?.fullName} (${user?.id})`,
          item3: financial.card,
        })

        await Transaction.create({
          agencyId: user?.agencyId,
          title: desc,
          type: type,
          gateway: 'wallet',
          fromType: 'user',
          fromId: user?.id,
          toType: 'user',
          toId: user?.id,
          amount: amount,
          payId: `${orderId}`,
          appVersion: appVersion,
          info: JSON.stringify({ to_card: financial.card, to_name: user?.fullName }),
        })
        return response.json({
          status: 'success',
          message: __('request_registered_successfully'),
        })
    }

    // const transaction = await Transaction.query()
    //   .where('for_type', 'agency')
    //   .where('type', 'charge')
    //   .where('for_id', user?.agencyId as number)
    //   .where('from_type', 'user')
    //   .where('from_id', user?.id as number)
    //   .whereNull('payed_at')
    //   .first()
    //
    // if (transaction) {
    //   await transaction
    //     .merge({
    //       payId: res.order_id,
    //       amount: amount,
    //       title: desc,
    //       gateway: Helper.BANK,
    //     })
    //     .save()
    // } else {
  }

  async done({ request, response, inertia }: HttpContext) {
    let status = 'danger'
    const userId = request.input('user_id')
    const market = request.input('market')
    const token = request.input('token')
    const sku = request.input('sku')
    const amount = request.input('amount')
    const appVersion = request.input('app_version')
    const info = request.input('info')
    const orderId = request.input('order_id') ?? `${userId}\$${sku}\$${DateTime.now().toMillis()}`

    if (market && ['bazaar', 'myket'].includes(market)) {
      if (!(await this.checkPayment(sku, token, market))) {
        return response.json({ status: 'danger', message: __('problem_confirm_pay') })
      }

      // const transaction = await Transaction.create({
      //   /* Add necessary fields here */
      // })
      //
      // if (transaction) {
      //   status = 'success'
      //   const user = await User.find(userId)
      // }

      return response.json({ status })
    } else {
      const paymentResponse = await Transaction.confirmPay(request)

      const transaction: Transaction =
        paymentResponse && paymentResponse.order_id
          ? await Transaction.query().where('pay_id', paymentResponse.order_id).first()
          : new Transaction()

      const now = transaction.payedAt ?? DateTime.now()
      const jalaliDate = Helper.toShamsi(now, true)

      status = paymentResponse.status
      const orderToken = paymentResponse.order_id
      const user = await Helper.TRANSACTION_MODELS[transaction?.fromType]?.find(transaction?.fromId)
      const userType = user instanceof Admin ? 'admin' : 'user'

      const column = `${transaction.toType}Id`
      if (status === 'success') {
        if (transaction.type === 'charge') {
          const financial = await Helper.FINANCIAL_MODELS[transaction.toType].firstOrNew(
            { [column]: transaction.toId },
            { [column]: transaction.toId }
          )
          financial.merge({
            balance: (financial.balance ?? 0) + transaction.amount,
            lastCharge: now,
          })
          await financial.save()
        }
        transaction?.merge({
          payedAt: now,
        })
        await transaction.save()

        await user.save()
        transaction.user = user
        Telegram.log(null, 'transaction_created', transaction)
      }

      return inertia.render('Invoice', {
        lang: {
          title: paymentResponse.status === 'success' ? __('payment_success') : __('payment_fail'),
          pay_id: __('pay_id'),
          pay_time: __('time'),
          pay_type: __('pay_type'),
          amount: __('amount'),
          return: transaction.appVersion ? __('return_to_application') : __('return_to_site'),
          currency: __('currency'),
        },
        now: jalaliDate,
        status: paymentResponse.status ?? 'danger',
        pay_id: orderToken ?? '_',
        amount: transaction.amount ?? '_',
        type: transaction.title,
        link:
          transaction?.type === 'charge'
            ? transaction.appVersion
              ? ''
              : transaction.fromType === 'admin'
                ? 'admin.panel.index'
                : 'panel.index'
            : '',
        message: paymentResponse.message ?? '',
      })
    }
  }

  // Assuming you have a method to check payments
  async checkPayment(sku: string, token: string, market: string): Promise<boolean> {
    // Implement the logic to check payment
    return true
  }
  async search({ request, response, auth }: HttpContext) {
    const user = auth.user
    const userId = user?.id
    const page = request.input('page') ?? 1
    const search = request.input('search')
    const type = request.input('type')
    const dir = request.input('dir') ?? 'DESC'
    const sort = request.input('sort') ?? 'created_at'

    let query = Transaction.query()
      .whereNotNull('payed_at')
      .where((query) => {
        query.where({ fromId: userId, fromType: 'user' }).orWhere({ toId: userId, toType: 'user' })
      })

    if (search) query.where('title', 'like', `%${search}%`)
    if (type) {
      if (type == 'win') query.whereIn('type', ['win', 'winwheel'])
      else if (type == 'charge') query.whereIn('type', ['charge', 'cardtocard'])
      else query.where('type', type)
    }

    return response.json(await query.orderBy(sort, dir).paginate(page, Helper.PAGINATE))
  }
}
