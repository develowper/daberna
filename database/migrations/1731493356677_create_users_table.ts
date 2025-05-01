import { BaseSchema } from '@adonisjs/lucid/schema'
import Helper from '#services/helper_service'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').notNullable()
      table.string('telegram_id', 30).nullable()
      table.string('phone', 30).nullable()
      table.string('full_name', 100).nullable()
      table.string('username', 30).notNullable().unique().index()
      table.enum('role', Helper.USER_ROLES).defaultTo(Helper.USER_ROLES[0])
      table.boolean('is_active').defaultTo(true)
      table.string('password').notNullable()
      table.json('settings').defaultTo(null)
      // table.timestamp('created_at').notNullable()
      // table.timestamp('updated_at').nullable()
      table.integer('play_count').unsigned().defaultTo(0)
      table.integer('win_count').unsigned().defaultTo(0)
      table.integer('row_win_count').unsigned().defaultTo(0)
      table.bigInteger('prize').unsigned().defaultTo(0)
      table.bigInteger('score').unsigned().defaultTo(0)
      table.bigInteger('rank').unsigned().defaultTo(0)
      table.integer('today_prize').unsigned().defaultTo(0)
      for (let i = 0; i < Helper.ROOMS.length; i++) {
        table.bigInteger(`card_${Helper.ROOMS[i].cardPrice}_count`).unsigned().defaultTo(0)
        table.integer(`today_card_${Helper.ROOMS[i].cardPrice}_count`).unsigned().defaultTo(0)
      }
      table
        .integer('agency_id')
        .notNullable()
        .defaultTo(1)
        .unsigned()
        .references('id')
        .inTable('agencies')
        .onDelete('CASCADE')
      table.tinyint('agency_level').unsigned().defaultTo(0)
      table.string('ref_id', 15).index()
      table.datetime('last_win').nullable()
      table.datetime('last_transaction').nullable()
      table.bigInteger('inviter_id').unsigned().index().nullable()
      table.text('storage').nullable()
      table.integer('ref_count').defaultTo(0)
      table.timestamps()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
