import { DateTime } from 'luxon'
import axios from 'axios'
import User from '../models/user.js'
import Admin from '../models/admin.js'
import Helper from '#services/helper_service'
import { HttpContext } from '@adonisjs/core/http'
import TelegramEvent from '#events/telegram_event'
import Queue from '#models/queue'
import collect from 'collect.js'

export default class Telegram {
  ///
  private static topic: any

  public static log(to: any, type: string, data: any) {
    TelegramEvent.dispatch(to, type, data)
  }

  public static async logEvent(to: any, type: string, data: any) {
    const ctx = HttpContext.get()
    const op = ctx?.auth?.user
    const isAdmin = op instanceof Admin
    try {
      let us: User | null = null

      if (data instanceof User) {
        us = data
      } else if (data.user_id) {
        us = await User.find(data.user_id)
      } else if (data.user) {
        us = data.user
      } else {
        us = await User.firstOrNew({})
      }
      const options: any = {
        timeZone: 'Asia/Tehran',
        calendar: 'persian',
        numberingSystem: 'arab',
        dateStyle: 'full',
        timeStyle: 'short',
      }

      const time = Intl.DateTimeFormat('fa-IR', options).format(
        DateTime.now().setZone('Asia/Tehran').toJSDate()
      )
      // const now = DateTime.now().setZone('Asia/Tehran')
      // const time = now.toFormat('EEEE, dd MMMM yyyy ⏰ HH:mm')
      let msg = `\uD89C${process.env.APP_NAME}\n${time}\n`
      msg += '\uD89C➖➖➖➖➖➖➖➖➖➖➖\n'

      const isCreate = type.includes('created')
      const isEdit = type.includes('edited')
      const isRemove = type.includes('remove')
      this.topic = null

      switch (type) {
        case 'user_created':
        case 'user_edited':
        case 'user_removed':
          this.topic = Helper.TELEGRAM_TOPICS.USER
          if (isCreate)
            msg += `🟩\n ${isAdmin ? `ادمین *${op.username}* یک کاربر ساخت ` : 'یک کاربر ساخته شد'}\n`
          if (isEdit)
            msg += `🟧\n ${isAdmin ? `ادمین *${op.username}* یک کاربر را ویرایش کرد ` : 'یک کاربر ویرایش شد'}\n`
          if (isRemove)
            msg += `🟥\n ${isAdmin ? `ادمین *${op.username}* یک کاربر را حذف کرد ` : 'یک کاربر حذف شد'}\n`

          msg += `شناسه: ${data.id}\n`
          msg += `👤 ${data.fullName ?? '-'}\n`
          msg += `👤 ${data.username ?? '-'}\n`
          msg += `📱 ${data.phone ?? '-'}\n`
          msg += `💳 ${data.financial?.card ?? '-'}\n`
          msg += `ip: ${data.ip ?? '-'}\n`

          break

        case 'transaction_created':
          this.topic = null ?? Helper.TELEGRAM_TOPICS.TRANSACTION

          if (data.amount > 0) msg += '🟢🟢🟢🛒 یک تراکنش انجام شد\n'
          else msg += '🟠🟠🟠🛒 یک پلن خریداری شد\n'
          msg += `🆔 شناسه کاربر: ${us?.id ?? '-'}\n`
          msg += `👤 نام\n${us?.fullName ?? us?.username ?? '-'}\n`
          msg += `📱 شماره تماس\n${us?.phone ?? '-'}\n`
          msg += `⭐ نوع\n${data.title ?? '-'}\n`
          msg += `📱${data.gatewayId ?? '-'}\n`
          msg += `📊 مقدار\n${data.amount ?? '-'}\n`
          break
        case 'setting_created':
        case 'setting_updated':
        case 'setting_deleted':
          if (type === 'setting_created') msg += '🟢 یک تنظیمات ساخته شد\n'
          if (type === 'setting_updated') msg += '🟠 یک تنظیمات ویرایش شد\n'
          if (type === 'setting_deleted') msg += '🔴 یک تنظیمات حذف شد\n'
          msg += `*️⃣ ${data.key}\n`
          msg += `#️⃣ ${data.value}\n`
          break

        case 'message_created':
          if (data.type === 'order') msg += '🟩🟩🟩 یک سفارش ثبت شد\n'
          else if (data.type === 'referral') msg += '🟦🟦🟦 یک درخواست بازاریابی ثبت شد\n'
          else msg += '🟪🟪🟪 یک پیام ثبت شد\n'
          msg += `🆔 شناسه پیام: ${data.id || '_'}\n`
          msg += `👤 نام\n${data.fullname}\n`
          msg += `📱 شماره تماس\n${data.phone}\n`
          msg += `📃 پیام\n${data.description}\n`
          break

        case 'error':
          this.topic = Helper.TELEGRAM_TOPICS.BUG
          msg = `📛 خطای سیستم\n${data}`
          break

        default:
          msg += `${type}\n`
          if (typeof data !== 'object' || data instanceof User) {
            msg += JSON.stringify(data, null, 2)
          } else {
            msg += JSON.stringify(data.toJSON(), null, 2)
          }
          break
      }

      msg += '\n🅿🅰🆁🅸🆂'
      if (to) {
        // Use your message sending logic
        await this.sendMessage(to, msg)
      } else {
        // Log to admins or fallback logic
        await this.logAdmins(msg, null, this.topic)
        return msg
      }
    } catch (e) {
      this.topic = Helper.TELEGRAM_TOPICS.BUG
      try {
        await this.logAdmins(
          JSON.stringify([e.message, e.lineNumber, e.fileName]),
          null,
          this.topic
        )
        return e.message
      } catch (innerError) {
        console.log('**********error***************')
        console.error(innerError)
      }
    }
  }

  public static async sendPhoto(
    chatId: string | number,
    photo: any,
    caption: any,
    mode: string | null = null,
    reply: string | null = null,
    keyboard: any | null = null,
    disable_notification: boolean = false,
    topic: string | null = null
  ) {
    return this.creator('sendPhoto', {
      chat_id: chatId,
      reply_to_message_id: reply,
      reply_markup: keyboard,
      parse_mode: mode,
      photo: photo,
      caption: caption,
    })
  }
  public static async sendMessage(
    chat_id: string | number,
    text: string,
    mode: string | null = null,
    reply: string | null = null,
    keyboard: any | null = null,
    disable_notification: boolean = false,
    topic: string | null = null
  ) {
    return this.creator('sendMessage', {
      chat_id: chat_id,
      text: text,
      parse_mode: mode,
      reply_to_message_id: reply,
      reply_markup: keyboard,
      disable_notification: disable_notification,
      message_thread_id: topic,
    })
  }
  public static async sendContact(
    chat_id: string,
    text: string,
    mode: string | null = null,
    reply: string | null = null,
    keyboard: any | null = null,
    disable_notification: boolean = false,
    topic: string | null = null
  ) {
    return this.creator('sendMessage', {
      chat_id: chat_id,
      text: text,
      parse_mode: mode,
      reply_to_message_id: reply,
      reply_markup: keyboard,
      disable_notification: disable_notification,
      message_thread_id: topic,
    })
  }

  public static async creator(method: string, datas: any = {}) {
    // if (!['.com', '.ir'].some((domain) => env.get('APP_URL')?.includes(domain))) return
    const url = 'https://bot.soheil-market.ir/api/bot/telegram/daberna'

    // const url = `https://api.telegram.org/bot${env.get('DABERNA_TELEGRAM_BOT_TOKEN')}/${method}`
    datas['cmnd'] = method

    try {
      const res = await axios.post(url, datas, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      // console.log('**********res**********')
      // console.log(res)

      if (res.status !== 200) {
        // this.sendMessage(`${Helper.TELEGRAM_LOGS[0]}`, `${res.data}\n${JSON.stringify(datas)}`)
      }
      return res.data
    } catch (error) {
      // console.log(error)
      this.logAdmins(JSON.stringify(error), null, Helper.TELEGRAM_TOPICS.BUG)
      // this.sendMessage(`${Helper.TELEGRAM_LOGS[0]}`, `${error.message}\n${JSON.stringify(datas)}`)
      return null
    }
  }
  public static async logAdmins(msg: string, mode: any = null, topic: any = null) {
    let res: any = null
    // for (let i = 0; i < Helper.TELEGRAM_LOGS.length; i++) {
    //   const log = Helper.TELEGRAM_LOGS[i]
    //   res = await this.sendMessage(`${log}`, msg, mode, null, null, false, topic)
    // }
    // const count = await Queue.query().count('* as total')
    // if (Number(count[0].$extras.total) >= Helper.MAX_QUEUE_LEN) {
    //   msg =
    //     collect(await Queue.query())
    //       .where('type', 'tg')
    //       .map((i) => i.data)
    //       .join('\n______________\n') ?? ''
    //   await Queue.query().where('type', 'tg').delete()
    // } else {
    //   await Queue.create({
    //     type: 'tg',
    //     data: msg,
    //   })
    //   msg = null
    // }
    // if (msg)
    //   res = await
    this.sendMessage(Helper.TELEGRAM_LOGS[2], msg, mode, null, null, false, topic)
    // return res
  }
  public static markdownV2(text: any) {
    const specialChars = ['.', '=', '_', '~', '||']

    // Escape all special characters except for formatting characters like `*`
    return text.replace(new RegExp(`([${specialChars.join('\\')}])`, 'g'), '\\$1')
  }
  static async send(chatId: number, storage: string, reply: number | null = null) {
    const message = JSON.parse(storage)

    const {
      poll,
      text,
      sticker,
      animation,
      photo,
      document,
      video,
      audio,
      voice,
      video_note,
      caption,
    } = message

    let processedText = text
    let processedCaption = caption
    let advSection: string[] = []

    if (text) {
      advSection = text.split('banner=') // Extract advertisement section from text
      processedText = advSection[0]
    } else if (caption) {
      advSection = caption.split('banner=')
      processedCaption = advSection[0]
    }

    let buttons = null

    if (advSection.length === 2) {
      const link = advSection[1].split('=')
      let trueLink = link[1]

      for (let idx = 2; idx < link.length; idx++) {
        trueLink += '=' + link[idx]
      }

      buttons = [[{ text: `👈 ${link[0]} 👉`, url: trueLink }]]
    }

    const keyboard = buttons
      ? JSON.stringify({ inline_keyboard: buttons, resize_keyboard: true })
      : null

    const basePayload = {
      chat_id: chatId,
      reply_to_message_id: reply,
      reply_markup: keyboard,
      parse_mode: null,
    }

    if (processedText) {
      return await Telegram.creator('sendMessage', { ...basePayload, text: processedText })
    } else if (photo) {
      return await Telegram.creator('sendPhoto', {
        ...basePayload,
        photo: photo[photo.length - 1].file_id,
        caption: processedCaption,
      })
    } else if (audio) {
      return await Telegram.creator('sendAudio', {
        ...basePayload,
        audio: audio.file_id,
        caption: processedCaption,
        duration: audio.duration,
        performer: audio.performer,
        title: audio.title,
        thumb: audio.thumb,
      })
    } else if (document) {
      return await Telegram.creator('sendDocument', {
        ...basePayload,
        document: document.file_id,
        caption: processedCaption,
        thumb: document.thumb,
      })
    } else if (video) {
      return await Telegram.creator('sendVideo', {
        ...basePayload,
        video: video.file_id,
        duration: video.duration,
        width: video.width,
        height: video.height,
        caption: processedCaption,
        thumb: video.thumb,
      })
    } else if (animation) {
      return await Telegram.creator('sendAnimation', {
        ...basePayload,
        animation: animation.file_id,
        duration: animation.duration,
        width: animation.width,
        height: animation.height,
        caption: processedCaption,
        thumb: animation.thumb,
      })
    } else if (voice) {
      return await Telegram.creator('sendVoice', {
        ...basePayload,
        voice: voice.file_id,
        duration: voice.duration,
        caption: processedCaption,
      })
    } else if (video_note) {
      return await Telegram.creator('sendVideoNote', {
        ...basePayload,
        video_note: video_note.file_id,
        duration: video_note.duration,
        length: video_note.length,
        thumb: video_note.thumb,
      })
    } else if (sticker) {
      return await Telegram.creator('sendSticker', {
        ...basePayload,
        sticker: sticker.file_id,
        set_name: 'DaisyRomashka',
      })
    } else if (poll) {
      return await Telegram.creator('sendPoll', {
        ...basePayload,
        question: '',
        options: JSON.stringify(['1', '2', '3']),
        type: 'regular',
        allows_multiple_answers: false,
        correct_option_id: 0,
      })
    }
  }
  public static async isMember(chatId, userId) {
    const res = await Telegram.creator('getChatMember', {
      chat_id: chatId,
      user_id: userId,
    })

    return ['member', 'administrator', 'creator'].includes(res?.result?.status)
  }
}
