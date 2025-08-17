import { DateTime } from 'luxon'
import { BaseModel, column, computed } from '@adonisjs/lucid/orm'
import Helper, { __ } from '#services/helper_service'
import Env from '#start/env'
import axios from 'axios'
import collect from 'collect.js'
import Setting from '#models/setting'
import Telegram from '#services/telegram_service'
export default class Transaction extends BaseModel {
  @computed()
  public get createdAtShamsi() {
    if (!this.createdAt) return ''
    return this.createdAt
      .setLocale('fa-IR')
      .setZone('Asia/Tehran')
      .toLocaleString(DateTime.DATETIME_SHORT)
  }

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
    title: string | null = null,
    info: any = null
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
      info: info,
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
    try {
      const gateway = await Transaction.getAPI(bank)
      bank = (bank || gateway.key || Helper.BANK)?.toLowerCase()
      const defaultFee = 900
      let fee = defaultFee
      console.log(bank)
      console.log(gateway)
      switch (bank) {
        case 'zibal':
          fee = 0
          try {
            const response = await axios.post(
              'https://gateway.zibal.ir/v1/request',
              {
                merchant: gateway?.value,
                amount: `${price}0`,
                callbackUrl: `https://${Env.get('APP_URL')}/api/payment/done`,
                description: `خریدار: ${payerName}`,
                mobile: phone,
                email: mail,
                orderId: `${orderId}`,
              },
              {
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                },
              }
            )
            const zibalResult = response.data
            console.log(zibalResult)
            if (zibalResult && zibalResult.result === 100) {
              return {
                status: 'success',
                gateway: bank,
                fee: fee / 10, //fee
                order_id: zibalResult.trackId,
                gateway_id: gateway?.title,
                url: `https://gateway.zibal.ir/start/${zibalResult.trackId}`,
              }
            } else {
              return { status: 'danger', message: __('problem_get_pay_link') }
            }
          } catch (error) {
            return {
              status: 'danger',
              message: error?.response?.data?.errors?.message ?? __('problem_get_pay_link'),
            }
          }
        case 'zarinpal':
          //fee
          // const feeResponse = await fetch(
          //   'https://payment.zarinpal.com/pg/v4/payment/feeCalculation.json',
          //   {
          //     method: 'POST',
          //     headers: {
          //       'Content-Type': 'application/json', // Important for sending JSON
          //     },
          //     body: JSON.stringify({
          //       merchant_id: gateway?.value,
          //       amount: `${price}0`,
          //     }),
          //   }
          // )
          // const feeResult: any = await feeResponse.json()
          // fee = Number(feeResult?.data?.fee ?? 0) ?? fee * 10
          fee = 0

          const zarinpalData = {
            merchant_id: gateway?.value /*?? Env.get('ZARINPAL_TOKEN')*/,
            amount: Number(`${price}0`) + fee, //
            callback_url: `https://${Env.get('APP_URL')}/api/payment/done`,
            description: description,
            mobile: phone,
            email: mail,
            order_id: `${orderId}`,
            referrer_id: `32BvX0l`,
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
                gateway: bank,
                fee: fee / 10, //fee
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
              'https://api.payping.ir/v3/pay',
              {
                clientRefId: `${orderId}`,
                amount: Number(`${price}`) + fee,
                returnUrl: `https://${Env.get('APP_URL')}/api/payment/done`,
                payerName: payerName,
                payerIdentity: phone,
                mail: mail,
                description: description,
              },
              {
                headers: {
                  'authorization': `Bearer ${gateway?.value}`,
                  'Content-Type': 'application/json',
                },
              }
            )

            const data = response.data
            // console.log(response.data)
            //data.amount مبلغ دستور پرداخت
            //data.payerWage مبلغ کارمزد پرداخت کننده
            //data.businessWage مبلغ کارمزد پذیرنده
            //data.gatewayAmount مبلغ نهایی پرداخت
            if (data?.url) {
              return {
                status: 'success',
                gateway: bank,
                order_id: orderId,
                fee: fee, //fee
                // url: `https://api.payping.ir/v2/pay/gotoipg/${data.code}`,
                url: data.url,
                gateway_id: gateway?.title,
              }
            } else if (response.status === 400) {
              return { status: 'danger', message: String(data?.metaData?.errors) }
            } else {
              return { status: 'danger', message: response.status }
            }
          } catch (error) {
            // Telegram.log(null, 'error', JSON.stringify(error?.response))
            // console.warn(error?.response?.data)
            // console.warn(error?.response?.data?.metaData?.errors)

            return { status: 'danger', message: __('payment_fail') }
          }
        default:
          return { status: 'danger', message: 'Invalid bank specified' }
      }
    } catch (error) {
      return { status: 'danger', message: 'An error occurred while generating the payment link' }
    }
  }

  public static async confirmPay(request: any, bank?: string): Promise<any> {
    let payId
    if (request.input('Authority')) {
      payId = request.input('Authority')
      bank = 'zarinpal'
    } else if (request.input('Shaparak_Ref_Id')) {
      payId = request.input('Shaparak_Ref_Id')
      bank = 'nextpay'
    } else if (request.input('data')) {
      const all = request.all()
      try {
        const parsedData = JSON.parse(all?.data)
        request.updateBody({ ...all, ...parsedData })
      } catch (e) {
        // console.warn(e)
      }
      payId = request.input('clientRefId')
      bank = 'payping'
    } else if (request.input('trackId')) {
      payId = request.input('trackId')
      bank = 'zibal'
    }
    if (!payId) return { status: 'danger', message: __('payment_fail') }
    const t = await Transaction.query().where('pay_id', payId).first()
    const payToken = await Transaction.getAPI(bank.toUpperCase(), t?.gatewayId)

    const fee = Number(
      (() => {
        try {
          return (typeof t?.info === 'string' ? JSON.parse(t.info) : t?.info)?.bank_fee ?? 0
        } catch {
          return 0
        }
      })()
    )

    try {
      switch (bank) {
        case 'zibal':
          let zibalResult: any = {}
          if (request && request.input('status') == 2) {
            const amount = Number(t?.amount ?? 0) * 10 + fee * 10 //fee + amount

            const data = {
              merchant: payToken /*?? Env.get('ZARINPAL_TOKEN')*/,
              trackId: `${payId}`,
            }
            try {
              const response = await axios.post('https://gateway.zibal.ir/v1/verify', data, {
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                },
              })
              zibalResult = response.data

              // console.log(zibalResult)
              // console.log(zibalResult?.result)
              if (zibalResult?.result == 100) {
                return { status: 'success', order_id: `${payId}`, info: zibalResult }
              }
              if (zibalResult?.result == 201) {
                return { status: 'danger', message: __('factor_payed_before') }
              }
            } catch (e) {
              return { status: 'danger', message: __('payment_fail') }
            }
          }
        case 'zarinpal':
          let result: any = {}
          if (request && request.input('Status') === 'OK') {
            const amount = Number(t?.amount ?? 0) * 10 + fee * 10 //fee + amount

            const data = {
              merchant_id: payToken /*?? Env.get('ZARINPAL_TOKEN')*/,
              amount: amount, //fee
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
                api_key: payToken,
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
    let res
    //pay
    const val = await Setting.findBy({ key: 'gateways' })
    if (key)
      res = collect(JSON.parse(val?.value ?? '[]'))
        .where('key', key)
        .whereIn('active', ['1', 1, true])
        .random()
    else if (!key)
      res = collect(JSON.parse(val?.value ?? '[]'))
        // .where('key', key)
        .whereIn('active', ['1', 1, true])
        .random()

    return res
  }
}
