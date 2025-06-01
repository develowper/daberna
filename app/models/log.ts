import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { asPrice } from '#services/helper_service'
import { getBorderCharacters, table } from 'table'
import collect from 'collect.js'

export default class Log extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare cardCount: number

  @column()
  declare gameCount: number

  @column()
  declare profit: number

  @column()
  declare type: string

  @column()
  declare date: Date

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  static async add(
    type: string,
    cardCount: number,
    gameCount: number,
    commissionPrice: number,
    date: any
  ) {
    // console.log('add log game ', gameCount)
    if (!gameCount) return
    const log = await Log.firstOrNew({ date: date, type: type })
    log.cardCount = (log.cardCount ?? 0) + cardCount
    log.gameCount = (log.gameCount ?? 0) + gameCount
    log.profit = (log.profit ?? 0) + commissionPrice
    await log.save()
  }

  static async roomsTable(types: any[]) {
    let msg = ''
    const now = DateTime.now()
    const logsToday = collect(
      await Log.query().where('created_at', '>', now.minus({ hours: 24 }).toJSDate())
    )

    //\u200E for LTR \u200F for RTL
    const tableData: any = [
      ['اتاق', 'تعداد بازی', 'تعداد کارت', 'سود'].map((item) => `\u200E${item}`),
    ]

    // const tableData: any = [['Room', 'Game', 'Card', 'Profit']]
    for (const t of types) {
      const row = logsToday.where('type', `${t}`).first() ?? {
        type: `${t}`,
        gameCount: 0,
        cardCount: 0,
        profit: 0,
      }
      tableData.push([`${row.type}`, row.gameCount, row.cardCount, asPrice(row.profit)])
    }
    const tableConfig = {
      border: getBorderCharacters(`ramac`),
      drawHorizontalLine: () => true,
      drawVerticalLine: () => false,
      columnDefault: {
        paddingLeft: 1,
        paddingRight: 1,
        alignment: 'center',
        width: 12,
      },

      columns: [
        {
          width: 12,
          alignment: 'center',
        },
        { alignment: 'center' },
        { alignment: 'center' },
        { alignment: 'center' },
      ],
      header: {
        alignment: 'center',
        content: 'گزارش اتاق ها',
      },
    }
    return table(tableData, tableConfig)
  }
}
