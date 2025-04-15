import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import Helper, { __ } from '#services/helper_service'
import Env from '#start/env'
import axios from 'axios'
import collect from 'collect.js'
import Setting from '#models/setting'
export default class Transaction extends BaseModel {
  @column({ isPrimary: true })
  declare id: number
  @column()
  declare agencyId: number
  @column()
  declare title: string
  @column()
  declare payId: string
  @column()
  declare type: string
  @column()
  declare fromType: string
  @column()
  declare fromId: number
  @column()
  declare toType: string
  @column()
  declare toId: number
  @column()
  declare gateway: string
  @column()
  declare gatewayId: any
  @column()
  declare amount: number
  @column()
  declare info: any
  @column()
  declare appVersion: any

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
  @column.dateTime()
  declare payedAt: DateTime

  public user?: any
  // @column.dateTime({ autoCreate: true, autoUpdate: true })
  // declare updatedAt: DateTime

  public static async add(
    type,
    fromType,
    fromId,
    toType,
    toId,
    amount,
    agencyId,
    gateway: string | null = null,
    title: string | null = null
  ): Promise<Transaction> {
    // const i18n = i18nManager.locale(env.get('LOCALE', ''))
    //
    // const t =
    //   title ??
    //   i18n.t(`messages.*_from_*_to_*`, {
    //     item1: i18n.t(`messages.${type}`),
    //     item2: `${i18n.t(`messages.${fromType}`)} (${fromId})`,
    //     item3: `${i18n.t(`messages.${toType}`)} (${toId})`,
    //   })
    const t =
      title ??
      __(`*_from_*_to_*`, {
        item1: __(`${type}`),
        item2: `${__(`${fromType}`)} (${fromId})`,
        item3: `${__(`${toType}`)} (${toId})`,
      })
    // console.log(t)

    return await Transaction.create({
      agencyId: agencyId,
      type: type,
      fromType: fromType,
      fromId: fromId,
      toType: toType,
      toId: toId,
      amount: amount,
      gateway: gateway ?? 'wallet',
      payId: `${Date.now()}`,
      payedAt: DateTime.now(),
      title: t,
    })
  }

  public static async makePayUrl(
    orderId: any,
    price: number,
    payerName: string,
    description: string,
    phone: string,
    userId: string,
    mail?: string,
    bank?: string
  ) {
    bank = bank || Helper.BANK

    try {
      switch (bank) {
        case 'zarinpal':
          const gateway = await Transaction.getAPI('ZARINPAL')

          const zarinpalData = {
            merchant_id: gateway?.key /*?? Env.get('ZARINPAL_TOKEN')*/,
            amount: `${price}0`,
            callback_url: `https://${Env.get('APP_URL')}/api/payment/done`,
            description: description,
            mobile: phone,
            email: mail,
            order_id: `${orderId}`,
          }

          try {
            const response = await axios.post(
              'https://api.zarinpal.com/pg/v4/payment/request.json',
              zarinpalData,
              {
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                },
              }
            )

            const result = response.data

            if (result && result.data.code === 100) {
              return {
                status: 'success',
                order_id: result.data.authority,
                gateway_id: gateway?.title,
                url: `https://www.zarinpal.com/pg/StartPay/${result.data.authority}`,
              }
            } else if (result.errors) {
              return { status: 'danger', message: result.errors }
            } else {
              return { status: 'danger', message: result }
            }
          } catch (error) {
            // if (error.response) {
            //   // The request was made and the server responded with a status code // that falls out of the range of 2xx
            //   console.log('Status:', error.response.status);
            //   console.log('Data:', error.response.data);
            // }
            // else if (error.request) {
            //   // The request was made but no response was received
            //   console.log('Request:', error.request);
            // }
            // else {
            //   // Something happened in setting up the request that triggered an Error
            //   console.log('Error message:', error.message);
            // }
            return {
              status: 'danger',
              message: error?.response?.data?.errors?.message ?? __('problem_get_pay_link'),
            }
          }

        case 'nextpay':
          const nextpayParams = {
            api_key: Env.get('NEXPAY_TOKEN'),
            order_id: orderId,
            amount: `${price}0`,
            callback_uri: `${Env.get('APP_URL')}/api/transaction/done`,
            currency: 'IRR',
            customer_phone: phone,
            payer_name: payerName,
            auto_verify: false,
            custom_json_fields: JSON.stringify({ user_id: userId, type: description }),
          }

          try {
            const response = await axios.post(`${process.env.LINKS_NEXTPAY_TOKEN}`, nextpayParams)
            const responseData = response.data

            if (responseData && responseData.code === -1) {
              return {
                status: 'success',
                order_id: orderId,
                url: `${process.env.LINKS_NEXTPAY_PAY}${responseData.trans_id}`,
              }
            } else {
              return {
                status: 'danger',
                message: responseData
                  ? process.env.MESSAGES_NEXTPAY[responseData.code]
                  : process.env.ERROR_MESSAGE,
              }
            }
          } catch (error) {
            return { status: 'danger', message: process.env.ERROR_MESSAGE }
          }

        case 'payping':
          try {
            const response = await axios.post(
              'https://api.payping.ir/v2/pay',
              {
                clientRefId: orderId,
                Amount: `${price}0`,
                ReturnUrl: `${Env.get('APP_URL')}/api/payment/done`,
                payerName: payerName,
                payerIdentity: phone,
                mail: mail,
                description: description,
              },
              {
                headers: {
                  'authorization': `Bearer ${Env.get('PAYPING_TOKEN')}`,
                  'Content-Type': 'application/json',
                },
              }
            )

            const data = response.data

            if (response.status === 200) {
              return {
                status: 'success',
                order_id: orderId,
                url: `https://api.payping.ir/v2/pay/gotoipg/${data.code}`,
              }
            } else if (response.status === 400) {
              return { status: 'danger', message: data }
            } else {
              return { status: 'danger', message: response.status }
            }
          } catch (error) {
            return { status: 'danger', message: process.env.ERROR_MESSAGE }
          }

        default:
          return { status: 'danger', message: 'Invalid bank specified' }
      }
    } catch (error) {
      return { status: 'danger', message: 'An error occurred while generating the payment link' }
    }
  }

  public static async confirmPay(request: any, bank?: string): Promise<any> {
    bank = bank || Helper.BANK

    try {
      switch (bank) {
        case 'zarinpal':
          let result: any = {}
          if (request && request.input('Status') === 'OK') {
            const t = await Transaction.query().where('pay_id', request.input('Authority')).first()
            const data = {
              merchant_id: await Transaction.getAPI(
                'ZARINPAL',
                t?.gatewayId
              ) /*?? Env.get('ZARINPAL_TOKEN')*/,
              amount: (t?.amount ?? 0) * 10,
              authority: request.input('Authority'),
            }

            const zarinpalResponse = await axios.post(
              'https://api.zarinpal.com/pg/v4/payment/verify.json',
              data,
              {
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                },
              }
            )
            result = zarinpalResponse.data
          }
          const error =
            result.errors != null && Array.isArray(result.errors) ? result.errors[0] : result.errors
          if (!error && result.data?.code === 100) {
            return { status: 'success', order_id: request.input('Authority'), info: result }
          }
          if (!error && result.data?.code === 101) {
            return {
              status: 'danger',
              message: __('factor_payed_before'),
              order_id: request.input('Authority'),
            }
          }
          if (error) {
            return { status: 'danger', message: error?.message }
          }
          return { status: 'danger', message: result.data || result }

        case 'nextpay':
          if (request.np_status) {
            if (request.np_status === 'Unsuccessful') {
              return { status: 'danger', message: process.env.ERROR_CONFIRM_MESSAGE }
            } else {
              const params = {
                api_key: Env.get('NEXPAY_TOKEN'),
                trans_id: request.trans_id,
                amount: request.amount,
                currency: 'IRR',
              }

              const paymentExists = await Transaction.query()
                .where('order_id', request.order_id)
                .first()
              if (!paymentExists) {
                return { status: 'danger', message: process.env.ERROR_CONFIRM_MESSAGE }
              }

              const response = await axios.post(`${process.env.LINKS_NEXTPAY_VERIFY}`, params)
              const responseData = response.data

              if (!responseData) {
                return { status: 'danger', message: process.env.ERROR_CONFIRM_MESSAGE }
              }

              if (responseData.code === 0) {
                return {
                  status: 'success',
                  order_id: responseData.order_id,
                  info: JSON.stringify(responseData),
                }
              }

              return { status: 'danger', message: process.env.ERROR_CONFIRM_MESSAGE }
            }
          }
          break

        case 'idpay':
          const idpayResponse = await axios.post(
            'https://api.idpay.ir/v1.1/payment/verify',
            {
              id: request.id,
              order_id: request.order_id,
            },
            {
              headers: {
                'X-API-KEY': Env.get('IDPAY_TOKEN'),
                'Content-Type': 'application/json',
              },
            }
          )
          break
      }
    } catch (error) {
      return {
        status: 'danger',
        message: __('problem_confirm_pay'),
      }
    }
  }

  static async getAPI(key, confirm = null) {
    //confirm
    if (confirm) {
      return collect(JSON.parse((await Setting.findBy({ key: 'gateways' }))?.value ?? '[]'))
        .where('key', key)
        .where('title', confirm)
        .first()?.value
    }

    //pay
    const res = collect(JSON.parse((await Setting.findBy({ key: 'gateways' }))?.value ?? '[]'))
      .where('key', key)
      .where('active', '1')
      .random()

    return { key: res?.value, title: res?.title }
  }
}
