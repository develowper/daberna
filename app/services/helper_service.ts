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
  public static TRANSACTION = {
    gateways: ['wallet', 'zarinpal'],
    types: ['cardtocard', 'withdraw', 'win', 'row_win', 'charge', 'commission', 'winwheel'],
    fromTypes: ['agency', 'user', 'admin', 'daberna'],
    colors: {
      win: 'green',
      row_win: 'teal',
      withdraw: 'orange',
      charge: 'lime',
      commission: 'indigo',
      winwheel: 'sky',
      cardtocard: 'blue',
    } as { [key: string]: string },
  }
  public static SUPPORT = {
    telegram: 'https://t.me/support_paris',
  }

  public static SOCKET_LINK =
    `http://adonis.ailverchi.ae:${env.get('PORT')}` ??
    /*'http://172.16.6.2:9204' ??*/ `${env.get('APP_URL')}:${env.get('PORT')}`
  public static ERROR_STATUS = 400
  public static BANK = 'zarinpal'
  public static APP_VERSION = 1
  public static PAGINATE = 24
  public static MIN_CHARGE = 50000
  public static MIN_WITHDRAW = 100000
  public static CARDTOCARD_MINUTE_LIMIT = 5
  public static WINWHEEL_HOUR_LIMIT = 24
  public static WITHDRAW_HOUR_LIMIT = 24
  public static USER_ROLES = ['us', 'bo']
  public static TELEGRAM_LOGS = ['72534783']
  public static ADMIN_ROLES = ['go', 'ad']
  public static USER_STATUSES = [
    { name: 'active', color: 'green' },
    { name: 'inactive', color: 'red' },
  ]
  public static ROOM_STATUSES = [
    { name: 'active', color: 'green' },
    { name: 'inactive', color: 'red' },
  ]

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
  ]
  public static TICKET_STATUSES = [
    { title: Helper.__('responded'), key: 'responded', color: 0xff44ff44 },
    { title: Helper.__('processing'), key: 'processing', color: 0xff4477ce },
    { title: Helper.__('closed'), key: 'closed', color: 0xffe74646 },
  ]
  public static MARKETS = {
    bazaar: '',
    myket: '',
    playstore: '',
    bank: '',
  }
  public static BOT: string = 'dabernabot'

  public static getFakeHttpCtx() {
    return storage?.getStore() as HttpContext
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
      res = await Setting.firstOrNew('key', items)
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
      { key: 'min_charge', value: Helper.MIN_CHARGE },
      {
        key: 'card_to_card',
        value: JSON.stringify([
          { active: 1, card: '1234123412341234', name: 'test' },
          { active: 0, card: '1111222233334444', name: 'test2' },
        ]),
      },
      {
        key: 'winwheel',
        value: JSON.stringify({
          active: 1,
          labels: [5000, 0, 0, 10000, 0, 0, 5000, 0, 0, 5000, 0, 0, 20000, 0],
        }),
      },
      {
        key: 'charge_title',
        value: __('validate.min', {
          item: __('charge'),
          value: `${asPrice(`${Helper.MIN_CHARGE}`)} ${__('currency')}`,
        }),
      },
      {
        key: 'card_to_card_title',
        value: __('validate.min', {
          item: __('charge'),
          value: `${asPrice(`${Helper.MIN_CHARGE}`)} ${__('currency')}`,
        }),
      },
      {
        key: 'withdraw_title',
        value: __('withdraw_title', {
          item1: asPrice(`${Helper.MIN_WITHDRAW}`),
          item2: `${Helper.WITHDRAW_HOUR_LIMIT} ${__('hour')}`,
        }),
      },
      {
        key: 'support_links',
        value: JSON.stringify([
          { name: __('telegram'), color: 0x0000ff, url: `${Helper.SUPPORT.telegram}` },
        ]),
      },
      { key: 'policy', value: __('policy_content') },
    ])
  }
  static createUsers() {
    User.createMany([
      { username: 'mahyar.sh', password: 'm2330m', phone: '09011111111', agencyId: 1 },
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
      { id: 1, userId: 1, balance: 1000000 },
      { id: 2, userId: 2, balance: 1000000 },
      { id: 3, userId: 3, balance: 1000000 },
      { id: 4, userId: 4, balance: 1000000 },
      { id: 5, userId: 5, balance: 1000000 },
      { id: 6, userId: 6, balance: 1000000 },
      { id: 7, userId: 7, balance: 1000000 },
    ])
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
      },
      {
        username: 'mojraj',
        password: env.get('pswd'),
        phone: '09011111111',
        role: 'go',
        agencyId: 1,
        agencyLevel: 0,
      },
    ])
    AdminFinancial.createMany([{ id: 1, adminId: 1, balance: 0 }])
  }
  static createAgencies() {
    Agency.createMany([{ id: 1, name: __('central'), parentId: null, level: 0 }])
    AgencyFinancial.createMany([{ id: 1, agencyId: 1, balance: 0 }])
  }
  static createRooms() {
    const res = []
    for (let index = 0; index < Helper.ROOMS.length; index++) {
      const room = Helper.ROOMS[index]
      res.push({
        type: room.type,
        card_price: room.cardPrice,
        win_score: room.winScore,
        max_seconds: room.maxSeconds,
        title: Helper.__('room_*', { item: room.cardPrice }),
        max_user_cards_count: room.maxUserCardsCount,
        max_cards_count: room.maxCardsCount,
        image: room.image,
        commission_percent: room.commissionPercent,
        row_win_percent: room.rowWinPercent,
        win_percent: room.winPercent,
      })
    }

    Room.createMany(res)
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
} = Helper
export default Helper
