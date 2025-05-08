import { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import Admin from '#models/admin'
import Telegram from '#services/telegram_service'
import Helper, { asPrice, replace, startsWith, myMap } from '#services/helper_service'
import vine, { errors } from '@vinejs/vine'
import Setting from '#models/setting'
import Referral from '#models/referral'
import hash from '@adonisjs/core/services/hash'
import { usernameValidatorObject } from '#validators/auth'
import UserFinancial from '#models/user_financial'
import drive from '@adonisjs/drive/services/main'
import Daberna from '#models/daberna'
import { Agent } from 'node:http'
import AgencyFinancial from '#models/agency_financial'
import { DateTime } from 'luxon'
import Log from '#models/log'
import db from '@adonisjs/lucid/services/db'

export default class BotController {
  public user: User | Admin | null
  public isAdmin = false
  public MODE_MARKDOWN = 'MarkdownV2'
  public storage: any
  public i18n: any
  public messagesProvider: any
  async getUpdates({ request, i18n }: HttpContext) {
    this.i18n = i18n
    this.messagesProvider = i18n.createMessagesProvider()
    const update = request.body()
    let message = update.message
    let chatId = message?.chat?.id
    let threadId = message?.message_thread_id
    let chatUsername = `@${message?.chat?.username}`
    let text = message?.text
    let messageId = message?.message_id
    let fromId = message?.from?.id
    let tc = message?.chat?.type
    let title = message?.chat?.title ?? ''
    let firstName = message?.from?.first_name ?? ''
    let lastName = message?.from?.last_name ?? ''
    let username = message?.from?.username
    let reply = message?.reply_to_message
    let replyId = message?.reply_to_message?.from?.id
    let newChatMember = message?.new_chat_memeber
    let newChatMembers = message?.new_chat_memebers
    let leftChatMember = message?.left_chat_memeber
    let newChatParticipant = message?.new_chat_participant
    let fileId = message?.document?.file_id
    let caption = message?.caption
    let Data
    let contactPhone

    if (update?.callback_query) {
      Data = update.callback_query.data
      let dataId = update.callback_query.id
      chatId = update.callback_query.message?.chat?.id
      fromId = update.callback_query.from?.id
      firstName = update.callback_query.from?.first_name
      lastName = update.callback_query.from?.last_name
      username = update.callback_query.from?.username
      tc = update.callback_query.message.chat?.type
      messageId = update.callback_query.message?.message_id
    }

    if (update.channel_post) {
      tc = update.channel_post.chat?.type
      text = update.channel_post.text
      chatId = update.channel_post.chat?.id
      chatUsername = update.channel_post.chat?.username
      let chatTitle = update.channel_post.chat?.title
      messageId = update.channel_post.message_id
      caption = update.channel_post.caption
      let photo = update.channel_post.photo
      let document = update.channel_post.document
      let video = update.channel_post.video
      let audio = update.channel_post.audio
      let voice = update.channel_post.voice
      let videoNote = update.channel_post.video_note
    }
    if (message?.contact) {
      contactPhone = message.contact?.phone_number
      contactPhone = replace('\\+98', '0', contactPhone)
      let contactFirstName = message.contact.first_name
      let contactUserId = message.contact.user_id
    }

    let res
    let keyboard
    let msg

    //TODO: remove message id null when domain created
    // messageId = null

    ///
    if (tc === 'private') {
      this.user = await Admin.findBy('telegram_id', fromId)
      if (this.user) {
        this.isAdmin = true
      } else {
        this.user = await User.findBy('telegram_id', fromId)
      }
      this.storage = this.user?.storage

      // *** text
      if (startsWith(text, '/start')) {
        msg = `■  کاربر [${username ?? '👤'}](tg://user?id=${fromId}) ربات پاریس را استارت زد`
        Telegram.logAdmins(Telegram.markdownV2(msg), this.MODE_MARKDOWN)

        const parts = text.split(' ')
        const cmnd = parts[1] || null
        if (cmnd) {
          if (startsWith(cmnd, 'connect-')) {
            const user = await User.findBy('storage', cmnd)
            if (user) {
              this.user = user
              this.user.telegramId = fromId
              await this.updateUserStorage(null)
              msg = '🟢' + i18n.t('messages.connect_successfully')
              res = await Telegram.sendMessage(
                fromId,
                msg,
                null,
                null,
                await this.getKeyboard('user_main')
              )
            }
          } else {
            await Referral.add(fromId, cmnd)
          }
        }

        msg = `■ سلام ${firstName} خوش آمدید\n\n■ برای استفاده از تمامی امکانات ربات و اپلیکیشن ابتدا ثبت نام کنید:`
        if (!this.user) {
          res = await Telegram.sendMessage(
            chatId,
            msg,
            null,
            messageId,
            await this.getKeyboard('user_main')
          )
        } else {
          msg = `■ سلام ${firstName} خوش آمدید✋\n\n■ چه کاری براتون انجام بدم؟`
          res = await Telegram.sendMessage(
            chatId,
            msg,
            null,
            messageId,
            await this.getKeyboard('user_main')
          )
        }
      } else if (
        fromId != Helper.TELEGRAM_LOGS[0] &&
        !(await Telegram.isMember(`@${Helper.TELEGRAM_CHANNEL}`, fromId))
      ) {
        // await Telegram.sendMessage(
        //   fromId,
        //   'عیدی بیت پین برای شما:\n' + 'https://bitpin.ir/signup/?refcode=6jglwabmtn',
        //   null
        // )
        // await Telegram.sendMessage(fromId, 'http://t.me/gapoGramBot?start=73tIM', null, null, null)
        msg = '📌 *جهت استفاده از ربات و دریافت پیام های اطلاع رسانی در کانال برنامه عضو شوید*'
        res = await Telegram.sendMessage(
          chatId,
          Telegram.markdownV2(msg),
          this.MODE_MARKDOWN,
          null,
          await this.getKeyboard('join_channel')
        )
        return
      } else if (text === 'لغو ❌') {
        //
        msg = 'عملیات لغو شد'
        await this.updateUserStorage(null)

        res = await Telegram.sendMessage(
          fromId,
          msg,
          this.MODE_MARKDOWN,
          messageId,
          await this.getKeyboard('user_main')
        )
      } else if (text === 'لغو ثبت نام ❌') {
        //
        msg = 'ثبت نام لغو شد'
        await this.updateUserStorage(null)
        await User.deleteAllInfo(this.user)
        res = await Telegram.sendMessage(
          fromId,
          msg,
          this.MODE_MARKDOWN,
          messageId,
          await this.getKeyboard('user_main')
        )
      } else if (text === '🤖تماس با ما🤖') {
        //
        msg = '✏️ *جهت ارتباط با پشتیبانی از لینک های زیر استفاده نمایید*'
        res = await Telegram.sendMessage(
          fromId,
          Telegram.markdownV2(msg),
          this.MODE_MARKDOWN,
          null,
          await this.getKeyboard('support_links')
        )
      } else if (text === '📱 دریافت اپلیکیشن 📱') {
        //
        const settings = await Helper.getSettings(['app_url', 'app_version'])
        const appUrl = settings['app_url']
        const appVersion = settings.app_version
        if (!appUrl) {
          msg = '*لطفا از قسمت پشتیبانی دریافت نمایید*'
          await Telegram.sendMessage(fromId, msg, this.MODE_MARKDOWN, null, null)
          return
        }
        // const disk = drive.use()
        // await disk.get('download/daberna.apk')
        res = await Telegram.send(
          fromId,
          JSON.stringify({
            document: { file_id: appUrl },
            caption: `${i18n.t('messages.app_name')} ${i18n.t('messages.version')} ${appVersion}`,
          })
        )
      } else if (text === '💶 کسب درآمد 💶') {
        //
        msg = ''
        const refCommissionText = (await Setting.findBy('key', 'ref_commission_text'))?.value
        // if (refCommissionPercent && Number.parseInt(refCommissionPercent)) {
        msg += refCommissionText + '\n'
        // res = await Telegram.sendMessage(fromId, msg, this.MODE_MARKDOWN, null, null)
        // } else return

        if (!this.user) {
          msg += '🟠جهت دریافت لینک دعوت خود و کسب درآمد، در ربات ثبت نام کنید' + '\n'
        } else {
          msg = '🃏 *بازی آنلاین دبرنا* 🃏' + '\n'
          msg += '💸 هم بازی کن هم درآمد کسب کن 💸' + '\n'
          msg += '🟪 ثبت نام و دریافت اپلیکیشن 🟪' + '\n'
          msg += `https://t.me/daberna_bot?start=${this.user.telegramId}`
        }
        res = await Telegram.sendMessage(
          fromId,
          // Telegram.markdownV2(msg),
          // this.MODE_MARKDOWN,
          msg,
          null,
          null,
          await this.getKeyboard('user_main')
        )
      } else if (text === '🔑 فراموشی رمز 🔑') {
        //
        msg =
          'لطفا دکمه 📱 ارسال شماره تماس 📱 را بزنید. در صورتی که شماره ثبت شده باشد از شما درخواست رمز جدید می شود'
        await this.updateUserStorage('send-contact')
        res = await Telegram.sendMessage(
          fromId,
          Telegram.markdownV2(msg),
          this.MODE_MARKDOWN,
          messageId,
          await this.getKeyboard('contact')
        )
      } else if (text === '📱 ارسال شماره تماس 📱') {
        //
        res = await Telegram.sendMessage(
          fromId,
          message,
          this.MODE_MARKDOWN,
          messageId,
          await this.getKeyboard('cancel')
        )
      } else if (contactPhone) {
        const user = await User.findBy('phone', contactPhone)
        if (user) {
          this.user = user
          this.user.telegramId = fromId
          await this.updateUserStorage('send-password')
          msg = 'رمز جدید را وارد کنید:'
          keyboard = await this.getKeyboard('cancel')
        } else {
          msg = `کاربری با شماره تماس ${contactPhone} یافت نشد `
          keyboard = await this.getKeyboard('user_main')
        }
        res = await Telegram.sendMessage(fromId, msg, this.MODE_MARKDOWN, messageId, keyboard)
      } else if (Data === 'send-password') {
        await this.updateUserStorage('send-password')
        msg = 'رمز جدید را وارد کنید:'
        keyboard = await this.getKeyboard('cancel')

        res = await Telegram.sendMessage(fromId, msg, this.MODE_MARKDOWN, null, keyboard)
        //
      } else if (this.storage === 'send-password') {
        res = await this.validate(this.storage, { password: text })
        if (res.status == 'success') {
          res.msg = '🟢' + i18n.t('messages.updated_successfully')

          this.updateUserStorage(null)
        }
        res = await Telegram.sendMessage(
          fromId,
          res?.msg,
          this.MODE_MARKDOWN,
          messageId,
          res?.keyboard
        )
      } else if (this.storage === 'register-password') {
        res = await this.validate(this.storage, { password: text })
        if (res.status == 'success') {
          res.msg = '🟢' + i18n.t('messages.registered_successfully')

          const ref = await Referral.findBy('invited_id', fromId)
          if (ref?.inviterId) {
            const inviter = await User.findBy('telegram_id', ref?.inviterId)
            if (inviter) {
              this.user.inviterId = inviter.id
              this.user.agencyId = inviter.agencyId
              this.user.agencyLevel = inviter.agencyLevel
              inviter.refCount++
              await inviter.save()
            }
          }
          this.user.ip = request.ip()
          await this.updateUserStorage(null)
          Telegram.log(null, 'user_created', this.user)
        }

        res = await Telegram.sendMessage(
          fromId,
          res?.msg,
          this.MODE_MARKDOWN,
          messageId,
          res?.keyboard
        )
      } else if (text === 'ثبت نام✅') {
        //
        if (this.user) return
        // await db.rawQuery('LOCK TABLES users WRITE')
        await db.transaction(async (trx) => {
          this.user = new User()
          this.user.useTransaction(trx)

          this.user.telegramId = fromId

          this.user.username = `U${DateTime.now().toMillis()}` /* ?? username ?? firstName*/
          this.user.password = await hash.make(username ?? firstName)
          this.user.agencyId = 1
          this.user.agencyLevel = 0
          this.user.refId = await User.makeRefCode()

          this.user.related('financial').create({ balance: 0 })
          res = await Telegram.sendMessage(
            fromId,
            'در صورتی که قبلا در اپلیکیشن ثبت نام کرده اید ثبت نام را لغو کرده و از داخل اپلیکیشن قسمت پروفایل، اتصال به تلگرام را بزنید. ',
            null,
            null,
            null
          )
          await this.updateUserStorage('register-username')
        })
        msg = 'نام کاربری را وارد کنید:'

        // await db.rawQuery('UNLOCK TABLES')
        res = await Telegram.sendMessage(
          fromId,
          msg,
          this.MODE_MARKDOWN,
          messageId,
          (keyboard = await this.getKeyboard('cancel_register'))
        )
      } else if (this.storage === 'register-username') {
        //
        if (!this.user) return
        res = await this.validate(this.storage, { username: text })
        if (res.status == 'success') {
          res.msg = 'رمز عبور را وارد کنید:'
          await this.updateUserStorage('register-password')
        }
        res = await Telegram.sendMessage(
          fromId,
          res.msg,
          this.MODE_MARKDOWN,
          messageId,
          await this.getKeyboard('cancel_register')
        )
      } else if (text === '👤حساب کاربری👤') {
        //
        if (!this.user) return
        const financial = await UserFinancial.findBy('user_id', this.user.id)
        msg = '*نام کاربری*: ' + (this.user.username ?? '➖') + '\n'
        msg += '*نام*: ' + (this.user.fullName ?? '➖') + '\n'
        msg += '*شماره تماس*: ' + (this.user.phone ?? '➖') + '\n'
        msg += '*موجودی*: ' + asPrice(financial?.balance) + '\n'
        msg += '*امتیاز*: ' + this.user.score + '\n'

        res = await Telegram.sendMessage(
          fromId,
          msg,
          null,
          // this.MODE_MARKDOWN,
          null,
          await this.getKeyboard('user_profile')
        )
      } else if (this.isAdmin) {
        if (text === '📱 بروز رسانی اپلیکیشن 📱') {
          msg = 'نسخه جدید اپلیکیشن را ارسال نمایید'
          await this.updateUserStorage('admin-update-app')
          res = await Telegram.sendMessage(
            fromId,
            msg,
            null,
            null,
            await this.getKeyboard('cancel')
          )
        } else if (this.storage === 'admin-update-app') {
          if (fileId) {
            await Setting.query().where('key', 'app_url').update({ value: fileId })
            msg = '🟢' + i18n.t('messages.updated_successfully')
            Telegram.logAdmins('🟢نسخه برنامه بروز رسانی شد')
          } else {
            msg = '🔴' + i18n.t('messages.not_found_*', { item: i18n.t('messages.file') })
          }
          await this.updateUserStorage(null)
          res = await Telegram.sendMessage(
            fromId,
            msg,
            null,
            null,
            await this.getKeyboard('user_main')
          )
        } else if (text === '📊 آمار 📊') {
          const now = DateTime.now()
          const stat = {
            users: await User.query().count('* as total'),
            games: await Daberna.query().count('* as total'),
            balance: asPrice(
              (await AgencyFinancial.findBy('agency_id', this.user?.agencyId))?.balance
            ),
            logsToday: await Log.query().where('date', now.startOf('day').toJSDate()),
          }

          msg = '🔵 کاربران: ' + `${stat.users[0].$extras.total}` + '\n'
          msg += '🟣 بازی ها: ' + `${stat.games[0].$extras.total}` + '\n'
          msg += '🟢 موجودی: ' + `${stat.balance ?? '-'}` + '\n'

          msg += '    〰️〰️کارت ها〰️〰️    ' + '\n'

          // msg += stat.logsToday
          //   .map((item: Log) => {
          //     let tmp = ''
          //     tmp += ' 🎴نوع: ' + item.type + '\n'
          //     tmp += ' 🔵بازی: ' + item.gameCount + '\n'
          //     tmp += ' 🟣کارت: ' + item.cardCount + '\n'
          //     tmp += ' 🟢سود: ' + asPrice(item.profit ?? 0) + '\n'
          //     tmp += '\u200F➖➖➖➖➖➖➖➖➖➖➖'
          //     return tmp
          //   })
          //   .join('\n')
          msg += (await Log.roomsTable(Helper.ROOMS.map((item) => item.type))) + '\n'
          msg += '🅿🅰🆁🅸🆂' + '\n'
          await Telegram.sendMessage(fromId, msg, null, null, await this.getKeyboard('user_main'))
        }
      }
    } else {
      // Telegram.sendMessage(Helper.TELEGRAM_LOGS[0], JSON.stringify(update, null, 2))
    }
    // console.log('**************')
    // console.log(res)
    // console.log(request.body())
    return request.body()
  }

  async getKeyboard(type) {
    let tmp
    switch (type) {
      case 'admin_main':
        tmp = {
          keyboard: [
            [{ text: '📬 ارسال همگانی به کاربران', callback_data: 'send_to_users' }],
            [{ text: '📬 ارسال همگانی به گروه ها', callback_data: 'send_to_chats' }],
            [{ text: '🚶 مشاهده کاربران', callback_data: 'see_users' }],
            [{ text: '🚶 مشاهده فالورها', callback_data: 'see_followers' }],
            [{ text: '❓ راهنمای دستورات', callback_data: 'admin_help' }],
            [{ text: '📊 آمار', callback_data: 'statistics' }],
          ],
          resize_keyboard: true,
        }
        break
      case 'user_main':
        tmp = {
          keyboard: this.isAdmin
            ? [[{ text: '📊 آمار 📊' }], [{ text: '📱 بروز رسانی اپلیکیشن 📱' }]]
            : [
                [{ text: this.user ? '👤حساب کاربری👤' : 'ثبت نام✅' }],
                !this.user ? [{ text: '🔑 فراموشی رمز 🔑' }] : [],
                [{ text: '📱 دریافت اپلیکیشن 📱' }],
                [{ text: '💶 کسب درآمد 💶' }],
                [{ text: '🤖تماس با ما🤖' }],
              ],
          resize_keyboard: true,
        }
        break
      case 'user_profile':
        tmp = {
          inline_keyboard: [
            this.user ? [{ text: '🔑 ویرایش رمز عبور 🔑', callback_data: 'send-password' }] : [],
          ],
          resize_keyboard: true,
        }
        break
      case 'support_links':
        const supports = JSON.parse((await Setting.findBy('key', 'support_links'))?.value ?? '[]')
        tmp = {
          inline_keyboard: myMap(supports, (item: any) => [
            { text: `📱 ${item.name} 📱`, url: item.url },
          ]),
          resize_keyboard: true,
        }
        break
      case 'contact':
        tmp = {
          keyboard: [
            [{ text: '📱 ارسال شماره تماس 📱', request_contact: true }],
            [{ text: 'لغو ❌' }],
          ],
          resize_keyboard: true,
        }

        break
      case 'join_channel':
        tmp = {
          inline_keyboard: [
            [{ text: '🔑 ورود به کانال 🔑', url: `https://t.me/${Helper.TELEGRAM_CHANNEL}` }],
          ],
          resize_keyboard: true,
        }
        break
      case 'cancel':
        tmp = {
          keyboard: [[{ text: 'لغو ❌' }]],
          resize_keyboard: true,
        }
        break
      case 'cancel_register':
        tmp = {
          keyboard: [[{ text: 'لغو ثبت نام ❌' }]],
          resize_keyboard: true,
        }
        break
    }
    return JSON.stringify(tmp)
  }

  private async updateUserStorage(data: any) {
    if (!this.user) return

    this.user.storage = data
    try {
      await this.user?.save()
    } catch (er) {}
  }

  private async validate(type: any, data: any): Promise<any> {
    let msg
    let status = 'success'
    let keyboardCancel = await this.getKeyboard('cancel')
    let keyboardUser = await this.getKeyboard('user_main')
    let keyboard = keyboardCancel
    let schema
    try {
      switch (type) {
        case 'send-password':
          schema = vine.object({
            password: vine.string().regex(/^(?=.*[A-Za-z])[A-Za-z\d]{5,}$/),
          })
          msg = await vine
            .compile(schema)
            .validate(data, { messagesProvider: this.messagesProvider })
          this.user.password = data.password
          keyboard = keyboardUser
          break
        case 'register-password':
          schema = vine.object({
            password: vine.string().regex(/^(?=.*[A-Za-z])[A-Za-z\d]{5,}$/),
          })
          msg = await vine
            .compile(schema)
            .validate(data, { messagesProvider: this.messagesProvider })
          this.user.password = data.password
          keyboard = keyboardUser
          break
        case 'register-username':
          schema = vine.object({ username: usernameValidatorObject })
          msg = await vine
            .compile(schema)
            .validate(data, { messagesProvider: this.messagesProvider })
          this.user.username = data.username

          break
      }
    } catch (error) {
      msg = error.messages?.map((item: any) => item?.message ?? item).join('\n') ?? `${error}`
      keyboard = keyboardCancel
      status = 'danger'
      // console.log(error.messages)
      switch (type) {
        case 'send-password':
          break
      }
    }
    return { status, keyboard, msg }
  }

  public async sendLog({ request }: HttpContext) {
    Telegram.sendMessage(`${Helper.TELEGRAM_LOGS[0]}`, request.input('message'))
  }
}
