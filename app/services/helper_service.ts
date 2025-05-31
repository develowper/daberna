import env from '#start/env'
import app from '@adonisjs/core/services/app'
import fs from 'node:fs'
import Setting from '#models/setting'
import collect from 'collect.js'
import { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import User from '#models/user'
import Agency from '#models/agency'
import AgencyFinancial from '#models/agency_financial'
import AdminFinancial from '#models/admin_financial'
import UserFinancial from '#models/user_financial'
import Admin from '#models/admin'
import Room from '#models/room'
import { usePage } from '@inertiajs/vue3'
import { errors } from '@vinejs/vine'
import i18nManager from '@adonisjs/i18n/services/main'
import { storage } from '#start/globals'
import { fa as faker } from '@faker-js/faker'
import type { LocaleDefinition } from '@faker-js/faker'
import { io } from 'socket.io-client'
import { Encryption } from '@adonisjs/core/encryption'
import Blackjack from '#models/blackjack'
import db from '@adonisjs/lucid/services/db'

const encryption = new Encryption({
  secret: env.get('ENC_KEY', ''),
})

class Helper {
  static socket: any
  public static DABERNA: any = {
    row: 3,
    col: 9,
    fillInRow: 5,
    min: 1,
    max: 90,
    commissionPercent: 10,
    rowWinPercent: 10,
    winPercent: 80,
    rwp: 0,
  }
  public static DOOZ: any = {
    row: 7,
    col: 7,
    actions: ['insert', 'move', 'kick'],
    board: [
      [0, -1, -1, 0, -1, -1, 0],
      [-1, 0, -1, 0, -1, 0, -1],
      [-1, -1, 0, 0, 0, -1, -1],
      [0, 0, 0, -1, 0, 0, 0],
      [-1, -1, 0, 0, 0, -1, -1],
      [-1, 0, -1, 0, -1, 0, -1],
      [0, -1, -1, 0, -1, -1, 0],
    ].flat(),
    doozes: [
      [0, 3, 6],
      [8, 10, 12],
      [16, 17, 18],
      [21, 22, 23],
      [25, 26, 27],
      [30, 31, 32],
      [36, 38, 40],
      [42, 45, 48],
      //vertical
      [0, 21, 42],
      [8, 22, 36],
      [16, 23, 30],
      [3, 10, 17],
      [31, 38, 45],
      [18, 25, 32],
      [12, 26, 40],
      [6, 27, 48],
      //orib
      [0, 8, 16],
      [6, 12, 18],
      [30, 36, 42],
      [32, 40, 48],
    ],
    nears: {
      0: [3, 8, 21],
      3: [0, 6, 10],
      6: [3, 12, 27],
      8: [0, 10, 16, 22],
      10: [3, 8, 12, 17],
      12: [6, 10, 18, 26],
      16: [8, 17, 23],
      17: [10, 16, 18],
      18: [12, 17, 25],
      21: [0, 22, 42],
      22: [8, 21, 23, 36],
      23: [16, 22, 30],
      25: [18, 26, 32],
      26: [12, 25, 27, 40],
      27: [6, 26, 48],
      30: [23, 31, 36],
      31: [30, 32, 38],
      32: [25, 31, 40],
      36: [22, 30, 38, 42],
      38: [31, 36, 40, 45],
      40: [26, 32, 38, 48],
      42: [21, 36, 45],
      45: [38, 42, 48],
      48: [27, 40, 45],
    },
    fillInRow: 0,
    min: 0,
    max: 0,
    commissionPercent: 20,
    winPercent: 80,
    rwp: 0,
  }
  public static BLACKJACK: any = {
    actions: [
      'hit',
      'stand',
      'double',
      'split',
      'push',
      'blackjack',
      'bet',
      'set_cards',
      'user_decision',
      'dealer_decision',
      'done',
    ],
    coins: [5000, 10000, 20000, 50000],
    cards: [
      'p1',
      'p2',
      'p3',
      'p4',
      'p5',
      'p6',
      'p7',
      'p8',
      'p9',
      'p10',
      'pj',
      'pq',
      'pk',
      'd1',
      'd2',
      'd3',
      'd4',
      'd5',
      'd6',
      'd7',
      'd8',
      'd9',
      'd10',
      'dj',
      'dq',
      'dk',
      'g1',
      'g2',
      'g3',
      'g4',
      'g5',
      'g6',
      'g7',
      'g8',
      'g9',
      'g10',
      'gj',
      'gq',
      'gk',
      'k1',
      'k2',
      'k3',
      'k4',
      'k5',
      'k6',
      'k7',
      'k8',
      'k9',
      'k10',
      'kj',
      'kq',
      'kk',
    ],
    fillInRow: 0,
    min: 0,
    max: 0,
    startTime: 10,
    maxResponseTime: 30,
    commissionPercent: 20,
    winPercent: 80,
    rwp: 0,
    multiplayer: false,
  }
  public static TRANSACTION = {
    gateways: ['wallet', 'zarinpal'],
    types: [
      'cardtocard',
      'withdraw',
      'win',
      'row_win',
      'charge',
      'commission',
      'ref_commission',
      'winwheel',
      'dooz',
      'blackjack',
    ],
    fromTypes: ['agency', 'user', 'admin', 'daberna', 'blackjack', 'dooz', 'lottery'],
    colors: {
      win: 'green',
      row_win: 'teal',
      withdraw: 'orange',
      charge: 'lime',
      commission: 'indigo',
      ref_commission: 'violet',
      winwheel: 'sky',
      cardtocard: 'blue',
    } as { [key: string]: string },
  }
  public static SUPPORT = {
    telegram: 'https://t.me/paris_admin1',
  }
  public static SOCKET_LINK = `https://${env.get('APP_URL')}` ?? 'http://127.0.0.1:3298'
  /*'http://172.16.6.2:3298' ??*/
  public static SOCKET_LINK_CLIENT = `https://${env.get('APP_URL')}` /* ?? '127.0.0.1:3298' ?? ''*/
  public static ERROR_STATUS = 400
  public static MAINTENANCE = false
  public static TESTERS = [15, 50]
  public static BANK = 'zarinpal'
  public static APP_DOWNLOAD_URL =
    'BQACAgQAAxkBAAIBc2dpi3RyNuYZ1PKaZO6L0Rh0gQyQAAIpFQACyetQUzf-QIGKBw6bNgQ'

  public static ENAMAD = `<a referrerpolicy='origin' target='_blank' href='https://trustseal.enamad.ir/?id=565455&Code=WNIwA9GN3WFa1TNq7pu6HeHTJCQzv9T6'><img referrerpolicy='origin' src='https://trustseal.enamad.ir/logo.aspx?id=565455&Code=WNIwA9GN3WFa1TNq7pu6HeHTJCQzv9T6' alt='' style='cursor:pointer' code='WNIwA9GN3WFa1TNq7pu6HeHTJCQzv9T6'></a>`
  public static APP_VERSION = 4
  public static PAGINATE = 24
  public static MIN_CHARGE = 50000
  public static MIN_WITHDRAW = 100000
  public static CALL_SPEED = 1000
  public static ROOM_REFRESH_TIME = 10
  public static CLEAR_TRANSACTION_DAY = 0
  public static CLEAR_INACTIVE_USERS_DAY = 0
  public static CARDTOCARD_MINUTE_LIMIT = 1
  public static WINWHEEL_HOUR_LIMIT = 24
  public static WITHDRAW_HOUR_LIMIT = 24
  public static DABERNA_LOG_DAY_LIMIT = 3
  public static DABERNA_LOG_HOUR_LIMIT = 24
  public static BLACKLIST_LIMIT = 15
  public static AGENCY_REF_COUNT = 25
  public static REF_COMMISSION_PERCENT = 0
  public static TOP_USERS_COUNT = 3
  public static PLAY_COUNT_FOR_ACTIVE_WINWHEEL = 5
  public static USER_ROLES = ['us', 'bo']
  public static MAX_QUEUE_LEN = 5
  public static TELEGRAM_LOGS = [72534783, 967072802, -1002584416455 /*, 6270272894*/]
  public static TELEGRAM_TOPICS = {
    DABERNA_GAME: 7,
    BLACKJACK_GAME: 21,
    TRANSACTION: 2,
    FILE: 6,
    DESKTOP: 5,
    USER: 3,
    STATISTICS: 16,
    BUG: 18,
    LOTTERY: null,
  }
  public static ADMIN_ROLES = ['go', 'ad']
  public static GAMES = ['daberna', 'dooz', 'blackjack', 'lottery']
  public static BLOCK_IPS = [
    /*'94.24.99.175', '5.121.179.55', '91.108.5.21', '45.32.192.18'*/
  ]
  public static AD = {
    types: {
      native: 'my',
    },
  }

  public static USER_STATUSES = [
    { name: 'active', color: 'green' },
    { name: 'inactive', color: 'red' },
  ]
  public static ROOM_STATUSES = [
    { name: 'active', color: 'green' },
    { name: 'inactive', color: 'red' },
  ]
  static BOT_MEMBER_PERCENT: Record<any, any> = { d5000: 1, d10000: 0.5, d20000: 0.3, d50000: 0.1 }

  constructor() {}

  public static TRANSACTION_MODELS: Record<string, typeof User | typeof Admin | typeof Agency> = {
    user: User,
    admin: Admin,
    agency: Agency,
  }
  public static FINANCIAL_MODELS: Record<
    string,
    typeof UserFinancial | typeof AdminFinancial | typeof AgencyFinancial
  > = {
    user: UserFinancial,
    admin: AdminFinancial,
    agency: AgencyFinancial,
  }
  public static ROOMS = [
    {
      game: 'daberna',
      type: 'd5000',
      maxCardsCount: 30,
      cardPrice: 5000,
      winScore: 1,
      maxUserCardsCount: 3,
      image: `storage/rooms/5000.jpg`,
      maxSeconds: 90,
      commissionPercent: Helper.DABERNA.commissionPercent,
      rowWinPercent: Helper.DABERNA.rowWinPercent,
      winPercent: Helper.DABERNA.winPercent,
      rwp: Helper.DABERNA.rwp,
    },
    {
      game: 'daberna',
      type: 'd10000',
      maxCardsCount: 30,
      cardPrice: 10000,
      winScore: 2,
      maxUserCardsCount: 3,
      image: `storage/rooms/10000.jpg`,
      maxSeconds: 90,
      commissionPercent: Helper.DABERNA.commissionPercent,
      rowWinPercent: Helper.DABERNA.rowWinPercent,
      winPercent: Helper.DABERNA.winPercent,
      rwp: Helper.DABERNA.rwp,
    },
    {
      game: 'daberna',
      type: 'd20000',
      maxCardsCount: 30,
      cardPrice: 20000,
      winScore: 3,
      maxUserCardsCount: 3,
      image: `storage/rooms/20000.jpg`,
      maxSeconds: 90,
      commissionPercent: Helper.DABERNA.commissionPercent,
      rowWinPercent: Helper.DABERNA.rowWinPercent,
      winPercent: Helper.DABERNA.winPercent,
      rwp: Helper.DABERNA.rwp,
    },
    {
      game: 'daberna',
      type: 'd50000',
      maxCardsCount: 30,
      cardPrice: 50000,
      winScore: 4,
      maxUserCardsCount: 3,
      image: `storage/rooms/50000.jpg`,
      maxSeconds: 90,
      commissionPercent: Helper.DABERNA.commissionPercent,
      rowWinPercent: Helper.DABERNA.rowWinPercent,
      winPercent: Helper.DABERNA.winPercent,
      rwp: Helper.DABERNA.rwp,
    },
    {
      game: 'dooz',
      type: 'z5000',
      maxCardsCount: 2,
      cardPrice: 5000,
      winScore: 1,
      maxUserCardsCount: 1,
      image: `storage/rooms/5000.jpg`,
      maxSeconds: 90,
      commissionPercent: Helper.DOOZ.commissionPercent,
      rowWinPercent: 0,
      winPercent: Helper.DOOZ.winPercent,
      rwp: Helper.DOOZ.rwp,
    },
    {
      game: 'dooz',
      type: 'z10000',
      maxCardsCount: 2,
      cardPrice: 10000,
      winScore: 2,
      maxUserCardsCount: 1,
      image: `storage/rooms/10000.jpg`,
      maxSeconds: 90,
      commissionPercent: Helper.DOOZ.commissionPercent,
      rowWinPercent: 0,
      winPercent: Helper.DOOZ.winPercent,
      rwp: Helper.DOOZ.rwp,
    },
    {
      game: 'dooz',
      type: 'z20000',
      maxCardsCount: 2,
      cardPrice: 20000,
      winScore: 3,
      maxUserCardsCount: 1,
      image: `storage/rooms/20000.jpg`,
      maxSeconds: 90,
      commissionPercent: Helper.DOOZ.commissionPercent,
      rowWinPercent: Helper.DOOZ.rowWinPercent,
      winPercent: Helper.DOOZ.winPercent,
      rwp: Helper.DOOZ.rwp,
    },
    {
      game: 'dooz',
      type: 'z50000',
      maxCardsCount: 2,
      cardPrice: 50000,
      winScore: 4,
      maxUserCardsCount: 1,
      image: `storage/rooms/50000.jpg`,
      maxSeconds: 90,
      commissionPercent: Helper.DOOZ.commissionPercent,
      rowWinPercent: Helper.DOOZ.rowWinPercent,
      winPercent: Helper.DOOZ.winPercent,
      rwp: Helper.DOOZ.rwp,
    },
    {
      game: 'blackjack',
      type: 'b1',
      title: `${Helper.__('game_desk')} 1`,
      maxCardsCount: 8,
      cardPrice: 0,
      winScore: 1,
      maxUserCardsCount: 2,
      page: `/BlackJackGame`,
      image: `storage/rooms/blackjack.jpg`,
      maxSeconds: 15,
      commissionPercent: Helper.DOOZ.commissionPercent,
      rowWinPercent: Helper.DOOZ.rowWinPercent,
      winPercent: Helper.DOOZ.winPercent,
      rwp: Helper.DOOZ.rwp,
    },
    {
      game: 'blackjack',
      type: 'b2',
      title: `${Helper.__('game_desk')} 2`,
      maxCardsCount: 8,
      cardPrice: 0,
      winScore: 1,
      maxUserCardsCount: 2,
      page: `/BlackJackGame`,
      image: `storage/rooms/blackjack.jpg`,
      maxSeconds: 15,
      commissionPercent: Helper.DOOZ.commissionPercent,
      rowWinPercent: Helper.DOOZ.rowWinPercent,
      winPercent: Helper.DOOZ.winPercent,
      rwp: Helper.DOOZ.rwp,
    },
    {
      game: 'blackjack',
      type: 'b3',
      title: `${Helper.__('game_desk')} 3`,
      maxCardsCount: 8,
      cardPrice: 0,
      winScore: 1,
      maxUserCardsCount: 2,
      page: `/BlackJackGame`,
      image: `storage/rooms/blackjack.jpg`,
      maxSeconds: 15,
      commissionPercent: Helper.DOOZ.commissionPercent,
      rowWinPercent: Helper.DOOZ.rowWinPercent,
      winPercent: Helper.DOOZ.winPercent,
      rwp: Helper.DOOZ.rwp,
    },
    {
      game: 'blackjack',
      type: 'b4',
      title: `${Helper.__('game_desk')} 4`,
      maxCardsCount: 8,
      cardPrice: 0,
      winScore: 1,
      maxUserCardsCount: 2,
      page: `/BlackJackGame`,
      image: `storage/rooms/blackjack.jpg`,
      maxSeconds: 15,
      commissionPercent: Helper.DOOZ.commissionPercent,
      rowWinPercent: Helper.DOOZ.rowWinPercent,
      winPercent: Helper.DOOZ.winPercent,
      rwp: Helper.DOOZ.rwp,
    },
  ]
  public static TICKET_STATUSES = [
    { title: Helper.__('responded'), key: 'responded', color: 0xff44ff44 },
    { title: Helper.__('processing'), key: 'processing', color: 0xff4477ce },
    { title: Helper.__('closed'), key: 'closed', color: 0xffe74646 },
  ]

  public static TELEGRAM_BOT: string = 'daberna_bot'
  public static TELEGRAM_CHANNEL: string = 'dabernaparis'
  public static MARKETS = {
    'bazaar': '',
    'myket': '',
    'playstore': '',
    'bank': '',
    '': `https://t.me/${Helper.TELEGRAM_BOT}`,
    'telegram': `https://t.me/${Helper.TELEGRAM_BOT}`,
  }
  public static getFakeHttpCtx(): HttpContext {
    return (
      storage?.getStore() ?? ({ i18n: i18nManager?.locale(env.get('LOCALE', '')) } as HttpContext)
    )
  }
  static asPrice(price: any) {
    if (!price) return '0'
    // return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return price.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ',')
  }
  public static __(key: string, data: any = {}, i18n = null) {
    const ctx = HttpContext.get()?.i18n ?? Helper.getFakeHttpCtx()?.i18n

    return ctx?.t(`messages.${key}`, data)
  }

  public static async getSetting(key: string) {
    return await Setting.findBy('key', key)
  }

  public static async serverStatus() {
    const res = await Setting.firstOrNew({ key: 'server_status', value: 'active' })
    return res.value
  }
  public static lang() {
    // const l = env.get('LOCALE', '')
    // let $lang = usePage().props.language;
    // // console.log($lang)
    // var translation = $lang[key]
    //   ? $lang[key]
    //   : key
    //
    // Object.keys(replace).forEach(function (key) {
    //   translation = translation.replace(':' + key, replace[key])
    // });
    //
    // return translation
  }

  public static getLangFile(ctx: HttpContext | null) {
    let locale

    if (ctx?.i18n) locale = ctx.i18n.locale
    else locale = i18nManager?.defaultLocale
    const path = app.languageFilesPath(`${locale}/messages.json`)

    try {
      return JSON.parse(fs.readFileSync(path, 'utf8'))
    } catch (err) {
      return {}
    }
  }

  static async getSettings(items: any) {
    let res
    if (!Array.isArray(items)) {
      res = await Setting.firstOrNew({ key: items }, { key: items })
      if (res.value && !Number.isNaN(res.value * 1)) res.value = res.value * 1
      return res.value
    } else {
      res = await Setting.query().whereIn('key', items)
      return collect(res ?? [])
        .map((item: any) => {
          if (item.value && !Number.isNaN(item.value * 1)) item.value = item.value * 1
          return item
        })
        .pluck('value', 'key')
        .all()
    }
  }
  public static sendError(message: string) {
    return HttpContext.get()?.response.status(Helper.ERROR_STATUS).json({ message: message })
  }
  static createSettings() {
    Setting.createMany([
      { key: 'min_charge', value: Helper.MIN_CHARGE, title: __('min_charge') },
      {
        key: 'card_to_card',
        title: __('bank_cards'),
        value: JSON.stringify([
          { active: 1, card: '1234123412341234', name: 'test' },
          { active: 0, card: '1111222233334444', name: 'test2' },
        ]),
      },
      {
        key: 'winwheel',
        title: __('winwheel'),
        value: JSON.stringify({
          active: 1,
          limit_hour: Helper.WINWHEEL_HOUR_LIMIT,
          labels: [
            { name: __('5000'), value: 5000 },
            { name: __('null'), value: 0 },
            { name: __(`rotate`), value: -1 },
            { name: __('10000'), value: 10000 },
            { name: __('null'), value: 0 },
            { name: __(`rotate`), value: -1 },
            { name: __('5000'), value: 5000 },
            { name: __('null'), value: 0 },
          ],
        }),
      },

      {
        key: 'charge_title',
        title: __('charge_page_title'),
        value: __('validate.min', {
          item: __('charge'),
          value: `${asPrice(`${Helper.MIN_CHARGE}`)} ${__('currency')}`,
        }),
      },
      {
        key: 'card_to_card_title',
        title: __('cardtocard_page_title'),
        value: __('validate.min', {
          item: __('charge'),
          value: `${asPrice(`${Helper.MIN_CHARGE}`)} ${__('currency')}`,
        }),
      },
      {
        key: 'withdraw_title',
        title: __('withdraw_page_title'),
        value: __('withdraw_title', {
          item1: asPrice(`${Helper.MIN_WITHDRAW}`),
          item2: `${Helper.WITHDRAW_HOUR_LIMIT} ${__('hour')}`,
        }),
      },
      {
        key: 'support_links',
        title: __('support_links'),
        value: JSON.stringify([
          { name: __('telegram'), /* color: 0x0000ff,*/ url: `${Helper.SUPPORT.telegram}` },
        ]),
      },
      {
        key: 'clear_transactions_day',
        value: Helper.CLEAR_TRANSACTION_DAY,
        title: __('clear_transactions_day'),
      },
      {
        key: 'clear_inactive_users_day',
        value: Helper.CLEAR_INACTIVE_USERS_DAY,
        title: __('clear_inactive_users_day'),
      },
      {
        key: 'telegram_bot',
        value: Helper.TELEGRAM_BOT,
        title: __('telegram_bot_without_@'),
      },
      {
        key: 'telegram_channel',
        value: Helper.TELEGRAM_CHANNEL,
        title: __('telegram_channel_without_@'),
      },
      { key: 'policy', value: __('policy_content'), title: __('rules_text') },
      {
        key: 'ref_commission_percent',
        value: Helper.REF_COMMISSION_PERCENT,
        title: __('ref_commission_percent'),
      },
      {
        key: 'app_url',
        value: Helper.APP_DOWNLOAD_URL,
        title: __('app_url'),
      },

      {
        key: 'register_is_active',
        value: 1,
        title: __('register_status'),
      },
      {
        key: 'robot_is_active',
        value: 1,
        title: __('robot_status'),
      },
      {
        key: 'joker_id',
        value: 1,
        title: __('joker_id'),
      },
      {
        key: 'clear_period_day',
        value: 60,
        title: __('clear_period_title'),
      },
      {
        key: 'cardtocard_minute_limit',
        value: 1,
        title: __('cardtocard_minute_limit'),
      },

      {
        key: 'ref_commission_text',
        value: __('ref_text'),
        title: __('ref_commission_text'),
      },
      {
        key: 'blacklist',
        value: null,
        title: __('blacklist_text'),
      },
      {
        key: 'blackjack_help',
        title: __('blackjack_help'),
        value: JSON.stringify([
          { icon: null, text: __('help_blackjack') },
          { icon: 'hit', text: __('help_hit') },
          { icon: 'stand', text: __('help_stand') },
          { icon: 'split', text: __('help_split') },
          { icon: 'double', text: __('help_double') },
        ]),
      },
      {
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
            active: 1,
            title: '2',
            value: env.get('ZARINPAL_2'),
          },
        ]),
      },
      {
        key: 'ads',
        title: __('ads'),
        value: JSON.stringify([
          {
            id: 1,
            clicks: 0,
            banner_link: null,
            click_link: null,
            is_active: 1,
          },
        ]),
      },
      {
        key: 'app_info',
        value: JSON.stringify({
          version: 1,
          update_title: __('app_new_version_available'),
          update_link: `https://t.me/${Helper.TELEGRAM_BOT}`,
          maintenance: 0,
          testers: '1\n2',
        }),
        title: __('app_info'),
      },
      {
        key: 'support_message',
        title: __('support_message'),
        value: JSON.stringify({
          title: '',
          questions: [
            { q: '', a: '', active: 0 },
            { q: '', a: '', active: 0 },
            { q: '', a: '', active: 0 },
          ],
        }),
      },
      {
        key: 'lottery',
        title: __('lottery'),
        value: JSON.stringify({
          active: 0,
          title: '',
          winners_prize: `50\n30\n10`,
          start_at: '24:00',
          winners: null,
        }),
      },
      // {
      //   key: 'enamad',
      //   value: Helper.ENAMAD,
      //   title: __('enamad'),
      // },
    ])
  }
  static createUsers() {
    User.createMany([
      {
        username: 'mahyar.sh',
        password: 'm2330m',
        phone: '09011111111',
        agencyId: 1,
        agencyLevel: 0,
      },
      { username: 'mojraj', password: '123123', phone: '09015555555', agencyId: 1, agencyLevel: 0 },
      {
        username: 'mojraj2',
        password: '123123',
        phone: '09015555556',
        agencyId: 1,
        agencyLevel: 0,
      },
      {
        username: 'mojraj3',
        password: '123123',
        phone: '09015555557',
        agencyId: 1,
        agencyLevel: 0,
      },
      {
        username: 'mojraj4',
        password: '123123',
        phone: '09015565555',
        agencyId: 1,
        agencyLevel: 0,
      },
      {
        username: 'mojraj5',
        password: '123123',
        phone: '09015575555',
        agencyId: 1,
        agencyLevel: 0,
      },
      {
        username: 'mojraj6',
        password: '123123',
        phone: '09015455555',
        agencyId: 1,
        agencyLevel: 0,
      },
    ])
    UserFinancial.createMany([
      { userId: 1, balance: 1000000 },
      { userId: 2, balance: 1000000 },
      { userId: 3, balance: 1000000 },
      { userId: 4, balance: 1000000 },
      { userId: 5, balance: 1000000 },
      { userId: 6, balance: 1000000 },
      { userId: 7, balance: 1000000 },
    ])

    //fake user

    // User.fake(50)
  }
  static createAdmins() {
    Admin.createMany([
      {
        username: 'mahyar.sh',
        password: env.get('pswd'),
        phone: '09011111111',
        role: 'go',
        agencyId: 1,
        agencyLevel: 0,
        telegramId: '967072802',
      },
      {
        username: 'mojraj',
        password: env.get('pswd'),
        phone: '09011111111',
        role: 'go',
        agencyId: 1,
        agencyLevel: 0,
        telegramId: '72534783',
      },
    ])
    AdminFinancial.createMany([{ id: 1, adminId: 1, balance: 0 }])
  }
  static createAgencies() {
    Agency.createMany([{ id: 1, name: __('central'), parentId: null, level: 0 }])
    AgencyFinancial.createMany([{ id: 1, agencyId: 1, balance: 0 }])
  }
  static async createRooms() {
    const res = []
    const rooms = Helper.ROOMS.filter((item) => item.game != 'blackjack')

    for (let index = 0; index < rooms.length; index++) {
      const room = rooms[index]
      res.push({
        type: room.type,
        game: room.game,
        card_price: room.cardPrice,
        win_score: room.winScore,
        max_seconds: room.maxSeconds,
        title: room.title ?? Helper.__('room_*', { item: room.cardPrice }),
        max_user_cards_count: room.maxUserCardsCount,
        max_cards_count: room.maxCardsCount,
        image: room.image,
        commission_percent: room.commissionPercent,
        row_win_percent: room.rowWinPercent,
        win_percent: room.winPercent,
      })
    }

    await Room.createMany(res)
  }
  public static async createBlackJackRooms() {
    const res = []
    const rooms = Helper.ROOMS.filter((item) => item.game == 'blackjack')
    await Room.query().where('game', 'blackjack').delete()
    await db.rawQuery('ALTER TABLE `rooms` AUTO_INCREMENT = 9')
    for (let index = 0; index < rooms.length; index++) {
      const room = rooms[index]
      const r = await Room.create({
        game: room.game,
        type: room.type,
        card_price: room.cardPrice,
        win_score: room.winScore,
        max_seconds: room.maxSeconds,
        title: `${Helper.__('game_desk')} ${index + 1}`,
        max_user_cards_count: room.maxUserCardsCount,
        max_cards_count: room.maxCardsCount,
        image: room.image,
        commission_percent: room.commissionPercent,
        row_win_percent: room.rowWinPercent,
        win_percent: room.winPercent,
      })

      await Blackjack.create({
        type: room.type,
      })
    }
  }
  public static log(data: any) {
    logger.info(data)
  }
  public static inertiaError(data) {
    throw new errors.E_VALIDATION_ERROR(data)
  }
  public static inertiaSuccess(data) {}
  public static pluck(arr: any[], key: string | string[]) {
    if (!Array.isArray(key)) {
      return arr.map((i: any) => i[key as string])
    }
    return arr.map((i: any) => (key as string[]).map((k: string) => i[k]))
  }

  public static shuffle(array: any[]) {
    let currentIndex = array.length
    let randomIndex

    // While there remain elements to shuffle.
    while (currentIndex != 0) {
      randomIndex = Math.floor(Math.random() * currentIndex)
      currentIndex--
      ;[array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]]
    }

    return array
  }

  static range(start: number, end: number) {
    return Array.from({ length: end + 1 - start }, (v, k) => k + start)
  }
  static toShamsi(day, time = false) {
    var t = new Date().getTime()
    if (!day) return ''
    else var today = new Date(day)
    let options: any = {
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Asia/Tehran',

      calendar: 'persian',
    }
    if (time)
      options = {
        ...options,
        hour: '2-digit',
        minute: '2-digit',
      }

    return today.toLocaleDateString('fa-IR', options)
  }
  static f2e(num: any) {
    const persianToLatinMap: any = {
      '۰': '0',
      '۱': '1',
      '۲': '2',
      '۳': '3',
      '۴': '4',
      '۵': '5',
      '۶': '6',
      '۷': '7',
      '۸': '8',
      '۹': '9',
    }
    return `${num}`.replace(/[۰-۹]/g, (char) => persianToLatinMap[char])
  }

  static dir() {
    let $lang = usePage().props.language
    if ($lang == 'en') return 'ltr'
    else return 'rtl'
  }

  static randomString(length, characters) {
    // Generate a random string using the characters provided
    const result = []
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length)
      result.push(characters[randomIndex])
    }
    return result.join('')
  }

  static replace(find: string, rep: string, input: string): string {
    const regex = new RegExp(find, 'i') // Add 'i' flag for case-insensitive matching if pattern is string
    return input.replace(regex, rep)
  }
  static startsWith(str = '', searchString) {
    // Check if the beginning of `str` matches `searchString`

    return str.slice(0, searchString.length) === searchString
  }
  static myMap(arr, callbackFn) {
    var tmp = []
    for (var i = 0; i < arr.length; i++) {
      tmp.push(callbackFn(arr[i]))
    }
    return tmp
  }
  static async sleep(time: number) {
    return new Promise((resolve) => setTimeout(resolve, time))
  }

  static async decrypt(str: any) {
    return encryption.decrypt(str)
  }
  static getRandomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }
  static isPG() {
    return env.get('DB_CONNECTION') == 'pg'
  }
}

// export default Helper
export const {
  dir,
  f2e,
  toShamsi,
  range,
  shuffle,
  pluck,
  createRooms,
  createUsers,
  createAgencies,
  createAdmins,
  createSettings,
  getLangFile,
  getSetting,
  getSettings,
  asPrice,
  __,
  lang,
  log,
  sendError,
  inertiaError,
  replace,
  startsWith,
  myMap,
  sleep,
  decrypt,
  getRandomBetween,
  isPG,
} = Helper
export default Helper
