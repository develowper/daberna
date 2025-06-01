import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import User from '#models/user'
import { TransactionClientContract } from '@adonisjs/lucid/types/database'
import Room from '#models/room'
import Setting from '#models/setting'
import { __, asPrice, shuffle } from '#services/helper_service'
import db from '@adonisjs/lucid/services/db'
import collect from 'collect.js'
import emitter from '@adonisjs/core/services/emitter'
import Transaction from '#models/transaction'
import Telegram from '#services/telegram_service'
import Log from '#models/log'
import AgencyFinancial from '#models/agency_financial'

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
    lottery.status = Number(lottery.status ?? 0)
    if (lottery.status == 0) return { status: 0 }
    let [hour, minute] = `${lottery.start}`.split(':').map(Number)
    // if (hour === 24) {
    //   hour = 0
    // }
    const now = DateTime.now().setZone('Asia/Tehran')
    let target = now.set({ hour, minute, second: 0, millisecond: 0 })
    let secondsRemaining = target.diff(now, 'seconds').seconds
    secondsRemaining = Math.round(secondsRemaining < 0 ? 0 : secondsRemaining)
    lottery.start_at = target
    lottery.room_id = room.id
    lottery.seconds_remaining = secondsRemaining
    const sum = room.cardCount * room.cardPrice
    lottery.prizes =
      lottery.winners_prize?.split('\n')?.map((i) => {
        const p = Number(i)
        return p < 100 ? Math.round((p * sum) / 100) : p
      }) ?? []

    return lottery
  }
  static async createGame() {
    const setting = await Setting.findBy('key', 'lottery')
    let lottery: any = JSON.parse(setting?.value ?? '[]')
    // console.log('status', lottery.status)
    if (lottery.status != 1) return null

    const now = DateTime.now().setZone('Asia/Tehran')
    let [hour, minute] = `${lottery.start}`.split(':').map(Number)

    // console.log(`hour: ${hour}:${now.hour}`, `minute: ${minute}:${now.minute}`)
    if (hour == 24) hour = 0
    if (now.hour != hour || now.minute != minute) return null

    const transactions = []
    lottery = await db.transaction(async (trx) => {
      const room: Room = await Room.query({ client: trx })
        .where('game', 'lottery')
        .where('is_active', true)
        .forUpdate()
        .first()
      if (!room) return null
      room.isActive = false
      await room.useTransaction(trx).save()

      lottery = await Lottery.emmitInfo(room, setting)
      lottery.id = (lottery?.id ?? 0) + 1
      //find winners
      let commissionPrice = room.cardCount * room.cardPrice

      const players = JSON.parse(room.players ?? '[]')
      const usedNumbers = shuffle(players.map((i) => i.card_numbers).flat() ?? [])

      console.log('numbers', usedNumbers)
      const winners = []
      const financialCache = new Map()
      //
      for (let prize of lottery.prizes ?? []) {
        console.log('prize', prize)
        const winNumber = usedNumbers.pop() ?? null
        if (!winNumber) continue
        console.log('winNumber', winNumber)
        //find user winner
        const userId = players.find((i) => i.card_numbers.includes(winNumber))?.user_id
        if (!userId) continue
        console.log('userId', userId)
        const user = await User.query().where('id', userId).preload('financial').first()
        if (!user) continue
        console.log('user', user.username)
        let financial
        if (financialCache.has(userId)) financial = financialCache.get(userId)
        financial =
          financial ?? user.financial ?? (await user.related('financial').create({ balance: 0 }))

        const beforeBalance = Number(financial.balance)
        financial.balance = Number(financial.balance) + Number(prize)
        const afterBalance = Number(financial.balance)
        console.log('username', user.username)
        console.log('financial', beforeBalance, afterBalance)
        const transaction = await Transaction.create(
          {
            agencyId: user?.agencyId,
            type: 'lottery',
            fromType: 'lottery',
            fromId: lottery.id ?? 1,
            toType: 'user',
            toId: user?.id,
            amount: prize,
            gateway: 'wallet',
            payId: `${Date.now()}`,
            payedAt: DateTime.now(),
            title: __(`*_from_*_to_*`, {
              item1: __(`win`),
              item2: `${__(`lottery`)}${room.cardPrice} (${lottery.id ?? 1})`,
              item3: `${__(`user`)}  (${user?.id})`,
            }),
            info: JSON.stringify({ before_balance: beforeBalance, after_balance: afterBalance }),
          },
          { client: trx }
        )

        await financial.useTransaction(trx).save()
        financialCache.set(userId, financial)
        commissionPrice -= Number(prize)
        transaction.user = user
        transactions.push(transaction)
        winners.push({
          user_id: userId,
          username: user.username,
          card_number: winNumber,
          prize: prize,
        })
      }
      lottery.winners = winners
      lottery.status = 2
      console.log('winners', winners)
      await Setting.query({ client: trx })
        .where('key', 'lottery')
        .update('value', JSON.stringify(lottery))

      if (commissionPrice != 0) {
        const af = await AgencyFinancial.find(1)
        af.balance += commissionPrice
        await af.useTransaction(trx).save()
        // console.log('commissionTransaction', commissionPrice)
        await Transaction.add(
          'commission',
          'lottery',
          lottery.id ?? 1,
          'agency',
          af.agencyId,
          commissionPrice,
          af.agencyId,
          null,
          __(`*_from_*_to_*`, {
            item1: __(`commission`),
            item2: `${__(`lottery`)}${room.cardPrice} (${lottery.id ?? 1})`,
            item3: `${__(`agency`)} (${af.agencyId})`,
          })
        )
      }
      await Log.add(
        room.type,
        room.cardCount,
        1,
        commissionPrice,
        DateTime.now().startOf('day').toJSDate()
      )

      room.playerCount = 0
      room.cardCount = 0
      room.players = null
      room.startAt = null
      room.isActive = true
      await room.useTransaction(trx).save()

      return lottery
    })
    if (lottery.status == 2 && transactions.length > 0) {
      for (let t of transactions) {
        console.log('transaction', t.id)
        // Telegram.log(null, 'transaction_created', t)
      }
      return lottery
    }
    return null
  }
}
