import type { HttpContext } from '@adonisjs/core/http'
import Helper from '../../services/helper_service.js'
import { inject } from '@adonisjs/core'
import Setting from '../../models/setting.js'
import { collect } from 'collect.js'
import { json } from 'stream/consumers'
import Room from '#models/room'
import { DateTime } from 'luxon'
import Lottery from '#models/lottery'
@inject()
export default class SettingController {
  // constructor(protected helper: Helper) {

  // }

  async get({ response, request, i18n }: HttpContext) {
    const appVersion = request.input('version') ?? 1
    const settings = collect(
      await Setting.query().whereIn('key', [
        'support_links',
        'policy',
        'card_to_card',
        'min_charge',
        'winwheel',
        'charge_title',
        'card_to_card_title',
        'withdraw_title',
        'telegram_bot',
        'blackjack_help',
        'header_message',
        'ads',
        'app_info',
        'support_message',
        'lottery',
      ])
    )
    const appInfo: any = JSON.parse(
      settings.first((item) => item.key === 'app_info')?.value ?? '[]'
    )
    appInfo.version = Number(appInfo.version)
    // const ads: any = JSON.parse(settings.first((item) => item.key === 'ads')?.value ?? '[]')

    let lottery: any = settings.first((item) => item.key === 'lottery')

    lottery = await Lottery.emmitInfo(await Room.find(10), lottery)

    const cards: { active: number; number: string; name: string }[] = JSON.parse(
      settings.first((item) => item.key === 'card_to_card')?.value ?? '[]'
    )
    const headerMessages: any[] = JSON.parse(
      settings.first((item) => item.key === 'header_message')?.value ?? '[]'
    )
    const supportMessage: any = JSON.parse(
      settings.first((item) => item.key === 'support_message')?.value ?? '{}'
    )
    supportMessage.questions = collect(supportMessage.questions ?? []).whereIn('active', '1', 1)
    const telegramBot = settings.first((item: any) => item && item.key == 'telegram_bot')?.value
    const supportTelegram = settings.first((item: any) => item && item.key == 'support_telegram')
    const supportEmail = settings.first((item: any) => item && item.key == 'support_email')
    const policy = settings.first((item: any) => item && item.key == 'policy')?.value
    const winWheel = settings.first((item: any) => item && item.key == 'winwheel')
    const supportLinks = JSON.parse(
      settings.first((item: any) => item && item.key == 'support_links')?.value ?? '[]'
    )
    const blackjackHelp = JSON.parse(
      settings.first((item: any) => item && item.key == 'blackjack_help')?.value ?? '[]'
    )
    const games = await Room.query()
      .select(['game'])
      .distinct('game')
      .where('is_active', true)
      .where('game', 'daberna')

    return response.json({
      lottery: lottery,
      games: games.map((item) => {
        return {
          title: i18n.t(`messages.${item.game}`),
          type: item.game,
        }
      }),
      header_messages: collect(headerMessages).whereIn('active', ['1', 1, true]).pluck('text'),
      game_types: collect(Helper.ROOMS).map((item) =>
        collect(item).only(['game', 'type', 'cardPrice']).all()
      ),
      log_hours_limit: `${Helper.DABERNA_LOG_HOUR_LIMIT}`,
      ad: Helper.AD,
      blackjack_help: blackjackHelp,
      cards: Helper.BLACKJACK.cards,
      coins: Helper.BLACKJACK.coins,
      winwheel: JSON.parse(winWheel?.value),
      card_to_card: collect(cards).where('active', '1').random(),
      policy: policy,
      support_message: supportMessage,
      charge_title: settings.first((item) => item.key == 'charge_title')?.value,
      card_to_card_title: settings.first((item) => item.key == 'card_to_card_title')?.value,
      withdraw_title: settings.first((item) => item.key == 'withdraw_title')?.value,
      room_refresh_time: Helper.ROOM_REFRESH_TIME,
      call_speed: Helper.CALL_SPEED,
      rooms: Helper.ROOMS,
      ticket_statuses: Helper.TICKET_STATUSES,
      version: appInfo.version ?? Helper.APP_VERSION,
      app_info: appInfo,
      support_links: collect(supportLinks).whereNotIn('url', ['', null]),
      links: {
        socket: Helper.SOCKET_LINK,
        app: '',
        comments: '',
        aparat: '',
        site: '',
        contact_us: supportTelegram,
        // 'policy': policy,
        telegram: supportTelegram,
        telegram_bot: telegramBot,
        instagram: '',
        eitaa: '',
        email: supportEmail,
        market: {
          ...Helper.MARKETS,
          '': appInfo.update_link,
        },
      },

      questions: [
        {
          q: 'وارد بازی نمی شوم',
          a: 'ممکن است در زمان اختلالات شدید اینترنت ارتباط شما با سرور قطع شود. در صورتی که کارت خریدید بازی شما انجام شده است و نتیجه در قسمت "گزارش بازی" قابل مشاهده است',
        },
        {
          q: 'کیف پول شارژ نمی شود',
          a: 'لطفا در هنگام شارژ کیف پول تا دیدن پیغام پرداخت موفق، صفحه را نبندید. در صورتی که اطمینان دارید پول از حساب شما کم شده است، کد رهگیری بانکی را برای ما ارسال نمایید',
        },
        {
          q: 'رمز عبور خود را فراموش کرده ام',
          a: 'از حساب خود خارج شوید. در صفحه ورود روی فراموشی رمز کلیک کنید.پس از ورود به ربات تلگرامی بر روی ارسال شماره تماس کلیک کنید. در صورتی که شماره تماس اکانت تلگرام شما موجود باشد از شما درخواست رمز جدید می شود',
        },
      ],
    })
    // await auth.check()
  }
}
