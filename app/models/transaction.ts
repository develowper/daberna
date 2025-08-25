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
      if (payerName == 'mojraj') bank = 'ZARINPAL'
      // else bank = 'SEPAL'
      const gateway = await Transaction.getAPI(bank)
      bank = (bank || gateway.key || Helper.BANK)?.toLowerCase()
      const defaultFee = 900
      if (payerName != 'mojraj') return { status: 'danger', message: __('updating') }
      // console.log(gateway)
      // console.log(bank)
      // console.log(orderId)
      let fee = defaultFee

      switch (bank) {
        case 'sizpay':
          fee = 0
          try {
            const sizData = {
              url: 'https://rt.sizpay.ir/api/PaymentSimple/GetTokenSimple',
              sizPayKey: gateway?.value,
              Amount: `${price}0`,
              // callbackUrl: `https://${Env.get('APP_URL')}/api/payment/done`,
              ReturnURL: `https://soheilmarket.ir/wc-api/callback?order_id=${orderId}`,
              description: 'سفارش شماره: ' + `${orderId}` + ' | خریدار: ' + `${payerName}`,
              mobile: phone,
              payerName: payerName,
              InvoiceNo: `${orderId}`,
              OrderID: `${orderId}`,
              DocDate: ``,
              SignData: ``,
              ExtraInf: ``,
              AppExtraInf: {
                PayerNm: payerName,
                PayerMobile: phone,
                PayerEmail: '',
                Descr: '',
                PayTitleID: 0,
              },
            }
            const sizResponse = await axios.post(
              'https://soheilmarket.ir/wp-json/order/pay',
              sizData,
              {
                headers: {
                  'Content-Type': 'application/json',
                },
              }
            )
            const sizResult = sizResponse.data

            // console.log(sizResult)
            if (sizResult?.['Token'] && ['0', '00'].includes(`${sizResult['ResCod']}`)) {
              return {
                status: 'success',
                gateway: bank,
                fee: fee / 10, //fee
                order_id: sizResult.Token,
                gateway_id: gateway?.title,
                url: `https://soheilmarket.ir/?form_redirect=1&method=POST&url=https://rt.sizpay.ir/Route/Payment&token=${sizResult['Token']}`,
              }
            } else {
              return { status: 'danger', message: __('problem_get_pay_link') }
            }
          } catch (error) {
            console.log(error)
            return {
              status: 'danger',
              message: error?.response?.data?.errors?.message ?? __('problem_get_pay_link'),
            }
          }
          break
        case 'irandargah':
          fee = 0
          try {
            const iranResponse = await axios.post(
              'https://soheilmarket.ir/wp-json/order/pay',
              {
                url: 'https://dargaah.com/payment',
                merchantID: gateway?.value,
                amount: `${price}0`,
                // callbackUrl: `https://${Env.get('APP_URL')}/api/payment/done`,
                callbackURL: `https://soheilmarket.ir/wc-api/callback?wc_order=${orderId}`,
                description: 'سفارش شماره: ' + `${orderId}` + ' | خریدار: ' + `${payerName}`,
                mobile: phone,
                payerName: payerName,
                orderId: `${orderId}`,
              },
              {
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                },
              }
            )
            const iranResult = iranResponse.data
            // console.log(iranResult)
            if (iranResult?.authority && iranResult?.status == 200) {
              return {
                status: 'success',
                gateway: bank,
                fee: fee / 10, //fee
                order_id: iranResult.authority,
                gateway_id: gateway?.title,
                // url: `https://dargaah.com/ird/startpay/${iranResult.authority}`,
                url: `https://soheilmarket.ir/?form_redirect=1&url=https://dargaah.com/ird/startpay/${iranResult.authority}`,
              }
            } else {
              return { status: 'danger', message: __('problem_get_pay_link') }
            }
          } catch (error) {
            console.log(error)
            return {
              status: 'danger',
              message: error?.response?.data?.errors?.message ?? __('problem_get_pay_link'),
            }
          }
          break
        case 'sepal':
          fee = 0
          try {
            const sepalResponse = await axios.post(
              'https://soheilmarket.ir/wp-json/order/pay',
              {
                url: 'https://sepal.ir/api/request.json',
                apiKey: gateway?.value,
                amount: `${price}0`,
                // callbackUrl: `https://${Env.get('APP_URL')}/api/payment/done`,
                callbackUrl: `https://soheilmarket.ir/wc-api/callback`,
                description: `خریدار: ${payerName}`,
                payerMobile: phone,
                payerName: payerName,
                payerEmail: mail,
                invoiceNumber: `${orderId}`,
              },
              {
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                },
              }
            )
            const sepalResult = sepalResponse.data
            // console.log(sepalResult)
            if (sepalResult?.paymentNumber && sepalResult?.status == 1) {
              return {
                status: 'success',
                gateway: bank,
                fee: fee / 10, //fee
                order_id: sepalResult.paymentNumber,
                gateway_id: gateway?.title,
                url: `https://sepal.ir/payment/${sepalResult.paymentNumber}`,
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
          break
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
            // console.log(zibalResult)
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
          const feeResponse = await fetch('https://soheilmarket.ir/wp-json/order/pay', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json', // Important for sending JSON
            },
            body: JSON.stringify({
              url: 'https://payment.zarinpal.com/pg/v4/payment/feeCalculation.json',
              merchant_id: gateway?.value,
              amount: `${price}0`,
            }),
          })
          const feeResult: any = await feeResponse.json()
          fee = Number(feeResult?.data?.fee ?? 0) ?? fee * 10

          const zarinpalData = {
            merchant_id: gateway?.value /*?? Env.get('ZARINPAL_TOKEN')*/,
            amount: Number(`${price}0`) + fee, //fee
            callback_url: `https://soheilmarket.ir/wc-api/callback?wc_order=${orderId}`,
            description: ` خرید به شماره سفارش: ${orderId} خریدار | ${payerName}`,
            mobile: phone,
            email: mail,
            order_id: `${orderId}`,
            referrer_id: `32BvX0l`,
            url: 'https://api.zarinpal.com/pg/v4/payment/request.json',
            header: {
              'Content-Type': 'application/json',
              'User-Agent':
                'ZarinPalSdk/v1 WooCommerce Plugin/v.5.0.14 (WooCommerce 9.4.1; WordPress 6.8.2; PHP 8.2)',
            },
          }
          // console.log(zarinpalData)
          try {
            const response = await axios.post(
              'https://soheilmarket.ir/wp-json/order/pay',

              zarinpalData,
              {
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                },
              }
            )
            // console.log(response)
            const result = response.data

            if (result && result.data.code === 100) {
              return {
                status: 'success',
                gateway: bank,
                fee: fee / 10, //fee
                order_id: result.data.authority,
                gateway_id: gateway?.title,
                url: `https://soheilmarket.ir/?form_redirect=1&url=https://www.zarinpal.com/pg/StartPay/${result.data.authority}`,
              }
            } else if (result.errors) {
              return { status: 'danger', message: result.errors }
            } else {
              return { status: 'danger', message: result }
            }
          } catch (error) {
            // console.log(error)
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
            api_key: gateway?.value,
            order_id: orderId,
            amount: `${price}0`,
            callback_uri: `https://${Env.get('APP_URL')}/api/payment/done`,
            currency: 'IRR',
            customer_phone: phone,
            payer_name: payerName,
            auto_verify: false,
            custom_json_fields: JSON.stringify({ user_id: userId, type: description }),
          }
          fee = 0
          try {
            const response = await axios.post(`https://nextpay.org/nx/gateway/token`, nextpayParams)
            const responseData = response.data

            if (responseData && responseData.code === -1) {
              return {
                status: 'success',
                gateway: bank,
                fee: fee, //fee
                order_id: orderId,
                url: `https://nextpay.org/nx/gateway/payment/${responseData.trans_id}`,
                gateway_id: gateway?.title,
              }
            } else {
              return {
                status: 'danger',
                message: responseData?.code
                  ? this.nextpayStatus.get(responseData.code)
                  : __('payment_fail'),
              }
            }
          } catch (error) {
            return { status: 'danger', message: error }
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
            Telegram.log(null, 'error', JSON.stringify(error?.response))
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
    // bank = bank || Helper.BANK
    console.log(request.all())
    //payping:clientRefId,amount,gatewayAmount

    let payId
    if (request.input('authority') && request.input('orderId')) {
      payId = request.input('authority')
      bank = 'irandargah'
    } else if (request.input('Authority')) {
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
    } else if (request.input('paymentNumber')) {
      payId = request.input('paymentNumber')
      bank = 'sepal'
    } else if (request.input('InvoiceNo') && request.input('Token')) {
      payId = request.input('Token')
      bank = 'sizpay'
    }
    // console.log('payId', payId)
    //
    // console.log('bank', bank)

    if (!payId) {
      return { status: 'danger', message: __('payment_fail') }
    }

    const t = await Transaction.query().where('pay_id', payId).whereNull('payed_at').first()

    if (!t) return { status: 'danger', message: __('payment_fail') }
    if (t.payedAt) return { status: 'danger', message: __('factor_payed_before') }

    const payToken = await Transaction.getAPI(bank.toUpperCase(), t?.gatewayId)
    const fee = Number(t?.info?.bank_fee ?? 0)
    try {
      switch (bank) {
        case 'sizpay':
          let sizResult: any = {}
          // console.log(`${request.input('ResCod')}`)
          // console.log(['0', '00'].includes(`${request.input('ResCod')}`))
          if (['0', '00'].includes(`${request.input('ResCod')}`)) {
            const amount = Number(t?.amount ?? 0) * 10 + fee * 10 //fee + amount
            // console.log(amount)
            const data = {
              sizPayKey: payToken /*?? Env.get('ZARINPAL_TOKEN')*/,
              Token: `${payId}`,
              url: 'https://rt.sizpay.ir/api/PaymentSimple/ConfirmSimple',
            }
            try {
              const response = await axios.post('https://soheilmarket.ir/wp-json/order/pay', data, {
                headers: {
                  'Content-Type': 'application/json',
                },
              })
              sizResult = response.data

              // console.log(sizResult)
              if (['0', '00'].includes(`${sizResult['ResCod']}`)) {
                return { status: 'success', order_id: `${payId}`, info: sizResult }
              }

              return {
                status: 'danger',
                message: sizResult?.message ?? __('payment_fail'),
              }
            } catch (e) {
              console.log(e)
              return { status: 'danger', message: __('payment_fail') }
            }
          }
        case 'irandargah':
          let iranResult: any = {}

          if (request?.input('code') == 100) {
            const amount = Number(t?.amount ?? 0) * 10 + fee * 10 //fee + amount
            // console.log(amount)
            const data = {
              merchantID: payToken /*?? Env.get('ZARINPAL_TOKEN')*/,
              authority: `${payId}`,
              orderId: request?.input('orderId'),
              amount: amount,
              url: 'https://dargaah.com/verification',
            }
            try {
              const response = await axios.post('https://soheilmarket.ir/wp-json/order/pay', data, {
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                },
              })
              iranResult = response.data

              // console.log(iranResult)
              if (iranResult?.status == 100) {
                return { status: 'success', order_id: `${payId}`, info: iranResult }
              }

              return {
                status: 'danger',
                message: iranResult?.message ?? __('payment_fail'),
              }
            } catch (e) {
              console.log(e)
              return { status: 'danger', message: __('payment_fail') }
            }
          }
        case 'sepal':
          let sepalResult: any = {}
          if (request && request.input('status') == 1) {
            const amount = Number(t?.amount ?? 0) * 10 + fee * 10 //fee + amount

            const data = {
              apiKey: payToken /*?? Env.get('ZARINPAL_TOKEN')*/,
              paymentNumber: `${payId}`,
              url: 'https://sepal.ir/api/verify.json',
            }
            try {
              const response = await axios.post('https://soheilmarket.ir/wp-json/order/pay', data, {
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                },
              })
              sepalResult = response.data

              // console.log(sepalResult)
              if (sepalResult?.status == 1) {
                return { status: 'success', order_id: `${payId}`, info: sepalResult }
              }

              return {
                status: 'danger',
                message: sepalResult?.message ?? __('payment_fail'),
              }
            } catch (e) {
              return { status: 'danger', message: __('payment_fail') }
            }
          }
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
              url: 'https://api.zarinpal.com/pg/v4/payment/verify.json',
              header: {
                'Content-Type': 'application/json',
                'User-Agent':
                  'ZarinPalSdk/v1 WooCommerce Plugin/v.5.0.14 (WooCommerce 9.4.1; WordPress 6.8.2; PHP 8.2)',
              },
            }

            const zarinpalResponse = await axios.post(
              'https://soheilmarket.ir/wp-json/order/pay',
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
          if (!request.trans_id) {
            return { status: 'danger', message: __('payment_fail') }
          } else {
            const params = {
              api_key: payToken,
              trans_id: request.trans_id,
              amount: request.amount,
              currency: 'IRR',
            }
            //
            // if (!t) {
            //   return { status: 'danger', message: process.env.ERROR_CONFIRM_MESSAGE }
            // }

            const response = await axios.post(`https://nextpay.org/nx/gateway/verify`, params)
            const responseData = response.data

            if (!responseData) {
              return { status: 'danger', message: this.nextpayStatus.get(responseData?.code) }
            }

            if (responseData.code === 0) {
              return {
                status: 'success',
                order_id: responseData.order_id,
                info: JSON.stringify(responseData),
              }
            }

            return { status: 'danger', message: this.nextpayStatus.get(responseData?.code) }
          }

          break
        case 'payping':
          const amount = Number(t?.amount) + fee //fee + amount

          const paypingResponse = await axios.post(
            'https://api.payping.ir/v3/pay/verify',
            {
              paymentRefId: request.input('paymentRefId'),
              paymentCode: request.input('paymentCode'),
              amount: amount,
            },
            {
              headers: {
                'authorization': `Bearer ${payToken}`,
                'Content-Type': 'application/json',
              },
            }
          )
          const responseData = paypingResponse.data
          // console.log(`verify response ${paypingResponse.status}`, responseData)
          if (paypingResponse.status == 200 && responseData.code) {
            return {
              status: 'success',
              order_id: payId,
              info: JSON.stringify(responseData.data),
            }
          }

          return { status: 'danger', message: __('payment_fail') }
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
      Telegram.log(null, 'error', JSON.stringify(error?.response))
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

  static nextpayStatus = new Map([
    [0, 'پرداخت تکمیل و با موفقیت انجام شده است'],
    [-1, 'منتظر ارسال تراکنش و ادامه پرداخت'],
    [-2, 'پرداخت رد شده توسط کاربر یا بانک'],
    [-3, 'پرداخت در حال انتظار جواب بانک'],
    [-4, 'پرداخت لغو شده است'],
    [-20, 'کد api_key ارسال نشده است'],
    [-21, 'کد trans_id ارسال نشده است'],
    [-22, 'مبلغ ارسال نشده'],
    [-23, 'لینک ارسال نشده'],
    [-24, 'مبلغ صحیح نیست'],
    [-25, 'تراکنش قبلا انجام و قابل ارسال نیست'],
    [-26, 'مقدار توکن ارسال نشده است'],
    [-27, 'شماره سفارش صحیح نیست'],
    [-28, 'مقدار فیلد سفارشی [custom_json_fields] از نوع json نیست'],
    [-29, 'کد بازگشت مبلغ صحیح نیست'],
    [-30, 'مبلغ کمتر از حداقل پرداختی است'],
    [-31, 'صندوق کاربری موجود نیست'],
    [-32, 'مسیر بازگشت صحیح نیست'],
    [-33, 'کلید مجوز دهی صحیح نیست'],
    [-34, 'کد تراکنش صحیح نیست'],
    [-35, 'ساختار کلید مجوز دهی صحیح نیست'],
    [-36, 'شماره سفارش ارسال نشد است'],
    [-37, 'شماره تراکنش یافت نشد'],
    [-38, 'توکن ارسالی موجود نیست'],
    [-39, 'کلید مجوز دهی موجود نیست'],
    [-40, 'کلید مجوزدهی مسدود شده است'],
    [-41, 'خطا در دریافت پارامتر، شماره شناسایی صحت اعتبار که از بانک ارسال شده موجود نیست'],
    [-42, 'سیستم پرداخت دچار مشکل شده است'],
    [-43, 'درگاه پرداختی برای انجام درخواست یافت نشد'],
    [-44, 'پاسخ دریافته از بانک نامعتبر است'],
    [-45, 'سیستم پرداخت غیر فعال است'],
    [-46, 'درخواست نامعتبر'],
    [-47, 'کلید مجوز دهی یافت نشد [حذف شده]'],
    [-48, 'نرخ کمیسیون تعیین نشده است'],
    [-49, 'تراکنش مورد نظر تکراریست'],
    [-50, 'حساب کاربری برای صندوق مالی یافت نشد'],
    [-51, 'شناسه کاربری یافت نشد'],
    [-52, 'حساب کاربری تایید نشده است'],
    [-60, 'ایمیل صحیح نیست'],
    [-61, 'کد ملی صحیح نیست'],
    [-62, 'کد پستی صحیح نیست'],
    [-63, 'آدرس پستی صحیح نیست و یا بیش از ۱۵۰ کارکتر است'],
    [-64, 'توضیحات صحیح نیست و یا بیش از ۱۵۰ کارکتر است'],
    [-65, 'نام و نام خانوادگی صحیح نیست و یا بیش از ۳۵ کارکتر است'],
    [-66, 'تلفن صحیح نیست'],
    [-67, 'نام کاربری صحیح نیست یا بیش از ۳۰ کارکتر است'],
    [-68, 'نام محصول صحیح نیست و یا بیش از ۳۰ کارکتر است'],
    [-69, 'آدرس ارسالی برای بازگشت موفق صحیح نیست و یا بیش از ۱۰۰ کارکتر است'],
    [-70, 'آدرس ارسالی برای بازگشت ناموفق صحیح نیست و یا بیش از ۱۰۰ کارکتر است'],
    [-71, 'موبایل صحیح نیست'],
    [-72, 'بانک پاسخگو نبوده است لطفا با نکست پی تماس بگیرید'],
    [-73, 'مسیر بازگشت دارای خطا میباشد یا بسیار طولانیست'],
    [-90, 'بازگشت مبلغ بدرستی انجام شد'],
    [-91, 'عملیات ناموفق در بازگشت مبلغ'],
    [-92, 'در عملیات بازگشت مبلغ خطا رخ داده است'],
    [-93, 'موجودی صندوق کاربری برای بازگشت مبلغ کافی نیست'],
    [-94, 'کلید بازگشت مبلغ یافت نشد'],
    [null, 'مشکلی در پرداخت پیش آمد'],
    [undefined, 'مشکلی در پرداخت پیش آمد'],
  ])
}
