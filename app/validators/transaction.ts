import vine from '@vinejs/vine'
import Helper from '#services/helper_service'

export const chargeValidator = vine.compile(
  vine.object({
    amount: vine
      .number()
      .withoutDecimals()
      .min(0)
      .optional()
      .requiredWhen('type', 'notIn', ['winwheel']),
    type: vine.string().in(Helper.TRANSACTION.types),
    from_type: vine
      .string()
      .in(Helper.TRANSACTION.fromTypes)
      .optional()
      .requiredWhen('type', 'notIn', ['winwheel']),
    app_version: vine.string(),
    card: vine
      .string()
      .regex(/^\d{16}$/)
      .fixedLength(16)
      .optional()
      .requiredWhen('type', '=', 'cardtocard'),
  })
)
export const winWheelValidator = vine.compile(
  vine.object({
    type: vine.string().in(Helper.TRANSACTION.types),
    app_version: vine.string(),
  })
)
export const cardToCardValidator = vine.compile(
  vine.object({
    amount: vine.number().withoutDecimals().min(Helper.MIN_CHARGE),
    type: vine.string().in(Helper.TRANSACTION.types),
    from_type: vine.string().in(Helper.TRANSACTION.fromTypes),
    app_version: vine.string(),
    card: vine
      .string()
      .regex(/^\d{16}$/)
      .fixedLength(16),
  })
)

export const withdrawValidator = vine.compile(
  vine.object({
    amount: vine.number().withoutDecimals().min(Helper.MIN_WITHDRAW),
    type: vine.string().in(Helper.TRANSACTION.types),
    app_version: vine.string(),
  })
)
