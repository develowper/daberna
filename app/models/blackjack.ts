import { DateTime } from 'luxon'
import { BaseModel, column, computed } from '@adonisjs/lucid/orm'
import { HttpContext } from '@adonisjs/core/http'
import Helper, { __, shuffle, sleep, asPrice } from '#services/helper_service'
import SocketIo from '#services/socketio_service'
import UserFinancial from '#models/user_financial'
import User from '#models/user'
import Transaction from '#models/transaction'
import AgencyFinancial from '#models/agency_financial'
import Log from '#models/log'
import Telegram from '#services/telegram_service'
export default class Blackjack extends BaseModel {
  static table = 'blackjack'

  @computed()
  public get secondsRemaining() {
    if (!this.updatedAt) {
      return 0
    }
    const now = DateTime.now()
    const diffInSeconds = Math.round(
      this.updatedAt
        ?.plus({
          seconds:
            this.action == null ? Helper.BLACKJACK.startTime : Helper.BLACKJACK.maxResponseTime,
        })
        ?.diff(now, 'seconds').seconds
    )
    return diffInSeconds >= 0 ? diffInSeconds : 0
  }
  @column({ isPrimary: true })
  declare id: number
  @column({ columnName: 'p1_id' })
  declare p1Id: number | null
  @column({ columnName: 'p2_id' })
  declare p2Id: number | null
  @column({ columnName: 'p3_id' })
  declare p3Id: number | null
  @column({ columnName: 'p4_id' })
  declare p4Id: number | null
  @column({ columnName: 'p1_prize' })
  declare p1Prize: number
  @column({ columnName: 'p2_prize' })
  declare p2Prize: number
  @column({ columnName: 'p3_prize' })
  declare p3Prize: number
  @column({ columnName: 'p4_prize' })
  declare p4Prize: number

  @column({ columnName: 'p1_role' })
  declare p1Role: string | null
  @column({ columnName: 'p2_role' })
  declare p2Role: string | null
  @column({ columnName: 'p3_role' })
  declare p3Role: string | null
  @column({ columnName: 'p4_role' })
  declare p4Role: string | null

  @column({ columnName: 'p1_action1' })
  declare p1Action1: string | null
  @column({ columnName: 'p1_action2' })
  declare p1Action2: string | null
  @column({ columnName: 'p2_action1' })
  declare p2Action1: string | null
  @column({ columnName: 'p2_action2' })
  declare p2Action2: string | null
  @column({ columnName: 'p3_action1' })
  declare p3Action1: string | null
  @column({ columnName: 'p3_action2' })
  declare p3Action2: string | null
  @column({ columnName: 'p4_action1' })
  declare p4Action1: string | null
  @column({ columnName: 'p4_action2' })
  declare p4Action2: string | null
  @column.dateTime({ columnName: 'p1_checkout1' })
  declare p1Checkout1: any
  @column.dateTime({ columnName: 'p1_checkout2' })
  declare p1Checkout2: any
  @column.dateTime({ columnName: 'p2_checkout1' })
  declare p2Checkout1: any
  @column.dateTime({ columnName: 'p2_checkout2' })
  declare p2Checkout2: any
  @column.dateTime({ columnName: 'p3_checkout1' })
  declare p3Checkout1: any
  @column.dateTime({ columnName: 'p3_checkout2' })
  declare p3Checkout2: any
  @column.dateTime({ columnName: 'p4_checkout1' })
  declare p4Checkout1: any
  @column.dateTime({ columnName: 'p4_checkout2' })
  declare p4Checkout2: any

  @column()
  declare action: string | null
  @column()
  declare title: string
  @column()
  declare rwp: number
  @column({
    serialize: (value: string) => JSON.parse(value) ?? {},
    // consume: (value: any) => JSON.stringify(value),
  })
  declare state: any
  @column()
  declare type: string
  @column()
  declare step: number
  @column()
  declare isActive: boolean
  @column()
  declare prize: number | null
  @column()
  declare commission: number | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  async findGame({ request, response, i18n }: HttpContext) {}

  public async setUser(user, cmnd = 'add') {
    const now = DateTime.now()
    let res = false
    if (!user) return false
    if (cmnd == 'add' && [this.p1Id, this.p2Id, this.p3Id, this.p4Id].includes(user.id)) {
      return true
    }
    if (cmnd == 'bet1' && ![this.p1Id, this.p2Id, this.p3Id, this.p4Id].includes(user.id)) {
      return false
    }
    if (cmnd == 'add' && ![this.p1Id, this.p2Id, this.p3Id, this.p4Id].includes(null)) {
      return false
    }
    const state = JSON.parse(this.state ?? '{}') ?? {}
    if (cmnd == 'add')
      if (this.p1Id == null) {
        this.p1Id = user.id
        this.p1Role = user.role
        this.p1Checkout1 = now
        this.p1Action1 = 'bet'
        this.p1Checkout2 = null
        this.p1Action2 = null
        res = true
      } else if (this.p2Id == null) {
        this.p2Id = user.id
        this.p2Role = user.role
        this.p2Checkout1 = now
        this.p2Action1 = 'bet'
        this.p2Checkout2 = null
        this.p2Action2 = null
        res = true
      } else if (this.p3Id == null) {
        this.p3Id = user.id
        this.p3Role = user.role
        this.p3Checkout1 = now
        this.p3Action1 = 'bet'
        this.p3Checkout2 = null
        this.p3Action2 = null
        res = true
      } else if (this.p4Id == null) {
        this.p4Id = user.id
        this.p4Role = user.role
        this.p4Checkout1 = now
        this.p4Action1 = 'bet'
        this.p4Checkout2 = null
        this.p4Action2 = null
        res = true
      }
    if (cmnd == 'remove')
      if (this.p1Id == user.id) {
        this.p1Id = null
        this.p1Role = null
        this.p1Checkout1 = null
        this.p1Action1 = null
        this.p1Checkout2 = null
        this.p1Action2 = null
        res = true
      } else if (this.p2Id == user.id) {
        this.p2Id = null
        this.p2Id = null
        this.p2Role = null
        this.p2Checkout1 = null
        this.p2Action1 = null
        this.p2Checkout2 = null
        this.p2Action2 = null
        res = true
      } else if (this.p3Id == user.id) {
        this.p3Id = null
        this.p3Role = null
        this.p3Checkout1 = null
        this.p3Action1 = null
        this.p3Checkout2 = null
        this.p3Action2 = null
        res = true
      } else if (this.p4Id == user.id) {
        this.p4Id = null
        this.p4Role = null
        this.p4Checkout1 = null
        this.p4Action1 = null
        this.p4Checkout2 = null
        this.p4Action2 = null
        res = true
      }
    if (cmnd == 'bet1')
      if (this.p1Id == user.id) {
        this.p1Checkout1 = now
        this.p1Action1 = 'bet_done'

        res = true
      } else if (this.p2Id == user.id) {
        this.p2Checkout1 = now
        this.p2Action1 = 'bet_done'

        res = true
      } else if (this.p3Id == user.id) {
        this.p3Checkout1 = now
        this.p3Action1 = 'bet_done'
        res = true
      } else if (this.p4Id == user.id) {
        this.p4Checkout1 = now
        this.p4Action1 = 'bet_done'
        res = true
      }

    if (res) {
      if (cmnd == 'add')
        state[user.id] = {
          cards1: [''],
          cards2: [],
          username: user.username,
          balance: user.balance ?? 0,
          bet1: user.bet_amount ?? 0,
        }
      if (cmnd == 'bet1') {
        state[user.id].balance = user.balance
        state[user.id].bet1 = user.bet_amount
      }
      if (cmnd == 'remove') delete state[user.id]
      this.state = JSON.stringify(state)
      await this.save()
    }
    return res
  }

  static async play(game: Blackjack, cmnd: any) {}
  static async botPlay(game: Blackjack) {
    if ([game.p1Id, game.p2Id, game.p3Id, game.p4Id].filter((item) => item != null).length == 0)
      return
    const now = DateTime.now()
    if (
      game.action == null &&
      (game.updatedAt
        ?.plus({ seconds: Helper.BLACKJACK.multiplayer ? Helper.BLACKJACK.startTime : 0 })
        ?.diff(now, 'seconds').seconds ?? 0) <= 0
    ) {
      game.action = 'bet'
      Blackjack.updateSocket(await Blackjack.resetTimestamps(game))
    }
    if (
      Helper.BLACKJACK.multiplayer &&
      game.action == 'dealer_decision' &&
      (game.updatedAt?.plus({ seconds: Helper.BLACKJACK.maxResponseTime })?.diff(now, 'seconds')
        .seconds ?? 0) <= 0
    ) {
      Blackjack.updateSocket(await Blackjack.reset(game))
    }

    console.log(game.id, game.type, game.action)
    // console.log(
    //   game.updatedAt?.plus({ seconds: Helper.BLACKJACK.maxResponseTime })?.diff(now, 'seconds')
    //     .seconds
    // )
    let state
    let num1
    let num2
    let remindedCards
    let usedCards

    if (game.action == 'bet') {
      let readyForSpareCards = false
      //check all players bet_done or kick if action1 reminded bet and checkout bigger than 30 seconds
      const p1HasTime =
        (game.p1Checkout1?.plus({ seconds: Helper.BLACKJACK.maxResponseTime })?.diff(now, 'seconds')
          .seconds ?? 0) > 0
      const p2HasTime =
        !Helper.BLACKJACK.multiplayer ||
        (game.p2Checkout1?.plus({ seconds: Helper.BLACKJACK.maxResponseTime })?.diff(now, 'seconds')
          .seconds ?? 0) > 0
      const p3HasTime =
        !Helper.BLACKJACK.multiplayer ||
        (game.p3Checkout1?.plus({ seconds: Helper.BLACKJACK.maxResponseTime })?.diff(now, 'seconds')
          .seconds ?? 0) > 0
      const p4HasTime =
        !Helper.BLACKJACK.multiplayer ||
        (game.p4Checkout1?.plus({ seconds: Helper.BLACKJACK.maxResponseTime })?.diff(now, 'seconds')
          .seconds ?? 0) > 0

      if (game.p1Action1 == 'bet' && !p1HasTime) {
        if (Helper.BLACKJACK.multiplayer) {
          game.action = 'done'
          await game.save()
          Blackjack.updateSocket(game)
        } else await game.setUser({ id: game.p1Id }, 'remove')
      }
      if (game.p2Action1 == 'bet' && !p2HasTime) {
        await game.setUser({ id: game.p2Id }, 'remove')
      }
      if (game.p3Action1 == 'bet' && !p3HasTime) {
        await game.setUser({ id: game.p3Id }, 'remove')
      }
      if (game.p4Action1 == 'bet' && !p4HasTime) {
        await game.setUser({ id: game.p4Id }, 'remove')
      }
      const gameIsEmpty =
        [game.p1Id, game.p2Id, game.p3Id, game.p4Id].filter((item) => item != null).length == 0
      if (
        !gameIsEmpty &&
        [game.p1Action1, game.p2Action1, game.p3Action1, game.p4Action1].filter((item) =>
          ['bet_done', null].includes(item)
        ).length == 4
      ) {
        readyForSpareCards = true
      }
      if (gameIsEmpty) {
        game.action = null
        Blackjack.updateSocket(game)
        await game.save()
      }
      console.log('gameIsEmpty', gameIsEmpty)
      console.log('readyForSpareCards', readyForSpareCards)
      if (readyForSpareCards) {
        Blackjack.updateSocket(game)
        game.action = 'set_cards'
        await game.save()
      }
      if (Helper.BLACKJACK.multiplayer && !game.secondsRemaining) Blackjack.updateSocket(game)
    }
    if (game.action == 'set_cards') {
      const cards = shuffle(Helper.BLACKJACK.cards)
      usedCards = []
      state = JSON.parse(game.state ?? '{}') ?? {}
      let popped1 = cards.pop()
      usedCards.push(popped1)
      let popped2 = null
      state['dealer'] = { cards: [popped1, 'back'], sum: Blackjack.getCardsSums([popped1]) }
      if (game.p1Id) {
        game.p1Action1 = 'decision'
        game.p1Checkout1 = now
        popped1 = cards.pop()
        usedCards.push(popped1)
        popped2 = cards.pop()

        state[game.p1Id]['sum1'] = Blackjack.getCardsSums([popped1, popped2])
        if (game.botWin())
          while ((state[game.p1Id]['sum1'][0] ?? 0) == 21) {
            cards.push(popped2)
            popped2 = cards.shift()
            state[game.p1Id]['sum1'] = Blackjack.getCardsSums([popped1, popped2])
          }
        usedCards.push(popped2)
        state[game.p1Id]['cards1'] = [popped1, popped2]
        num1 = Blackjack.getCardValue(popped1)
        num2 = Blackjack.getCardValue(popped2)
        state[game.p1Id]['allowed1'] = ['hit', 'stand']
        if (popped1.substring(1) == popped2.substring(1)) {
          state[game.p1Id]['allowed1'].push('split')
        }
        //double:9,10,11
        if ([9, 10, 11].includes(num1 + num2)) {
          state[game.p1Id]['allowed1'].push('double')
        }
        //blackjack: pay u 1.5 bet unless dealer also blackjack
        if (num1 + num2 == 21) {
          game.p1Action1 = 'decision_done'
          state[game.p1Id]['allowed1'] = []
        }
        state[game.p1Id]['sum1'] = [num1 + num2]
        if (num1 == 1 || num2 == 1) {
          state[game.p1Id]['sum1'].push(num1 + num2 + 10)
        }
      }
      if (game.p2Id) {
        game.p2Action1 = 'decision'
        game.p2Checkout1 = now
        popped1 = cards.pop()
        usedCards.push(popped1)
        popped2 = cards.pop()
        usedCards.push(popped2)
        state[game.p2Id]['cards1'] = [popped1, popped2]
        state[game.p2Id]['sum1'] = Blackjack.getCardsSums([popped1, popped2])
        num1 = Blackjack.getCardValue(popped1)
        num2 = Blackjack.getCardValue(popped2)
        //double:9,10,11
        state[game.p2Id]['allowed1'] = ['hit', 'stand']
        if (num1 == num2) {
          state[game.p2Id]['allowed1'].push('split')
        }
        if ([9, 10, 11].includes(num1 + num2)) {
          state[game.p2Id]['allowed1'].push('double')
        }
        //blackjack: pay u 1.5 bet unless dealer also blackjack
        if (num1 + num2 == 21) {
          game.p2Action1 = 'decision_done'
          state[game.p2Id]['allowed1'] = []
        }
        state[game.p2Id]['sum1'] = [num1 + num2]
        if (num1 == 1 || num2 == 1) {
          state[game.p2Id]['sum1'].push(num1 + num2 + 10)
        }
      }
      if (game.p3Id) {
        game.p3Action1 = 'decision'
        game.p3Checkout1 = now
        popped1 = cards.pop()
        usedCards.push(popped1)
        popped2 = cards.pop()
        usedCards.push(popped2)
        state[game.p3Id]['cards1'] = [popped1, popped2]
        state[game.p3Id]['sum1'] = Blackjack.getCardsSums([popped1, popped2])
        num1 = Blackjack.getCardValue(popped1)
        num2 = Blackjack.getCardValue(popped2)
        //double:9,10,11
        state[game.p3Id]['allowed1'] = ['hit', 'stand']
        if (num1 == num2) {
          state[game.p3Id]['allowed1'].push('split')
        }
        if ([9, 10, 11].includes(num1 + num2)) {
          state[game.p3Id]['allowed1'].push('double')
        }
        //blackjack: pay u 1.5 bet unless dealer also blackjack
        if (num1 + num2 == 21) {
          game.p3Action1 = 'decision_done'
          state[game.p3Id]['allowed1'] = []
        }
        state[game.p3Id]['sum1'] = [num1 + num2]
        if (num1 == 1 || num2 == 1) {
          state[game.p3Id]['sum1'].push(num1 + num2 + 10)
        }
      }
      if (game.p4Id) {
        game.p4Action1 = 'decision'
        game.p4Checkout1 = now
        popped1 = cards.pop()
        usedCards.push(popped1)
        popped2 = cards.pop()
        usedCards.push(popped2)
        state[game.p4Id]['cards1'] = [popped1, popped2]
        state[game.p4Id]['sum1'] = Blackjack.getCardsSums([popped1, popped2])
        num1 = Blackjack.getCardValue(popped1)
        num2 = Blackjack.getCardValue(popped2)
        //double:9,10,11
        state[game.p4Id]['allowed1'] = ['hit', 'stand']
        if (num1 == num2) {
          state[game.p4Id]['allowed1'].push('split')
        }
        if ([9, 10, 11].includes(num1 + num2)) {
          state[game.p4Id]['allowed1'].push('double')
        }
        //blackjack: pay u 1.5 bet unless dealer also blackjack
        if (num1 + num2 == 21) {
          game.p4Action1 = 'decision_done'
          state[game.p4Id]['allowed1'] = []
        }
        state[game.p4Id]['sum1'] = [num1 + num2]
        if (num1 == 1 || num2 == 1) {
          state[game.p4Id]['sum1'].push(num1 + num2 + 10)
        }
      }
      console.log('user_decision')
      state['used_cards'] = usedCards
      game.action = 'user_decision'
      game.state = JSON.stringify(state)
      Blackjack.updateSocket(game)
      await game.save()
    }
    if (game.action == 'user_decision') {
      state = JSON.parse(game.state ?? '{}') ?? {}
      //  set decision done if user not decided yet
      if (true || Helper.BLACKJACK.multiplayer) {
        for (let i of [1, 2, 3, 4]) {
          if (
            game[`p${i}Id`] &&
            game[`p${i}Action1`] == 'decision' &&
            (game[`p${i}Checkout1`]
              ?.plus({ seconds: Helper.BLACKJACK.maxResponseTime })
              ?.diff(now, 'seconds').seconds ?? 0) <= 0
          ) {
            game[`p${i}Action1`] = 'decision_done'
            state[game[`p${i}Id`]].allowed1 = []
          }
          if (
            game[`p${i}Id`] &&
            game[`p${i}Action2`] == 'decision' &&
            (game[`p${i}Checkout2`]
              ?.plus({ seconds: Helper.BLACKJACK.maxResponseTime })
              ?.diff(now, 'seconds').seconds ?? 0) <= 0
          ) {
            game[`p${i}Action2`] = 'decision_done'
            state[game[`p${i}Id`]].allowed2 = []
          }
        }
        game.state = JSON.stringify(state)
      }

      if (
        [
          game.p1Action1,
          game.p2Action1,
          game.p3Action1,
          game.p4Action1,
          game.p1Action2,
          game.p2Action2,
          game.p3Action2,
          game.p4Action2,
        ].filter((item) => ['decision_done', null].includes(item)).length == 8
      ) {
        game.action = 'dealer_decision'
        Blackjack.updateSocket(game)
        console.log('start dealer decision')
      }

      await game.save()
    }
    if (game.action == 'dealer_decision') {
      //reverse back card then add card until after sum 17
      state = JSON.parse(game.state ?? '{}') ?? {}

      const dealerInfo = state.dealer
      dealerInfo.cards = dealerInfo.cards ?? []
      state.used_cards = state.used_cards ?? []
      if (dealerInfo.cards.length >= 2) {
        remindedCards = shuffle(
          Helper.BLACKJACK.cards.filter((i: any) => !state.used_cards.includes(i)) ?? []
        )
        let popped
        let tries = 0
        while ((dealerInfo.sum[1] ?? dealerInfo.sum[0] ?? 0) < 17) {
          popped = remindedCards.pop()
          if (popped == null) popped = shuffle(Helper.BLACKJACK.cards).pop()
          if (dealerInfo.cards[1] == 'back' || dealerInfo.cards[1] == null) {
            dealerInfo.cards[1] = popped
          } else {
            dealerInfo.cards.push(popped)
          }
          dealerInfo.sum = Blackjack.getCardsSums(dealerInfo.cards)

          if (game.botWin() && dealerInfo.cards.length > 2) {
            const userSum1 = Math.max(
              state[game[`p1Id`]]?.sum1?.[0] ?? 0,
              state[game[`p1Id`]]?.sum1?.[1] ?? 0
            )

            while (
              tries < 5 &&
              ((dealerInfo.sum?.[0] > 21 && userSum1 <= 21) ||
                (dealerInfo.sum?.[0] < 21 && userSum1 <= 21 && userSum1 > dealerInfo.sum?.[0]))
            ) {
              tries++
              remindedCards.unshift(popped)
              console.log('return', popped)
              popped = remindedCards.pop()
              console.log('new', popped)
              dealerInfo.cards.pop()
              dealerInfo.cards.push(popped)
              dealerInfo.sum = Blackjack.getCardsSums(dealerInfo.cards)
              console.log('dealer sum', dealerInfo.sum?.[0])
            }
            tries = 0
          }
          state['dealer'] = dealerInfo
          state['used_cards'] = usedCards
          game.state = JSON.stringify(state)
          await game.save()
          await sleep(1000)
          Blackjack.updateSocket(game)
        }

        game.state = JSON.stringify(state)
        game.action = 'done'
        await game.save()
        const res = (await Blackjack.setPrizes(game)) as Blackjack
        res.updatedAt = null
        Blackjack.updateSocket(res)
      }
    }
  }

  static getCardsSums(cards: any = []) {
    let res = []
    let sum1 = 0
    let sum2 = 0
    let v
    for (const card of cards) {
      if (card == 'back' || card == null) continue
      if (['j', 'q', 'k'].includes(card?.substring(1))) {
        v = 10
      } else {
        v = Number.parseInt(card?.substring(1))
      }
      sum1 += v

      if (v == 1) sum2 = 10
    }
    if (sum2 == 10) sum2 += sum1
    res = [sum1]
    if (sum2 > 0 && sum2 < 21) res.push(sum2)
    if (sum2 == 21) res = [21]
    return res
  }
  static getCardValue(card: any) {
    if (!card) return 0
    if (['j', 'q', 'k'].includes(card.substring(1))) return 10
    return Number.parseInt(card.substring(1))
  }

  static updateSocket(game: Blackjack) {
    SocketIo.wsIo?.in(`blackjack-${game.id}`).volatile.emit('blackjack-update', { game: game })
  }

  static async reset(game: any) {
    game.state = null
    game.action = null
    for (let i of [1, 2, 3, 4]) {
      game[`p${i}Id`] = null
      game[`p${i}Role`] = null
      game[`p${i}Action1`] = null
      game[`p${i}Checkout1`] = null
      game[`p${i}Action2`] = null
      game[`p${i}Checkout2`] = null
    }

    await game.save()
    return game
  }
  static async resetTimestamps(game: any) {
    const now = DateTime.now()
    for (let i of [1, 2, 3, 4]) {
      if (game[`p${i}Id`] == null) continue
      game[`p${i}Checkout1`] = game[`p${i}Action1`] != null ? now : null
      game[`p${i}Checkout2`] = game[`p${i}Action2`] != null ? now : null
    }
    game.updatedAt = null
    await game.save()
    return game
  }

  private static async setPrizes(game: any): Blackjack {
    const state = JSON.parse(game.state ?? '{}') ?? {}
    let gameText = ''
    let allPrize = 0
    let allCommission = 0
    for (let i of [1, 2, 3, 4]) {
      if (game[`p${i}Id`] == null) continue

      const dealerSum = Math.max(state.dealer.sum[0] ?? 0, state.dealer.sum[1] ?? 0)
      const dealerCardCount = (state.dealer?.cards ?? []).length
      const userBet1 = Number.parseInt(state[game[`p${i}Id`]]?.bet1 ?? '0') ?? 0
      const userBet2 = Number.parseInt(state[game[`p${i}Id`]]?.bet2 ?? '0') ?? 0
      const userCardCount1 = (state[game[`p${i}Id`]]?.cards1 ?? []).length
      const userCardCount2 = (state[game[`p${i}Id`]]?.cards2 ?? []).length

      const userSum1 = Math.max(
        state[game[`p${i}Id`]]?.sum1?.[0] ?? 0,
        state[game[`p${i}Id`]]?.sum1?.[1] ?? 0
      )
      const userSum2 = Math.max(
        state[game[`p${i}Id`]]?.sum2?.[0] ?? 0,
        state[game[`p${i}Id`]]?.sum2?.[1] ?? 0
      )
      console.log('dealer', dealerSum)
      console.log('userBet1', userBet1, 'userSum1', userSum1)
      console.log('userBet2', userBet2, 'userSum2', userSum2)

      let userPrize = 0
      let commission = 0
      let cashBack = 0
      //calculate prizes
      if (userBet1 > 0) {
        //user loose
        if (userSum1 > 21) {
          userPrize -= 0
        } else if (dealerSum > 21) {
          userPrize += userBet1
          cashBack += userBet1
          if (userSum1 == 21 && userCardCount1 == 2) userPrize += Math.round(userBet1 * 0.5)
        }
        //complete blackjack = 1.5 prize
        else if (userSum1 == 21 && userCardCount1 == 2 /*&& dealerSum != 21*/) {
          userPrize += Math.round(userBet1 * 1.5)
          cashBack += userBet1
        }
        // user win 1 prize
        else if (userSum1 > dealerSum) {
          userPrize += userBet1
          cashBack += userBet1
        } // dealer win
        else if (userSum1 < dealerSum) {
          userPrize += 0
          cashBack += 0
        }
        //push
        else if (userSum1 == dealerSum) {
          //dealer win complete blackjack
          if (dealerSum == 21 && dealerCardCount == 2 && userCardCount1 > 2) {
          } else {
            cashBack += userBet1
          }
        }
      }
      //if user split
      if (userBet2 > 0) {
        //user loose
        if (userSum2 > 21) {
          userPrize -= 0
        } else if (dealerSum > 21) {
          userPrize += userBet2
          cashBack += userBet2
          if (userSum2 == 21 && userCardCount2 == 2) userPrize += Math.round(userBet2 * 0.5)
        }
        //complete blackjack = 1.5 prize
        else if (userSum2 == 21 && userCardCount2 == 2 /*&& dealerSum != 21*/) {
          userPrize += Math.round(userBet2 * 1.5)
          cashBack += userBet2
        }
        // user win 1 prize
        else if (userSum2 > dealerSum) {
          userPrize += userBet2
          cashBack += userBet2
        } // dealer win
        else if (userSum2 < dealerSum) {
          userPrize += 0
          cashBack += 0
        }
        //push
        else if (userSum2 == dealerSum) {
          if (dealerSum == 21 && dealerCardCount == 2 && userCardCount2 > 2) {
          } else {
            cashBack += userBet2
          }
        }
      }
      commission = userBet1 + userBet2 - cashBack - userPrize
      console.log('comm,prize,back', commission, userPrize, cashBack)

      allCommission += commission
      allPrize += userPrize
      gameText +=
        __('winner_prize_*_*', {
          item1: state[game[`p${i}Id`]].username,
          item2: asPrice(userPrize),
        }) + '\n'

      if (userPrize > 0 || cashBack > 0) {
        const userFinancials = await UserFinancial.firstOrNew(
          { userId: game[`p${i}Id`] },
          { balance: 0 }
        )
        userFinancials.balance += Number.parseInt(`${userPrize}`) + Number.parseInt(`${cashBack}`)
        console.log('new balance', userFinancials.balance)
        await userFinancials.save()
        state[game[`p${i}Id`]].balance = userFinancials.balance
        game[`p${i}Prize`] = userPrize

        if (userPrize > 0) {
          const user = await User.find(game[`p${i}Id`])
          if (user) {
            user.prize += userPrize
            user.todayPrize += userPrize
            await user?.save()

            await Transaction.add(
              'blackjack_win',
              'blackjack',
              game.id,
              'user',
              user?.id,
              userPrize,
              user?.agencyId,
              null,
              __(`*_from_*_to_*`, {
                item1: __(`win`),
                item2: `${__(`blackjack`)}(${game.id})`,
                item3: `${__(`user`)} (${user.username})`,
              })
            )
          }
        }
      }
      if (commission != 0) {
        const af = await AgencyFinancial.find(1)
        af.balance += commission
        await af?.save()
        await Transaction.add(
          'commission',
          'blackjack',
          game.id,
          'agency',
          af?.agencyId,
          commission,
          af?.agencyId,
          null,
          __(`*_from_*_to_*`, {
            item1: __(`commission`),
            item2: `${__(`blackjack`)}(${game.id})`,
            item3: `${__(`agency`)} (${af?.agencyId})`,
          })
        )
        await Log.add(
          game.type,
          1 + (userBet2 > 0 ? 2 : 1),
          1,
          commission,
          DateTime.now().startOf('day').toJSDate()
        )
      }
    }
    game.prize = allPrize
    game.commission = allCommission
    game.state = JSON.stringify(state)
    await game.save()
    Blackjack.Log(game)
    return game
  }

  botWin() {
    return Math.floor(Math.random() * 101) <= (this.rwp ?? 0)
  }

  private static Log(game: any) {
    if (!game?.id) return
    const state = JSON.parse(game.state ?? '{}') ?? {}
    let msg = '🃏'
    const emoji = { d: '♥️', k: '♦️', g: '♣️', p: '♠️' }
    msg += `بلک جک ${game.id}` + '\n'
    msg += `➖➖➖Dealer➖➖➖` + '\n'
    msg +=
      `🂠 ${state['dealer']?.cards
        ?.map((card) => (emoji[card?.[0]] ?? '') + (card?.substring(1) ?? ''))
        .join(',')}` + '\n'
    msg += `➕ ${state['dealer']?.sum?.join(',')}` + '\n'
    let useId
    for (let id of [1, 2, 3, 4]) {
      useId = game[`p${id}Id`]
      if (!useId) continue
      msg += `➖➖➖(${useId})${state[useId]?.username}➖➖➖` + '\n'
      msg +=
        `🂠 ${state[useId]?.cards1
          ?.map((card) => (emoji[card?.[0]] ?? '') + (card?.substring(1) ?? ''))
          .join(',')}` + '\n'
      msg += `➕ ${state[useId]?.sum1?.join(',')}` + '\n'
      if ((state[useId]?.cards2 ?? []).length > 0) {
        msg +=
          `🂠 ${state[useId]?.cards2
            ?.map((card) => (emoji[card?.[0]] ?? '') + (card?.substring(1) ?? ''))
            .join(',')}` + '\n'
        msg += `➕ ${state[useId]?.sum2?.join(',')}` + '\n'
      }
    }
    msg += `➖➖➖💲💲💲➖➖➖` + '\n'
    for (let id of [1, 2, 3, 4]) {
      useId = game[`p${id}Id`]
      if (!useId) continue
      msg += `💲(${game[`p${id}Id`]})🟰${asPrice(game[`p${id}Prize`] ?? 0)}` + '\n'
    }
    msg += `➖➖➖💲💲💲➖➖➖` + '\n' + '\n'
    msg += `💲(🔴جایزه)🟰${asPrice(game.prize ?? 0)}` + '\n'
    msg += `💲(🟢کارمزد)🟰${asPrice(game.commission ?? 0)}` + '\n'
    msg += '🅿🅰🆁🅸🆂'
    // Telegram.sendMessage(Helper.TELEGRAM_LOGS[0], msg, null)
    // Telegram.sendMessage(Helper.TELEGRAM_LOGS[1], msg, null)
    Telegram.logAdmins(msg, null, Helper.TELEGRAM_TOPICS.BLACKJACK_GAME)
  }
}
