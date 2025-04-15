import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import Helper, { __, asPrice, range, shuffle } from '#services/helper_service'
import Room from '#models/room'
import AgencyFinancial from '#models/agency_financial'
import Transaction from '#models/transaction'
import User from '#models/user'
import collect from 'collect.js'
import app from '@adonisjs/core/services/app'
import Setting from '#models/setting'
import Log from '#models/log'
import Telegram from '#services/telegram_service'

export default class Daberna extends BaseModel {
  static table = 'daberna'
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare type: string
  @column({
    serialize: (value: string) => JSON.parse(value) ?? [],
    // consume: (value: any) => JSON.stringify(value)
  })
  declare boards: any

  @column({
    serialize: (value: string) => JSON.parse(value) ?? [],
    // consume: (value: any) => JSON.stringify(value)
  })
  declare numbers: any

  @column({
    serialize: (value: string) => JSON.parse(value) ?? [],
    // consume: (value: any) => JSON.stringify(value)
  })
  declare winners: any
  @column({
    // serializeAs: 'row_winners',
    serialize: (value: string) => JSON.parse(value) ?? [],
  })
  declare rowWinners: any

  @column()
  declare cardCount: number
  @column()
  declare playerCount: number
  @column()
  declare realTotalMoney: number
  @column()
  declare realPrize: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  public static makeCard() {
    const info = Helper.DABERNA
    const numbers: number[] = shuffle(range(info.min, info.max))

    const card: number[][] = new Array(info.row).fill(0).map(() => new Array(info.col).fill(0))

    for (let i = 0; i < card.length; i++) {
      const shuffledFillIndex = shuffle(range(0, info.col - 1))

      let picked: number
      for (let j = 0; j < info.fillInRow; j++) {
        // console.log(`******info.fillInRow ${j}************`)
        const index = shuffledFillIndex.pop()
        // console.log(`**********shuffledFillIndex ${k}**${index}********`)
        // console.log(index)
        for (let z = 0; z < numbers.length; z++) {
          if (
            (numbers[z] >= 10 * index && numbers[z] < 10 * (index + 1)) ||
            (index == info.col - 1 && numbers[z] == info.col * 10)
          ) {
            // console.log(`${numbers[z]} >= ${(10 * (index + 1))} & ${numbers[z]} < ${(10 * (index + 2))}`)
            picked = numbers.splice(z, 1)[0]
            card[i][index as number] = picked as number

            // console.log(picked)
            break
          }
        }
      }
    }
    return card
  }

  public static async makeGame(room: Room) {
    if (!app.isReady) return

    room.isActive = false
    await room.save()

    const players = JSON.parse(room.players ?? '[]')
    if (players?.length < 2) {
      room.isActive = true
      await room.save()
      return null
    }

    const info = Helper.DABERNA
    let numbers: number[] = shuffle(range(info.min, info.max))
    const numbersLen = numbers.length
    let boards: any[] = []
    // for (let i = 0; i < 10000; i++) {
    //   players.push({
    //     user_id: 1,
    //     username: `test${i}`,
    //     user_role: 'us',
    //     card: Daberna.makeCard(),
    //   })
    // }
    let tryCount = 0
    let idx = 1
    let idxs = shuffle(range(1, room.cardCount))
    //make cards
    let logText = ''

    let jokerId = await Helper.getSettings('joker_id')
    let blackList = (await Helper.getSettings('blacklist')) ?? ''

    blackList = `${blackList}`
      .split('\n')
      .map((i: any) => i.trim())
      .filter((s: any) => s !== '')

    let jokerInGame: boolean =
      jokerId && players.filter((item: any) => item.user_id == jokerId).length > 0

    players.forEach((player) => {
      Array(player.card_count)
        .fill(0)
        .forEach((i) => {
          boards.push({
            card_number: idxs.pop(),
            level: i,
            user_id: player.user_id,
            username: player.username,
            user_role: player.user_role,
            card: Daberna.makeCard(),
          })
        })
    })

    // return boards.map((item) =>
    //   item.card
    //     .flat()
    //     .filter((num) => num !== 0)
    //     .reduce((acc, num) => acc + 1, 0)
    // )
    const rw =
      !jokerInGame &&
      boards.some((item) => item.user_role === 'bo') &&
      Math.floor(Math.random() * 101) <= room.rwp

    let winners: any[] = []
    let rowWinners: any[] = []
    const playedNumbers: number[] = []
    let playedBoards: number[] = JSON.parse(JSON.stringify(boards))
    let level = 0
    let undoNumber = null
    let iterator = numbersLen

    while (iterator > 0) {
      //reset game
      for (const item of boards) {
        item.card = Daberna.makeCard()
      }
      playedBoards = JSON.parse(JSON.stringify(boards))
      winners.length = 0
      rowWinners.length = 0
      playedNumbers.length = 0
      level = 0
      undoNumber = null
      numbers = shuffle(range(info.min, info.max))

      while (winners.length === 0) {
        level++
        iterator--
        tryCount++
        const playNumber = numbers.pop() as number
        playedNumbers.push(playNumber)

        let {
          tmpWinners: tmpWinners,
          tmpRowWinners: tmpRowWinners,
          boards: tmpBoards,
        } = Daberna.play(playedBoards, playNumber, undoNumber)
        // return { playNumber, playedBoards, tmpBoards }
        //if rw and winners are us =>  undo played number

        const rowWinnerPolicy: boolean =
          tryCount < 1000 &&
          rowWinners.length === 0 &&
          tmpRowWinners.length > 0 &&
          tmpRowWinners.some((item) => item.user_role === 'us')
        const winnerPolicy: boolean =
          tryCount < 1000 &&
          tmpWinners.length > 0 &&
          tmpWinners.some((item) => item.user_role === 'us')

        const jokerPolicy =
          tmpWinners.length > 0 &&
          jokerInGame &&
          (tmpWinners.some((item) => item.user_id != jokerId) ||
            (tmpWinners.length > 1 && tmpWinners.every((item) => item.user_id == jokerId)))

        const sameRowAndFullWinnerPolicy =
          Math.random() < 0.5 &&
          tmpWinners.length > 0 &&
          rowWinners.some((item) => item.user_id === tmpWinners[0].user_id)

        const blackListPolicy =
          !jokerInGame &&
          tmpWinners.length > 0 &&
          blackList.length > 0 &&
          tmpWinners.some((item) => blackList.includes(`${item.user_id}`))

        // if (tmpWinners.length > 0) {
        //   console.log('------------')
        //   console.log(blackList)
        //   console.log('len', blackList.length)
        //   console.log(
        //     'tmpWinners',
        //     tmpWinners.map((i) => i.user_id)
        //   )
        //   console.log(
        //     'includes',
        //     tmpWinners.some((item) => blackList.includes(item.user_id))
        //   )
        //   console.log('*********')
        // }
        // if (tmpWinners.length > 0) {
        //   console.log('jokerPolicy', jokerPolicy)
        //   console.log('jokerPolicy', jokerPolicy)
        // }

        if (iterator <= 0) {
          iterator = numbersLen
          break
        }
        if (
          (rw && (rowWinnerPolicy || winnerPolicy)) ||
          jokerPolicy ||
          sameRowAndFullWinnerPolicy ||
          blackListPolicy
        ) {
          //undo
          const num = playedNumbers.pop()
          undoNumber = num
          numbers.unshift(num)
          level--
          tmpWinners = []
          tmpRowWinners = []

          continue
        }
        if (rowWinners.length === 0 && tmpRowWinners.length > 0) {
          rowWinners = JSON.parse(JSON.stringify(tmpRowWinners))
          rowWinners.forEach((item) => (item.level = level))
        }
        if (tmpWinners.length > 0) {
          winners = JSON.parse(JSON.stringify(tmpWinners))
          winners.forEach((item) => (item.level = level))
          iterator = 0
        }

        for (const board of tmpBoards) {
          for (let j = 0; j < board.card.length; j++) {
            for (let k = 0; k < board.card[j].length; k++) {
              if (-1 === board.card[j][k]) {
                board.card[j][k] = 0
              }
            }
          }
        }
        playedBoards = tmpBoards
      }
    }
    // console.log('end board', playedBoards)
    //game ended
    // console.log('-----------')
    // console.log(
    //   'rowWinners',
    //   rowWinners.map((item) => item.username)
    // )
    // console.log(
    //   'winners',
    //   winners.map((item) => item.username)
    // )
    // console.log('try', tryCount)
    // console.log('-----------')
    //***
    const users = collect(
      await User.query()
        .preload('financial')
        .whereIn(
          'id',
          [...rowWinners, ...winners].map((item: any) => item.user_id)
        )
    )

    const winnerRefs = users
      .whereIn(
        'id',
        winners.map((item) => item.user_id)
      )
      .whereNotNull('inviterId')
      .pluck('inviterId')
      .toArray()

    const totalMoney = room.cardCount * room.cardPrice

    const rowWinnerPrize = Math.floor((totalMoney * room.rowWinPercent) / (100 * rowWinners.length))
    const winnerPrize = Math.floor((totalMoney * room.winPercent) / (100 * winners.length))

    const inviterUsers = collect(await User.query().preload('financial').whereIn('id', winnerRefs))
    //used commission for refs
    let refCommissionPercent = 0
    let refCommissionPrice = 0
    if (winnerRefs.length > 0) {
      refCommissionPercent = await Helper.getSettings('ref_commission_percent')

      refCommissionPrice = Math.floor(
        (totalMoney * refCommissionPercent) / (100 * winnerRefs.length)
      )
    }
    //commission price is complicated
    //realTotal - realPrize
    const realCardCount =
      Number.parseInt(collect(players).where('user_role', 'us').sum('card_count').toString()) ?? 0
    const realTotalMoney = realCardCount * room.cardPrice

    // if (room.type == 'd5000')
    //   console.log('realCardCount', collect(players).where('user_role', 'us').sum('card_count'))
    // if (room.type == 'd5000') console.log('realCardCount', realCardCount)
    // if (room.type == 'd5000') console.log('realTotalMoney', realTotalMoney)

    const realPrize =
      collect(winners).where('user_role', 'us').count() * winnerPrize +
      collect(rowWinners).where('user_role', 'us').count() * rowWinnerPrize

    // if (room.type == 'd5000') console.log('realPrize', realPrize)

    const commissionPrice = Math.floor(realTotalMoney - realPrize - refCommissionPrice) /* +
      (jokerInGame
        ? Number.parseInt(collect(winners).where('user_id', jokerId).sum('prize').toString())
        : 0)*/
    // if (room.type == 'd5000') console.log('commissionPrice', commissionPrice)

    const game = new Daberna().fill({
      type: room.type,
      boards: JSON.stringify(boards),
      numbers: JSON.stringify(playedNumbers),
      realTotalMoney: realTotalMoney,
      realPrize: realPrize,
      winners: JSON.stringify(
        winners.map((i) => {
          i.prize = winnerPrize
          return i
        })
      ),
      rowWinners: JSON.stringify(
        rowWinners.map((i) => {
          i.prize = rowWinnerPrize
          return i
        })
      ),
      playerCount: room.playerCount,
      cardCount: room.cardCount,
    })
    //all not bot

    if (realTotalMoney > 0) {
      await game.save()
      room.clearCount++
      logText += `🔔بازی ${game.id} ${game.type}` + '\n'
      logText += `🔁 تعداد تلاش: ${tryCount}` + '\n'
      logText += `🎴 تعداد کارت: ${game.cardCount}` + '\n'
      logText += `🚹 تعداد بازیکن: ${game.playerCount}` + '\n'
      //[${i.user_role == 'us' ? '👤' : '🤖'}]
      logText +=
        `🧍🏼‍♂️ بازیکنان: ${players
          .map((i: any) => {
            return `${i.username}[${i.card_count}]`
          })
          .join('➖')}` + '\n'
      logText +=
        `🔶 برنده خطی: ${rowWinners
          .map((i: any) => {
            return `کارت ${i.card_number}` + '🔹' + `${i.username}` + '🔹' + asPrice(rowWinnerPrize)
          })
          .join('\n')}` + '\n'
      logText +=
        `🔷 برنده پر: ${winners
          .map((i: any) => {
            return `کارت ${i.card_number}` + '🔹' + `${i.username}` + '🔹' + asPrice(winnerPrize)
          })
          .join('\n')}` + '\n'
      // Telegram.sendMessage(Helper.TELEGRAM_LOGS[0], logText)
      // Telegram.sendMessage(Helper.TELEGRAM_LOGS[1], logText)

      Telegram.logAdmins(logText, null, null /*Helper.TELEGRAM_TOPICS.DABERNA_GAME*/)
    }
    // console.log(boards.map((item) => item.card))
    const af = await AgencyFinancial.find(1)
    af.balance += commissionPrice
    af.save()
    if (commissionPrice != 0) {
      // console.log('commissionTransaction', commissionPrice)
      await Transaction.add(
        'commission',
        'daberna',
        game.id,
        'agency',
        af.agencyId,
        commissionPrice,
        af.agencyId,
        null,
        __(`*_from_*_to_*`, {
          item1: __(`commission`),
          item2: `${__(`daberna`)}${room.cardPrice} (${game.id})`,
          item3: `${__(`agency`)} (${af.agencyId})`,
        })
      )
    }
    let title
    for (const w of rowWinners) {
      const user = users.where('id', w.user_id).first()
      if (!user) continue
      // console.log('rowwin.transaction', rowWinnerPrize)
      const financial = user?.financial ?? (await user.related('financial').create({ balance: 0 }))
      financial.balance += rowWinnerPrize
      financial.save()
      user.rowWinCount++
      user.prize += rowWinnerPrize
      user.todayPrize += rowWinnerPrize
      user.lastWin = DateTime.now()
      user.save()
      title = __(`*_from_*_to_*`, {
        item1: __(`row_win`),
        item2: `${__(`daberna`)}${room.cardPrice} (${game.id})`,
        item3: `${__(`user`)} (${user.username})`,
      })
      if (user?.role == 'us') {
        await Transaction.add(
          'row_win',
          'daberna',
          game.id,
          'user',
          user?.id,
          rowWinnerPrize,
          user?.agencyId,
          null,
          title
        )
      }
    }
    for (const w of winners) {
      const user = await users.where('id', w.user_id).first()
      if (!user) continue
      const financial = user?.financial ?? (await user.related('financial').create({ balance: 0 }))
      financial.balance += winnerPrize
      financial.save()
      // console.log('win.transaction', winnerPrize)
      user.winCount++
      user.prize += winnerPrize
      user.score += room.winScore
      user.todayPrize += winnerPrize
      user.lastWin = DateTime.now()
      user?.save()

      title = __(`*_from_*_to_*`, {
        item1: __(`win`),
        item2: `${__(`daberna`)}${room.cardPrice} (${game.id})`,
        item3: `${__(`user`)} (${user.username})`,
      })
      if (user?.role == 'us') {
        await Transaction.add(
          'win',
          'daberna',
          game.id,
          'user',
          user?.id,
          winnerPrize,
          user?.agencyId,
          null,
          title
        )
      }
    }
    for (const user of inviterUsers) {
      if (refCommissionPrice > 0) {
        const financial = user.financial
        financial.balance += refCommissionPrice
        financial.save()
        await Transaction.add(
          'ref_commission',
          'daberna',
          game.id,
          'user',
          user.id,
          refCommissionPrice,
          user?.agencyId
        )
      }
    }

    //*****add log

    await Log.add(
      room.type,
      realCardCount,
      game.id ? 1 : 0,
      commissionPrice,
      DateTime.now().startOf('day').toJSDate()
    )
    if (jokerInGame && jokerId != 1) {
      await Setting.query().where('key', 'joker_id').update({ value: 1 })
    }
    //***end **add log
    room.playerCount = 0
    room.cardCount = 0
    room.players = null
    room.startAt = null
    room.isActive = true
    await room.save()

    return game
  }

  public static play(gameBoard: any[], number: number, undoNumber: number | null = null) {
    const boards = [...gameBoard]
    for (const board of boards) {
      for (let j = 0; j < board.card.length; j++) {
        for (let k = 0; k < board.card[j].length; k++) {
          if (-1 === board.card[j][k]) {
            if (undoNumber == null) {
              //before number accepted
              board.card[j][k] = 0
            } else {
              //undo number
              board.card[j][k] = undoNumber
            }
          }

          if (number === board.card[j][k]) {
            board.card[j][k] = -1
          }
        }
      }
    }

    const tmpWinners = boards.filter((board) => this.isEmpty(board.card))
    const tmpRowWinners = boards.filter((board) => this.isEmptyRow(board.card))

    return { tmpWinners, tmpRowWinners, boards }
  }
  static isEmptyRow(card: number[][]): boolean {
    return card.some((rows) => rows.every((col) => col === 0 || col === -1))
  }
  static isEmpty(card: number[][]): boolean {
    return card.every((rows) => rows.every((col) => col === 0 || col === -1))
  }

  public static async startRooms(rooms: Room[]) {
    const mySocket = await app.container.make('MySocket')

    for (const room of rooms) {
      // console.log(`players ${room.playerCount}`, `time ${room.secondsRemaining}`)

      if (
        room.isActive &&
        room.playerCount > 1 &&
        (room.secondsRemaining == room.maxSeconds || room.cardCount >= room.maxCardsCount)
      ) {
        //create game and empty room

        const game = await Daberna.makeGame(room)
        // const tmp = await Daberna.query().orderBy('id', 'DESC').first()

        mySocket.emitToRoom(`room-${room.type}`, 'game-start', game)
      }
    }
  }
}
