// import type { HttpContext } from '@adonisjs/core/http'
import Helper, { isPG } from '#services/helper_service'
import { HttpContext } from '@adonisjs/core/http'
import Daberna from '#models/daberna'

export default class DabernaController {
  async search({ request, response }: HttpContext) {
    const userId = request.input('user_id')
    const page = request.input('page') ?? 1
    const paginate = request.input('paginate') ?? Helper.PAGINATE
    const search = request.input('search')
    const dir = request.input('dir') ?? 'DESC'
    let sort = request.input('order_by') ?? 'created_at'
    sort = ['row_win_prize', 'win_prize', 'card_count'].includes(sort) ? 'id' : sort
    let query = Daberna.query()
    const isPg = isPG()
    if (userId) {
      if (isPg) query.whereRaw(`boards @> '[{"user_id": "${userId}"}]'`)
      else query.where('boards', 'like', `%id":${userId},%`)
    }
    if (search)
      if (isPg)
        query.where((q) =>
          q
            .orWhereRaw(`winners::text ILIKE ?`, [`%":"${search}%`])
            .orWhereRaw(`row_winners::text ILIKE ?`, [`%":"${search}%`])
            .orWhereRaw(`type ILIKE ?`, [`%${search}%`])
        )
      else
        query.where((q) =>
          q
            .orWhere('winners', 'like', `%ze":${search}%`)
            .orWhere('row_winners', 'like', `%ze":${search}%`)
            .orWhere('type', 'like', `ze":%${search}%`)
        )
    const res = await query.orderBy(sort, dir).paginate(page, paginate)

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
      i.type = item.type
      i.created_at = item.createdAt
      i.card_count = JSON.parse(item.boards).filter((u) => u.user_id == userId).length
      i.win_prize = JSON.parse(item.winners)
        .filter((u) => u.user_id == userId)
        .reduce((sum, item) => sum + item.prize, 0)
      i.row_win_prize = JSON.parse(item.rowWinners)
        .filter((u) => u.user_id == userId)
        .reduce((sum, item) => sum + item.prize, 0)
      return i
    })

    return response.json({ data: transformed, meta: res.getMeta() })
  }
  async index({ request, inertia }: HttpContext) {
    return inertia.render('Panel/Admin/Daberna/Index', {})
  }
}
