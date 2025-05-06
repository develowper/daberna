// import type { HttpContext } from '@adonisjs/core/http'

import type { HttpContext } from '@adonisjs/core/http'
import Room from '#models/room'
import { asPrice, sendError, __, getRandomBetween } from '#services/helper_service'
import UserFinancial from '#models/user_financial'
import { inject } from '@adonisjs/core'
import Helper from '#services/helper_service'
import Setting from '#models/setting'
import collect from 'collect.js'
import vine from '@vinejs/vine'
import emitter from '@adonisjs/core/services/emitter'
// import { emitter } from '#start/globals'
import User from '../../models/user.js'
import { DateTime } from 'luxon'
// import MySocket from '@ioc:MySocket'
import app from '@adonisjs/core/services/app'
import mserver from '@adonisjs/core/services/server'
import Daberna from '#models/daberna'
import i18nManager from '@adonisjs/i18n/services/main'
import env from '#start/env'
import { storage } from '../../../resources/js/storage.js'
import db from '@adonisjs/lucid/services/db'

@inject()
export default class RoomController {
  // constructor(protected helper: Helper) {}

  async get({ response, request }: HttpContext) {
    let query = Room.query()
    // query = query.where('is_active', true)
    if (request.input('id')) query = query.where('id', request.input('id'))
    if (request.input('game'))
      query = query.where('game', request.input('game')).where('is_active', true)
    else query = query.where('game', 'daberna')
    let data = await query

    data = data.map((item: Room) => {
      if (item.type == 'd5000') item.playerCount = getRandomBetween(50, 80)
      else if (item.type == 'd10000') item.playerCount = getRandomBetween(20, 40)
      else if (item.type == 'd20000') item.playerCount = getRandomBetween(10, 20)
      else if (item.type == 'd50000') item.playerCount = getRandomBetween(0, 10)
      else if (item.type == 'b1') item.playerCount = getRandomBetween(0, 10)
      return item
    })

    return response.json({ data: data.map((item) => item.serialize()) })
  }

  // async payAndJoin({ response, request, auth, i18n }: HttpContext) {
  //   const user = auth.user as User
  //   const roomType = request.input('room_type')
  //   const cardCount = Number.parseInt(request.input('card_count'))
  //   const ip = request.ip()
  //   const trx = await db.transaction()
  //
  //   const room = await Room.query({ client: trx })
  //     .where('is_active', true)
  //     .where('type', roomType)
  //     .forUpdate()
  //     .first()
  //
  //   if (!user.isActive) {
  //     // await trx.commit()
  //     return response
  //       .status(Helper.ERROR_STATUS)
  //       .json({ message: i18n.t('messages.is_inactive_*', { item: i18n.t('messages.user') }) })
  //   }
  //   if (!room || Number.isNaN(cardCount)) {
  //     // await trx.commit()
  //     return response
  //       .status(Helper.ERROR_STATUS)
  //       .json({ message: i18n.t('messages.not_found_*', { item: i18n.t('messages.game_room') }) })
  //   }
  //   // const settings = await  getSettings([
  //   //   'max_user_room_cards',
  //   //   'max_room_cards',
  //   //   'row_win_percent',
  //   //   'win_percent',
  //   // ])
  //
  //   const userBeforeCardCounts = room.getUserCardCount()
  //
  //   if (userBeforeCardCounts + cardCount > room.maxUserCardsCount) {
  //     // await trx.commit()
  //     return sendError(i18n.t('messages.validate.max_cards', { value: room.maxUserCardsCount }))
  //   }
  //   if (room.cardCount + cardCount > room.maxCardsCount) {
  //     // await trx.commit()
  //     return sendError(i18n.t('messages.validate.max_room_cards', { value: room.maxCardsCount }))
  //   }
  //   const beforeIpExists = collect(JSON.parse(room.players) ?? []).first(
  //     (item: any) => ip != null && item.user_ip == ip && item.user_id != user.id
  //   )

  //   if (beforeIpExists) {
  //     // await trx.commit()
  //     return sendError(i18n.t('messages.validate.duplicate_*', { value: 'ip' }))
  //   }
  //
  //   const userFinancials = await UserFinancial.firstOrCreate(
  //     { userId: user?.id },
  //     { balance: 0 } /*,
  //     { client: trx }*/
  //   )
  //   const totalPrice = room.cardPrice * cardCount
  //   // vine.compile(vine.object({
  //   //   totalPrice: vine.number().max(userFinancials.balance)
  //   // },)).validate({ totalPrice })
  //
  //   if (userFinancials.balance < totalPrice) {
  //     // await trx.commit()
  //     // userFinancials.balance = 100000
  //     // userFinancials.save()
  //     return sendError(
  //       i18n.t('messages.validate.min', {
  //         item: i18n.t('messages.wallet'),
  //         value: `${asPrice(totalPrice)} ${i18n.t('messages.currency')}`,
  //       })
  //     )
  //   }
  //   try {
  //     if (room.setUserCardsCount(userBeforeCardCounts + cardCount, user, request.ip())) {
  //       if (userBeforeCardCounts == 0) {
  //         room.playerCount++
  //         user.playCount++
  //       }
  //       room.cardCount += cardCount
  //
  //       if (
  //         room.playerCount == 2 &&
  //         userBeforeCardCounts == 0 /*||
  //       (room.playerCount > 2 && room.secondsRemaining == room.maxSeconds)*/
  //       )
  //         room.startAt = DateTime.now().plus({ seconds: room.maxSeconds - 1 })
  //
  //       await room.save()
  //       // await room.useTransaction(trx).save()
  //
  //       userFinancials.balance -= totalPrice
  //       // await userFinancials.useTransaction(trx).save()
  //       await userFinancials.save()
  //
  //       switch (room.cardPrice) {
  //         case 5000:
  //           user.card5000Count += cardCount
  //           user.todayCard5000Count += cardCount
  //           break
  //         case 10000:
  //           user.card10000Count += cardCount
  //           user.todayCard10000Count += cardCount
  //           break
  //         case 20000:
  //           user.card20000Count += cardCount
  //           user.todayCard20000Count += cardCount
  //           break
  //         case 50000:
  //           user.card50000Count += cardCount
  //           user.todayCard50000Count += cardCount
  //           break
  //       }
  //
  //       await user.save()
  //
  //       emitter.emit('room-update', {
  //         type: roomType,
  //         cmnd: 'card-added',
  //         game_id: room.clearCount,
  //         cards: room.cardCount,
  //         players: room.players,
  //         start_with_me: room.startWithMe,
  //         seconds_remaining: room.playerCount > 1 ? room.secondsRemaining : room.maxSeconds,
  //         player_count: room.playerCount,
  //         // user_id: user?.id,
  //         // username: user?.username,
  //         // user_card_count: userBeforeCardCounts + cardCount,
  //         card_count: room.cardCount,
  //       })
  //       // emitter.emit(`user-${user.id}-info`, { user_balance: userFinancials.balance })
  //
  //       // Daberna.startRooms([room])
  //     }
  //     // await trx.commit()
  //   } catch (error) {
  //     // await trx.rollback()
  //   }
  //   return response.json({ user_balance: userFinancials?.balance })
  // }

  async payAndJoin({ response, request, auth, i18n }: HttpContext) {
    const user = auth.user as User
    const roomType = request.input('room_type')
    const cardCount = Number.parseInt(request.input('card_count'))
    const ip = request.ip()
    const trx = await db.transaction()

    try {
      const room = await Room.query({ client: trx })
        .where('is_active', true)
        .where('type', roomType)
        .forUpdate()
        .first()

      if (!user.isActive || !room || Number.isNaN(cardCount)) {
        await trx.rollback()
        return response.status(422).json({
          message: i18n.t('messages.validation_failed'),
        })
      }

      const userBeforeCardCounts = room.getUserCardCount()

      if (userBeforeCardCounts + cardCount > room.maxUserCardsCount) {
        await trx.rollback()
        return response.status(400).json({
          message: i18n.t('messages.validate.max_cards', { value: room.maxUserCardsCount }),
        })
      }

      if (room.cardCount + cardCount > room.maxCardsCount) {
        await trx.rollback()
        return response.status(400).json({
          message: i18n.t('messages.validate.max_room_cards', { value: room.maxCardsCount }),
        })
      }

      const beforeIpExists = collect(JSON.parse(room.players) ?? []).first(
        (item: any) => !!ip && item.user_ip === ip && item.user_id !== user.id
      )
      if (beforeIpExists) {
        await trx.rollback()
        return response.status(400).json({
          message: i18n.t('messages.duplicate_ip'),
        })
      }

      const userFinancials = await UserFinancial.firstOrCreate(
        { userId: user?.id },
        { balance: 0 },
        { client: trx }
      )
      const totalPrice = room.cardPrice * cardCount

      if (userFinancials.balance < totalPrice) {
        await trx.rollback()
        return response.status(400).json({
          message: i18n.t('messages.validate.min', {
            item: i18n.t('messages.wallet'),
            value: `${asPrice(totalPrice)} ${i18n.t('messages.currency')}`,
          }),
        })
      }

      if (room.setUserCardsCount(userBeforeCardCounts + cardCount, user, ip)) {
        if (userBeforeCardCounts === 0) {
          room.playerCount++
          user.playCount++
        }

        room.cardCount += cardCount

        if (room.playerCount === 2 && userBeforeCardCounts === 0) {
          room.startAt = DateTime.now().plus({ seconds: room.maxSeconds - 1 })
        }

        await room.useTransaction(trx).save()

        userFinancials.balance -= totalPrice
        await userFinancials.useTransaction(trx).save()

        switch (room.cardPrice) {
          case 5000:
            user.card5000Count += cardCount
            user.todayCard5000Count += cardCount
            break
          case 10000:
            user.card10000Count += cardCount
            user.todayCard10000Count += cardCount
            break
          case 20000:
            user.card20000Count += cardCount
            user.todayCard20000Count += cardCount
            break
          case 50000:
            user.card50000Count += cardCount
            user.todayCard50000Count += cardCount
            break
        }

        await user.useTransaction(trx).save()

        await trx.commit()

        emitter.emit('room-update', {
          type: roomType,
          cmnd: 'card-added',
          game_id: room.clearCount,
          cards: room.cardCount,
          players: room.players,
          start_with_me: room.startWithMe,
          seconds_remaining: room.playerCount > 1 ? room.secondsRemaining : room.maxSeconds,
          player_count: room.playerCount,
          card_count: room.cardCount,
        })

        return response.json({ user_balance: userFinancials.balance })
      }

      await trx.rollback()
      return response.status(500).json({ message: 'Unexpected error occurred' })
    } catch (error) {
      await trx.rollback()
      return response.status(500).json({ message: 'Transaction failed', error })
    }
  }
}
