import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import User from '#models/user'
import { TransactionClientContract } from '@adonisjs/lucid/types/database'
import Room from '#models/room'
import Setting from '#models/setting'

export default class Lottery extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  static async emmitInfo(sum) {
    const setting = await Setting.findBy('key', 'lottery')
    const lottery: any = JSON.parse(setting?.value ?? '[]')

    let [hour, minute] = `${lottery.start_at}`.split(':').map(Number)
    if (hour === 24) {
      hour = 0
    }
    const now = DateTime.now().setZone('Asia/Tehran')
    let target = now.set({ hour, minute, second: 0, millisecond: 0 })
    let secondsRemaining = 0
    if (target > now) {
      secondsRemaining = target.diff(now, 'seconds').seconds
    }
    lottery.seconds_remaining = secondsRemaining

    lottery.prizes =
      lottery.winners_percent
        ?.split('\n')
        ?.map((i) => Math.round((Number(i.percent) * sum) / 100)) ?? []

    return lottery
  }
}
