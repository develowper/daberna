import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import User from '#models/user'
import { TransactionClientContract } from '@adonisjs/lucid/types/database'
import Room from '#models/room'
import Setting from '#models/setting'
import { asPrice } from '#services/helper_service'

export default class Lottery extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  static async emmitInfo(room, settings = null) {
    const setting = settings ?? (await Setting.findBy('key', 'lottery'))
    const lottery: any = JSON.parse(setting?.value ?? '[]')

    let [hour, minute] = `${lottery.start_at}`.split(':').map(Number)
    // if (hour === 24) {
    //   hour = 0
    // }
    const now = DateTime.now().setZone('Asia/Tehran')
    let target = now.set({ hour, minute, second: 0, millisecond: 0 })
    let secondsRemaining = target.diff(now, 'seconds').seconds
    secondsRemaining = Math.round(secondsRemaining < 0 ? 0 : secondsRemaining)

    lottery.room_id = room.id
    lottery.seconds_remaining = secondsRemaining
    const sum = room.cardCount * room.cardPrice
    lottery.prizes =
      lottery.winners_prize?.split('\n')?.map((i) => {
        const p = Number(i)
        return asPrice(p < 100 ? Math.round((p * sum) / 100) : p)
      }) ?? []

    return lottery
  }
}
