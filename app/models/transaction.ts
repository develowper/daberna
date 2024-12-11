import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import Helper from '#services/helper_service'
import Env from '#start/env'
import axios from 'axios'
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
    gateway = null,
    title = null
  ): Transaction {
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
      title:
        title ??
        Helper.t('*_from_*_to_*', {
          item1: Helper.t(type),
          item2: `${Helper.t(fromType)} (${fromId})`,
          item3: `${Helper.t(toType)} (${toId})`,
        }),
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
          const zarinpalData = {
            merchant_id: Env.get('ZARINPAL_TOKEN'),
            amount: `${price}0`,
            callback_url: `${Env.get('APP_URL')}/api/payment/done`,
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
              message: error?.response?.data?.errors?.message ?? Helper.t('problem_get_pay_link'),
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
            const data = {
              merchant_id: Env.get('ZARINPAL_TOKEN'),
              amount:
                ((await Transaction.query().where('pay_id', request.input('Authority')).first())
                  ?.amount ?? 0) * 10,
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
              message: Helper.t('factor_payed_before'),
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
        message: Helper.t('problem_confirm_pay'),
      }
    }
  }
}
