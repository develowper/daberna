import type { HttpContext } from '@adonisjs/core/http'
import Helper from '../../services/helper_service.js'
import { inject } from '@adonisjs/core'
import Setting from '../../models/setting.js'
import { collect } from 'collect.js'
import { json } from 'stream/consumers'
import Room from '#models/room'
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
      ])
    )
    const cards: { active: number; number: string; name: string }[] = JSON.parse(
      settings.first((item) => item.key === 'card_to_card')?.value ?? '[]'
    )
    const headerMessages: any[] = JSON.parse(
      settings.first((item) => item.key === 'header_message')?.value ?? '[]'
    )
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
    const games = await Room.query().select(['game']).distinct('game').where('is_active', true)

    return response.json({
      games: games.map((item) => {
        return {
          title: i18n.t(`messages.${item.game}`),
          type: item.game,
        }
      }),
      header_messages: collect(headerMessages).whereIn('active', ['1', 1, true]),
      ad: Helper.AD,
      blackjack_help: blackjackHelp,
      cards: Helper.BLACKJACK.cards,
      coins: Helper.BLACKJACK.coins,
      winwheel: JSON.parse(winWheel?.value),
      card_to_card: collect(cards).where('active', '1').random(),
      policy: policy,
      charge_title: settings.first((item) => item.key == 'charge_title')?.value,
      card_to_card_title: settings.first((item) => item.key == 'card_to_card_title')?.value,
      withdraw_title: settings.first((item) => item.key == 'withdraw_title')?.value,
      room_refresh_time: Helper.ROOM_REFRESH_TIME,
      call_speed: Helper.CALL_SPEED,
      rooms: Helper.ROOMS,
      ticket_statuses: Helper.TICKET_STATUSES,
      version: Helper.APP_VERSION,
      support_links: supportLinks,
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
        market: Helper.MARKETS,
      },
      questions: [
        {
          q: 'کیف پول شارژ نمی شود',
          a: 'به دلیل اختلال در سیستم بانکی ممکن است خرید شما با تاخیر انجام شود. لطفا پس از چند دقیقه بر روی دکمه "بروز رسانی" کیف پول که در قسمت "پروفایل" در کنار عدد کیف پول است بزنید تا بروز رسانی شود',
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
