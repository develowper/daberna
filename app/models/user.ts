import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column, hasMany, hasOne, computed } from '@adonisjs/lucid/orm'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import Post from '#models/post'
import type { HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import UserFinancial from './user_financial.js'
import { DbRememberMeTokensProvider } from '@adonisjs/auth/session'
import Helper, { range, replace, startsWith } from '#services/helper_service'
import { fakerFA as faker } from '@faker-js/faker'
import Transaction from '#models/transaction'
import Telegram from '#services/telegram_service'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['username'],
  passwordColumnName: 'password',
})

export default class User extends compose(BaseModel, AuthFinder) {
  static rememberMeTokens = DbRememberMeTokensProvider.forModel(User)

  public serializeExtras = true
  public ip: any

  @hasMany(() => Post)
  declare posts: HasMany<typeof Post>

  @hasOne(() => UserFinancial)
  declare financial: HasOne<typeof UserFinancial>
  public financialInfo?: UserFinancial
  public balance: number

  public async getUserFinancial() {
    return (await UserFinancial.findBy('user_id', this.id))?.serialize()
  }

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare inviterId: number

  @column()
  declare agencyId: number

  @column()
  declare agencyLevel: number

  @column()
  declare refCount: number

  @column()
  declare access: object

  @column()
  declare fullName: string | null

  @column()
  declare telegramId: string

  @column()
  declare role: string

  @column()
  declare phone: string
  @column()
  declare username: string
  @column()
  declare rank: string
  @column()
  declare playCount: string
  @column()
  declare winCount: string
  @column()
  declare rowWinCount: string
  @column()
  declare prize: number
  @column()
  declare score: number
  @column()
  declare refId: any
  @column({ serialize: (value) => Boolean(value) })
  declare isActive: boolean
  @column()
  declare todayPrize: number
  @column({ columnName: 'card_5000_count' })
  declare card5000Count: number
  @column({ columnName: 'today_card_5000_count' })
  declare todayCard5000Count: number
  @column({ columnName: 'card_10000_count' })
  declare card10000Count: number
  @column({ columnName: 'today_card_10000_count' })
  declare todayCard10000Count: number
  @column({ columnName: 'card_20000_count' })
  declare card20000Count: number
  @column({ columnName: 'today_card_20000_count' })
  declare todayCard20000Count: number
  @column({ columnName: 'card_50000_count' })
  declare card50000Count: number
  @column({ columnName: 'today_card_50000_count' })
  declare todayCard50000Count: number
  @column()
  declare storage: any

  @column.dateTime()
  declare lastTransaction: DateTime

  @column({ serializeAs: null })
  declare password: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @column.dateTime()
  declare lastWin: DateTime | null

  static accessTokens = DbAccessTokensProvider.forModel(User, { table: 'remember_me_user_tokens' })

  public getAccesses() {
    return []
  }

  static async makeRefCode(phone: any = null) {
    const original = [...Array(10).keys()].join('') // Generate a string "0123456789"

    let ref = Helper.randomString(5, original)

    for (let i = 6; i <= 15; i++) {
      const exists = await User.query().where('ref_id', ref).first()
      if (exists) {
        ref = Helper.randomString(i, original)
      } else {
        break
      }
    }

    return ref
  }

  static async fake(number: number, user: any = null): Promise<Record<any, any>[]> {
    let items = []
    let rangeArray = range(1, number)
    for (const item of rangeArray) {
      const rand = Math.random()
      let fn = rand > 0.5 ? faker.person.firstName() : ''
      let ln = rand > 0.5 || fn == '' ? faker.person.lastName() : ''
      let fOption = {
        firstName: '',
        lastName: '',
      }

      fOption.firstName = fn
      fOption.lastName = ln
      let fullName = faker.person.fullName(fOption).trim()
      let username = faker.internet.username(fOption)

      if (startsWith(username, '_')) username = replace('_', '', username)
      if (startsWith(username, '.')) username = replace('.', '', username)
      fullName = replace('خانم', '', fullName)
      fullName = replace('آقای', '', fullName)
      fullName = replace('دکتر', '', fullName)

      if (items.filter((item) => item.username == username).length > 0) {
        rangeArray.push(1)
        continue
      }
      items.push({
        fullName,
        username,
        password: await hash.make(`${username}1`),
        ref_id: await User.makeRefCode(),
        role: 'bo',
        phone: '09999999999',
        agencyId: user?.agencyId ?? 1,
        agencyLevel: user?.agencyLevel ?? 0,
      })
    }

    const users = await User.createMany(items)
    users.forEach((u: User) => {
      u.related('financial').create({ balance: 0 })
    })
  }

  static async deleteAllInfo(data: User | UserFinancial) {
    let user
    if (data instanceof UserFinancial) {
      user = await User.find((data as UserFinancial).userId)
    } else user = data

    if (!user) return
    await Transaction.query()
      .where({ from_id: user.id, from_type: 'user' })
      .orWhere({ to_id: user.id, to_type: 'user' })
      .delete()
    if (user.financial) user.financial?.delete()
    else if (data instanceof UserFinancial) data?.delete()
    else await UserFinancial.query().where('user_id', user.id).delete()
    await user.delete()
  }
}
