import { BaseSchema } from '@adonisjs/lucid/schema'
import Helper from '#services/helper_service'

export default class extends BaseSchema {
  protected tableName = 'transactions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id')
      table.string('title')
      table.string('pay_id', 100).nullable().defaultTo(null)
      table.enum('type', Helper.TRANSACTION.types)
      table.enum('from_type', Helper.TRANSACTION.fromTypes)
      table.bigInteger('from_id').unsigned()
      table.enum('to_type', Helper.TRANSACTION.fromTypes)
      table.bigInteger('to_id').unsigned()
      table.enum('gateway', Helper.TRANSACTION.gateways)
      table.string('gateway_id', 50).nullable()
      table.bigInteger('amount')
      table.json('info').nullable()
      table.timestamp('payed_at').nullable()
      table.string('app_version', 10).nullable()
      table
        .integer('agency_id')
        .notNullable()
        .unsigned()
        .references('id')
        .inTable('agencies')
        .onDelete('CASCADE')
      table.timestamps()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
