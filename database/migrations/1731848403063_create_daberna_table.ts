import { BaseSchema } from '@adonisjs/lucid/schema'
import Helper, { pluck } from '#services/helper_service'

export default class extends BaseSchema {
  protected tableName = 'daberna'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id')
      table.enum('type', pluck(Helper.ROOMS, 'type'))
      table.json('boards')
      table.json('numbers')
      table.json('winners').nullable()
      table.json('row_winners').nullable()
      table.integer('player_count').unsigned().defaultTo(0)
      table.integer('card_count').unsigned().defaultTo(0)
      table.integer('real_prize').defaultTo(0)
      table.integer('real_total_money').defaultTo(0)
      table.timestamps()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
