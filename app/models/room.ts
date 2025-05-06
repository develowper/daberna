import { DateTime } from 'luxon'
import { BaseModel, column, computed } from '@adonisjs/lucid/orm'
import collect from 'collect.js'
import { HttpContext } from '@adonisjs/core/http'
import emitter from '@adonisjs/core/services/emitter'
import { getSettings, range } from '#services/helper_service'
import User from '#models/user'
import app from '@adonisjs/core/services/app'
import Daberna from '#models/daberna'

// import { HttpContext } from '@adonisjs/http-server/build/standalone'
// @inject()
export default class Room extends BaseModel {
  private auth: any

  constructor() {
    super()
    this.auth = HttpContext.get()?.auth
  }
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare page: string

  @column()
  declare type: string

  @column()
  declare game: string

  @column()
  declare title: string

  @column()
  declare image: string

  @column({
    serialize: (value: string) => JSON.parse(value) ?? [],
    // consume: (value: any) => JSON.stringify(value)
  })
  declare players: any

  @column()
  declare starterId: number

  @column()
  declare botPercent: number
  @column()
  declare cardPrice: number
  @column()
  declare clearCount: number
  @column()
  declare playerCount: number
  @column()
  declare maxCardsCount: number
  @column()
  declare maxUserCardsCount: number
  @column()
  declare cardCount: number
  @column()
  declare winScore: number
  @column()
  declare rwp: number
  @column()
  @column()
  declare commissionPercent: number
  @column()
  declare winPercent: number
  @column({ serializeAs: 'rowWinPercent', columnName: 'row_win_percent' })
  declare rowWinPercent: number
  @column({
    serialize: (value: any) => value == 1,
  })
  declare isActive: boolean

  @column()
  declare maxSeconds: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: false, autoUpdate: false })
  declare startAt: DateTime | null

  @computed()
  public get startWithMe() {
    const user = this.auth?.user
    return this.starterId == user?.id
  }
  @computed()
  public get secondsRemaining() {
    if (!this.startAt) {
      return this.maxSeconds
    }

    const now = DateTime.now()
    const diffInSeconds = Math.round(this.startAt.diff(now, 'seconds').seconds)
    return diffInSeconds >= 0 ? diffInSeconds : this.maxSeconds
  }

  @computed()
  public get userCardCount() {
    return this.getUserCardCount()
  }

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  public getUserCardCount() {
    const user = this.auth?.user
    const result: any = collect(JSON.parse(this.players ?? '[]') ?? []).first(
      (item: any) => item.user_id == user?.id
    )

    return result?.card_count ?? 0
  }
  public setUserCardsCount(count: number, us: User | null = null, ip: any) {
    const user = us ?? this.auth?.user
    if (!user) return false
    let res: any[] = []
    const parsed: any = JSON.parse(this.players) ?? []
    const beforeExists = collect(parsed).first((item: any) => item.user_id == user.id)

    if (!beforeExists) {
      parsed.unshift({
        user_id: user.id,
        username: user.username,
        user_role: user.role,
        user_ip: ip,
        card_count: count,
      })
      res = parsed
      if (parsed.length > 0) this.starterId = user.id
    } else {
      res = collect(parsed)
        .map((item: any) => {
          if (item.user_id == user.id) item.card_count = count
          return item
        })
        .toArray()
    }
    this.players = JSON.stringify(res)
    this.$dirty.players = true
    return true
  }
  public async setUser(us: any = null, cmnd = 'add') {
    const user = us ?? this.auth?.user
    let res: any[] = []
    const parsed: any = JSON.parse(this.players ?? '[]') ?? []
    const beforeExists = collect(parsed).first(
      (item: any) => item.user_id == (user?.id ?? user.user_id)
    )
    res = parsed

    if (!beforeExists && cmnd === 'add') {
      parsed.push({
        user_id: user.id,
        username: user.username,
        user_role: user.role,
      })
      res = parsed
    } else if (beforeExists && cmnd === 'remove') {
      res = collect(parsed)
        .filter((item: any) => item.user_id != (user.id ?? user.user_id))
        .toArray()
    }
    this.cardCount = res.length
    this.playerCount = this.cardCount

    this.players = JSON.stringify(res)
    await this.save()

    return res
  }

  public static async addBot(
    room: Room,
    user: User | null = null,
    userCardCount: number | null = null
  ) {
    if (!room.isActive) return
    const players = JSON.parse(room.players ?? '[]')
    const beforeIds = collect(players).pluck('user_id').toArray()

    const botUser =
      user ??
      (await User.query()
        .whereNotIn('id', beforeIds)
        .where('is_active', true)
        .where('role', 'bo')
        .orderByRaw('RAND()')
        .forUpdate()
        .first())

    if (!botUser /*|| beforeIds.includes(user?.id)*/) return
    let cardCount = userCardCount ?? [1, 2, 3][Math.floor(Math.random() * 3)]
    if (room.maxCardsCount - room.cardCount <= 0) return
    if (room.maxCardsCount - room.cardCount <= 3)
      cardCount = userCardCount ?? room.maxCardsCount - room.cardCount
    if (room.setUserCardsCount(cardCount, botUser, null, null)) {
      room.playerCount++
      botUser.playCount++
      room.cardCount += cardCount
      // room.playerCount = JSON.parse(room.players ?? '[]').length
      if (
        room.playerCount == 2 /* ||
        (room.playerCount >= 2 && room.secondsRemaining == room.maxSeconds)*/
      )
        room.startAt = DateTime.now().plus({ seconds: room.maxSeconds - 1 })

      await room.save()
      switch (room.cardPrice) {
        case 5000:
          botUser.card5000Count += cardCount
          botUser.todayCard5000Count += cardCount
          break
        case 10000:
          botUser.card10000Count += cardCount
          botUser.todayCard10000Count += cardCount
          break
        case 20000:
          botUser.card20000Count += cardCount
          botUser.todayCard20000Count += cardCount
          break
        case 50000:
          botUser.card50000Count += cardCount
          botUser.todayCard50000Count += cardCount
          break
      }

      await botUser.save()
      // console.log('*************')
      // console.log(room.type)
      // console.log(room.cardCount)
      // console.log(room.secondsRemaining)
      // console.log(room.players)

      emitter.emit('room-update', {
        type: room.type,
        cmnd: 'card-added',
        players: room.players,
        game_id: room.clearCount,
        card_count: room.cardCount,
        player_count: room.playerCount,
        start_with_me: room.startWithMe,
        seconds_remaining: room.playerCount > 1 ? room.secondsRemaining : room.maxSeconds,
        user_id: botUser?.id,
        username: botUser?.username,
        user_card_count: cardCount,
        card_count: room.cardCount,
      })
      // await Daberna.startRooms([room])
    }
  }
}
