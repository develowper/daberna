// import type { HttpContext } from '@adonisjs/core/http'
import Helper, { asPrice, isPG } from '#services/helper_service'
import { HttpContext } from '@adonisjs/core/http'
import Daberna from '#models/daberna'
import { DateTime } from 'luxon'
import collect from 'collect.js'

export default class DabernaController {
  async search({ request, response, auth, i18n }: HttpContext) {
    const user = auth.user
    const userId = user?.id
    const page = request.input('page') ?? 1
    const paginate = request.input('paginate') ?? Helper.PAGINATE
    const search = request.input('search')
    const type = request.input('type')
    const dir = request.input('dir') ?? 'DESC'
    let sort = request.input('order_by') ?? 'created_at'
    let hourLimit = request.input('hour_limit')
    sort = ['row_win_prize', 'win_prize', 'card_count'].includes(sort) ? 'id' : sort
    let query = Daberna.query()
    const isPg = isPG()
    // console.log('page', page)
    query
      .where(
        'created_at',
        '>',
        DateTime.now()
          .minus({ hours: hourLimit ?? Helper.DABERNA_LOG_DAY_LIMIT * 24 })
          .toJSDate()
      )
      .where('boards', 'like', `%id":${userId},%`)
    if (type) query.where('type', `d${type}`)

    if (search)
      if (isPg)
        query.where((q) =>
          q
            .orWhereRaw(`id::text ILIKE ?`, [`%${search}%`])
            .orWhereRaw(`type ILIKE ?`, [`%${search}%`])
        )
      else
        query.where((q) =>
          q.orWhere('id', 'like', `%${search}%`).orWhere('type', 'like', `%${search}%`)
        )
    const res = await query.orderBy(sort, dir).paginate(page, paginate)
    // console.log(res)
    // console.log(res.all())
    const transformed = res.all().map((item) => {
      let i: { [key: string]: any } = {
        id: null,
        type: null,
        created_at: null,
        win_prize: 0,
        row_win_prize: 0,
        card_count: 0,
      }
      i.id = item.id
      i.title = i18n.t('messages.room_*', { item: item.type.slice(1) })
      i.type = item.type
      i.created_at = item.createdAt
        ?.setZone('Asia/Tehran')
        ?.setLocale('fa-IR')
        ?.toLocaleString(DateTime.DATETIME_SHORT)
      i.card_count = JSON.parse(item.boards).filter((u) => u.user_id == userId).length
      i.win_prize = JSON.parse(item.winners)
        .filter((u) => u.user_id == userId)
        .reduce((sum, item) => sum + item.prize, 0)
      i.row_win_prize = JSON.parse(item.rowWinners)
        .filter((u) => u.user_id == userId)
        .reduce((sum, item) => sum + item.prize, 0)
      return i
    })

    //user app vitrin
    if (hourLimit) {
      let grouped = transformed.reduce((acc, item) => {
        const { type, card_count, win_prize, row_win_prize } = item

        if (!acc[type]) {
          acc[type] = {
            type,
            card_count: 0,
            win_prize: 0,
            row_win_prize: 0,
          }
        }

        acc[type].card_count += card_count
        acc[type].win_prize += win_prize
        acc[type].row_win_prize += row_win_prize

        return acc
      }, {})

      const allTypes = collect(Helper.ROOMS).where('game', 'daberna').pluck('type')

      for (let t of allTypes)
        grouped[`${t}`] = grouped[`${t}`] || {
          type: `${t}`.slice(1),
          card_count: 0,
          win_prize: 0,
          row_win_prize: 0,
        }

      const groupedArray = Object.values(grouped)

      const formattedGroupedArray = groupedArray.map((group) => ({
        ...group,
        win_prize: asPrice(group.win_prize),
        row_win_prize: asPrice(group.row_win_prize),
      }))
      const prize = groupedArray.reduce(
        (total, group) => total + group.win_prize + group.row_win_prize,
        0
      )
      return response.json({
        prize: asPrice(prize),
        rooms: formattedGroupedArray,
        title: i18n.t('messages.last_*_hours_log', { item: hourLimit }),
      })
    }
    // console.log(res.getMeta())
    // console.log(transformed)
    return response.json({ data: transformed, meta: res.getMeta() })
  }
}
