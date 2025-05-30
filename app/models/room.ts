import { DateTime } from 'luxon'
import { BaseModel, column, computed } from '@adonisjs/lucid/orm'
import collect from 'collect.js'
import { HttpContext } from '@adonisjs/core/http'
import emitter from '@adonisjs/core/services/emitter'
import Helper, { getSettings, range } from '#services/helper_service'
import User from '#models/user'
import app from '@adonisjs/core/services/app'
import Daberna from '#models/daberna'
import redis from '@adonisjs/redis/services/main'
import Telegram from '#services/telegram_service'
import db from '@adonisjs/lucid/services/db'
import { TransactionClient } from '@adonisjs/lucid/build/src/transaction_client/index.js'
import { TransactionClientContract } from '@adonisjs/lucid/types/database'

// import { HttpContext } from '@adonisjs/http-server/build/standalone'
// @inject()
export default class Room extends BaseModel {
  private auth: any

  constructor() {
    super()
    this.auth = HttpContext.get()?.auth
  }
  @computed()
  public get lockKey() {
    return `${this.type}:lock`
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
  declare starterId: number | null

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
    return (
      collect(JSON.parse(this.players ?? '[]') ?? []).first(
        (item: any) => item.user_id == this.auth?.user
      )?.card_count ?? 0
    )
  }

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  public async getUserCardCount() {
    const user = this.auth?.user
    //
    //     const script = `
    //   local data = redis.call("HGET", KEYS[1], ARGV[1])
    //   if not data then
    //     return 0
    //   end
    //
    //   local obj = cjson.decode(data)
    //   return obj.card_count or 0
    // `
    //     const newCardCount = (await redis.eval(script, 1, this.type, user?.id)) ?? 0
    //     // return JSON.parse((await redis.hget(this.type, user?.id)) || '{}').card_count ?? 0
    //     return newCardCount

    const result: any = collect(JSON.parse(this.players ?? '[]') ?? []).first(
      (item: any) => item.user_id == user?.id
    )

    return result?.card_count ?? 0
  }
  public async redisResetRoom() {
    const roomKey = this.type
    await redis.set(this.lockKey, '1' /*, 'EX', 1*/)
    await redis.del(roomKey)
  }

  public async redisAddPlayer(userId, playerData) {
    const roomKey = this.type
    const luaScript =
      /*
      `  if redis.call('EXISTS', KEYS[2]) == 1 then
      return "LOCKED"
    end

    ` +*/
      `
    local currentCount = redis.call('HLEN', KEYS[1])
    if currentCount < tonumber(ARGV[3]) then
      redis.call('HSET', KEYS[1], ARGV[1], ARGV[2])
      return "ADDED"
    else
      return "FULL"
    end
  `
    const result = await redis.eval(
      luaScript,
      2,
      roomKey,
      this.lockKey,
      userId,
      playerData,
      `${this.maxCardsCount}`
    )
    if (result != 'ADDED') console.log(result, this.type, userId, await redis.hlen(roomKey))
    // return true
    return result === 'ADDED'
  }
  public async createGame() {
    // if (await redis.exists(this.lockKey)) return null
    // await redis.set(this.lockKey, '1')
    // await redis.del(this.lockKey)
    const lockAcquired = await redis.set(this.lockKey, '1', 'PX', 300, 'NX')
    if (!lockAcquired) return null // Lock already exists, skip
    let game = null
    try {
      game = await Daberna.makeGame(this)
    } catch (e) {
      await Telegram.logAdmins(String(e), null, Helper.TELEGRAM_TOPICS.BUG)
    } finally {
      await redis.del(this.lockKey)
      await redis.del(this.type)
    }
    return game
  }
  public async setUserCardsCount(
    count: number,
    us: User | null = null,
    ip: any,
    trx: TransactionClient
  ) {
    const user = us ?? this.auth?.user
    if (!user) return false
    let res: any[] = []
    let result = false
    const parsed: any = JSON.parse(this.players) ?? []
    const beforeExists = collect(parsed).first((item: any) => item.user_id == user.id)
    /*
    const lockAcquired = await redis.set(this.lockKey, '1', 'PX', 200, 'NX')
    if (!lockAcquired) return false // Lock already exists, skip
    if (
      !(await this.redisAddPlayer(
        user.id,
        '1' ??
          JSON.stringify({
            user_id: user.id,
            username: user.username,
            user_role: user.role,
            user_ip: ip,
            card_count: count,
          })
      ))
    ) {
      return false
    }
*/
    // await redis.hset(
    //   `${this.type}`,
    //   user.id,
    //   JSON.stringify({
    //     user_id: user.id,
    //     username: user.username,
    //     user_role: user.role,
    //     user_ip: ip,
    //     card_count: count,
    //   })
    // )

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
    /*  await redis.del(this.lockKey)*/
    return true
  }
  async setLotteryCardCount(
    cardNumber: number,
    us: User,
    ip: string,
    trx: TransactionClientContract
  ): Promise<any> {
    const user = us ?? this.auth?.user
    if (!user) return false
    let res: any[] = []
    let result = ''
    const parsed: any = JSON.parse(this.players) ?? []
    const beforeUser = collect(parsed).first((item: any) => item.user_id == user.id)

    if (collect(parsed).first((item: any) => item.card_numbers.includes(cardNumber))) {
      return 'card_bought_before'
    }
    if (!beforeUser) {
      parsed.unshift({
        user_id: user.id,
        username: user.username,
        user_role: user.role,
        user_ip: ip,
        card_count: 1,
        card_numbers: [cardNumber],
      })
      res = parsed
      if (parsed.length > 0) this.starterId = user.id
    } else {
      const cardNumbers = [...(beforeUser.card_numbers ?? []), cardNumber]

      res = collect(parsed)
        .map((item: any) => {
          if (item.user_id == user.id) {
            item.card_numbers = cardNumbers
            item.card_count = cardNumbers.length
          }
          return item
        })
        .toArray()
    }
    this.players = JSON.stringify(res)
    this.$dirty.players = true
    return 'added'
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
    roomData: Room,
    user: User | null = null,
    userCardCount: number | null = null
  ) {
    if (!roomData.isActive) return
    await db.transaction(async (trx) => {
      const room: Room = await Room.query({ client: trx })
        .where('id', roomData.id)
        .forUpdate()
        .first()
      if (!room) return
      const players = room.players
      const beforeIds = collect(players)
        .pluck('user_id')
        .map((i) => `${i}`)
        .toArray()

      const botUser =
        user ??
        (await User.query({ client: trx })
          .whereNotIn('id', beforeIds)
          .where('is_active', true)
          .where('role', 'bo')
          .orderByRaw('RAND()')
          .first())

      if (!botUser /*|| beforeIds.includes(user?.id)*/) return
      let cardCount = userCardCount ?? [1, 2, 3][Math.floor(Math.random() * 3)]
      if (room.maxCardsCount - room.cardCount <= 0) return
      if (room.maxCardsCount - room.cardCount <= 3)
        cardCount = userCardCount ?? room.maxCardsCount - room.cardCount

      if (await room.setUserCardsCount(cardCount, botUser, null, trx)) {
        room.playerCount++
        botUser.playCount++
        room.cardCount += cardCount
        // room.playerCount = JSON.parse(room.players ?? '[]').length
        if (
          room.playerCount == 2 /* ||
        (room.playerCount >= 2 && room.secondsRemaining == room.maxSeconds)*/
        )
          room.startAt = DateTime.now().plus({ seconds: room.maxSeconds - 1 })

        await room.useTransaction(trx).save()
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

        await botUser.useTransaction(trx).save()
        // console.log('*************')
        // console.log(room.type)
        // console.log(room.cardCount)
        // console.log(room.secondsRemaining)
        // console.log(room.players)
        const data = {
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
        }
        emitter.emit('room-update', data)

        // await Daberna.startRooms([room])
      }
    })
  }
}
