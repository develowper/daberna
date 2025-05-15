import db from '@adonisjs/lucid/services/db'
import Setting from '#models/setting'
import collect from 'collect.js'

export default class UserController {
  async get({ response, request }) {
    const setting: any = await Setting.findBy('key', 'ads')
    return collect(JSON.parse(setting?.value ?? '[]'))
      .whereIn('is_active', [1, '1'])
      .random()

    const cmnd = request.input('cmnd')
    const ad = await db.from('advs').where('is_active', true).orderByRaw('RAND()').limit(1)
    return response.json(ad?.[0])
  }
  async click({ request }) {
    const id = request.input('id')

    const ads = collect(JSON.parse((await Setting.findBy('key', 'ads'))?.value ?? '[]'))
    const updated = ads.map((item) => ({
      ...item,
      clicks: `${item.id}` === `${id}` ? item.clicks + 1 : item.clicks,
    }))
    await Setting.query()
      .where('key', 'ads')
      .update({ value: JSON.stringify(updated.all()) })
    return
    await db.from('advs').where('id', id).increment('clicks', 1)
  }
}
