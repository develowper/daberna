import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import User from '#models/user'
import { TransactionClientContract } from '@adonisjs/lucid/types/database'

export default class Lottery extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  static async setUserCardCount(
    cardNumber: number,
    user: User,
    ip: string,
    trx: TransactionClientContract
  ) {
    return false
  }
}
