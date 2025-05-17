import { BaseSchema } from '@adonisjs/lucid/schema'
import Helper, { pluck } from '#services/helper_service'

export default class extends BaseSchema {
  protected tableName = 'logs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id')
      table.string('type', 10).index()
      // table.enum('type', pluck(Helper.ROOMS, 'type'))
      table.integer('game_count').defaultTo(0)
      table.integer('card_count').defaultTo(0)
      table.bigInteger('profit').defaultTo(0)
      table.date('date').index()
      table.timestamps()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
