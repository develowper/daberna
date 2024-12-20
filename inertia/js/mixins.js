import { router, usePage } from '@inertiajs/vue3'
import { inject, ref, defineEmits } from 'vue'
import mitt from 'mitt'
import exp from 'node:constants'
import { Dropdown } from 'tw-elements'
export const emitter = mitt()
export default {
  // emits: ['showToast'],
  // setup(props, ctx) {
  //     ctx.emit('showToast')
  // },

  data() {
    return {
      user: null,
    }
  },

  mounted() {
    // console.log(inject('toast'));
    if (usePage().props.auth) this.user = usePage().props.auth.user
  },

  methods: {
    isAdmin() {
      return usePage().props.isAdmin
    },
    csrf() {
      return document.querySelector('meta[name="csrf-token"]').getAttribute('content')
    },
    updateCart(cart) {
      this.emitter.emit('updateCart', cart)
    },

    sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms))
    },
    /**
     * Translate the given key.
     */
    __: (key, replace = {}) => {
      let $lang = usePage().props.language
      // console.log($lang)
      var translation = $lang[key] ? $lang[key] : key

      Object.keys(replace).forEach(function (key) {
        translation = translation.replace(':' + key, replace[key])
      })

      return translation
    },
    dir: () => {
      let $lang = usePage().props.language
      if ($lang == 'en') return 'ltr'
      else return 'rtl'
    },

    getCategory(id) {
      if (id == null || usePage().props.categories == null) return ''
      for (const el of usePage().props.categories) if (el.id == id) return this.__(el.name)
      return ''
    },
    getProvince(id) {
      if (id == null || usePage().props.provinces == null) return ''
      for (const el of usePage().props.provinces) if (el.id == id) return this.__(el.name)
      return ''
    },
    getCounty(id) {
      if (id == null || usePage().props.counties == null) return ''
      for (const el of usePage().props.counties) if (el.id == id) return this.__(el.name)
      return ''
    },
    getProduct(id) {
      if (id == null || usePage().props.products == null) return ''
      for (const el of usePage().props.products) if (el.id == id) return this.__(el.name)
      return ''
    },
    getPack(id) {
      if (id == null || usePage().props.packs == null) return ''
      for (const el of usePage().props.packs) if (el.id == id) return this.__(el.name)
      return ''
    },

    getStatus(type, id) {
      if (
        id == null ||
        type == null ||
        (usePage().props[`statuses`] == null && usePage().props[type] == null)
      )
        return {
          name: '',
          color: 'primary',
        }
      let array = usePage().props[type]

      if (array /*&& Symbol.iterator in Object(array)*/)
        for (const idx in array)
          if (array[idx].name == id)
            return { name: this.__(array[idx].name), color: array[idx].color || 'primary' }
      array = usePage().props[`statuses`]
      for (const idx in array)
        if (array[idx].name == id)
          return { name: this.__(array[idx].name), color: array[idx].color || 'primary' }
    },

    hasWallet() {
      return this.user ? this.user.wallet_active : false
    },
    f2e(num) {
      return window.f2e(num)
    },
    getDuration(sec) {
      if (sec == null || sec == 0) return '0'
      var sec_num = parseInt(sec, 10) // don't forget the second param
      var hours = Math.floor(sec_num / 3600)
      var minutes = Math.floor((sec_num - hours * 3600) / 60)
      var seconds = sec_num - hours * 3600 - minutes * 60

      if (hours < 10) {
        hours = '0' + hours
      }
      if (minutes < 10) {
        minutes = '0' + minutes
      }
      if (seconds < 10) {
        seconds = '0' + seconds
      }
      return hours + ':' + minutes + ':' + seconds
    },

    replaceAll(str, find, replace) {
      return str.replace(new RegExp(find, 'g'), replace)
    },

    scrollTo(el) {
      window.scroll({
        top: document.querySelector(el) ? document.querySelector(el).offsetTop : 0,

        behavior: 'smooth',
      })
    },
    getUserCityId() {
      let selecteds = usePage().props.user_location
      if (selecteds == null || selecteds.length == 0) return null
      return selecteds[selecteds.length - 1].id
    },
    getCityName(id) {
      if (!id) return
      let res = usePage().props.cities.filter((e) => e.id == id)
      return res && res.length > 0 ? res[0].name : null
    },
    getUserProvinceId() {
      let selecteds = usePage().props.user_location
      if (selecteds == null || selecteds.length == 0) return null
      return selecteds[0].id
    },
    toggleArray(item, array = []) {
      let i = null
      for (let idx in array) {
        if (array[idx] == item) {
          i = idx
          break
        }
      }
      if (i != null) array.splice(i, 1)
      else array.push(item)

      return array
    },

    initTableModals() {
      const modalElementList = [].slice.call(document.querySelectorAll('td .modal'))
      window.modalElementList = modalElementList.map((modalElementList) => {
        let d = new Modal(modalElementList)
        modalElementList.parentElement.firstChild.addEventListener('click', function (event) {
          d.toggle()
        })
        return d
      })
    },
    mySum(array) {
      array = array || []
      return array.reduce((partialSum, a) => partialSum + a, 0)
    },
    toRelativeTime(previous) {
      let current = Date.now()
      var msPerMinute = 60 * 1000
      var msPerHour = msPerMinute * 60
      var msPerDay = msPerHour * 24
      var msPerMonth = msPerDay * 30
      var msPerYear = msPerDay * 365
      previous = new Date(previous)
      var elapsed = current - previous

      if (elapsed < msPerMinute) {
        return Math.round(elapsed / 1000) + ` ${this.__('second')} ${this.__('ago')}`
      } else if (elapsed < msPerHour) {
        return Math.round(elapsed / msPerMinute) + ` ${this.__('minute')} ${this.__('ago')}`
      } else if (elapsed < msPerDay) {
        return Math.round(elapsed / msPerHour) + ` ${this.__('hour')} ${this.__('ago')}`
      } else if (elapsed < msPerMonth) {
        return '' + Math.round(elapsed / msPerDay) + ` ${this.__('day')} ${this.__('ago')}`
      } else if (elapsed < msPerYear) {
        return '' + Math.round(elapsed / msPerMonth) + ` ${this.__('month')} ${this.__('ago')}`
      } else {
        return '' + Math.round(elapsed / msPerYear) + ` ${this.__('year')} ${this.__('ago')}`
      }
    },
  },
}
export function dir() {
  let $lang = usePage().props.language
  if ($lang === 'en') return 'ltr'
  else return 'rtl'
}
export function __(key, replace = {}) {
  let $lang = usePage().props.language
  var translation = $lang[key] ? $lang[key] : key

  Object.keys(replace).forEach(function (key) {
    translation = translation.replace(`{${key}}`, replace[key])
  })

  return translation
}
export function isAdmin() {
  return usePage().props.isAdmin
}
export function hasAccess(role) {
  return usePage().props.accesses == 'all' || usePage().props.accesses.indexOf(role) >= 0
}
export function toShamsi(day = null, time = false) {
  var t = new Date().getTime()
  if (!day) return ''
  else var today = day == 'now' ? new Date() : new Date(day)
  let options = {
    hour12: false,

    year: 'numeric',
    month: '2-digit',
    day: '2-digit',

    calendar: 'persian',
  }
  if (time)
    options = {
      ...options,
      hour: '2-digit',
      minute: '2-digit',
    }
  //                var dd = String(today.getDate()).padStart(2, '0');
  //                var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
  //                var yyyy = today.getFullYear();
  //                return yyyy + '/' + mm + '/' + dd;

  return f2e(today.toLocaleDateString('fa-IR', options))
}
export function showToast(type, message) {
  emitter.emit('showToast', { type, message })
}
export function showAlert(type, message) {
  emitter.emit('showAlert', { type, message })
}
export function showDialog(type, message, button, action, items = null) {
  emitter.emit('showDialog', { type, message, button, action, items })
}
export function isLoading(loading) {
  emitter.emit('loading', loading)
}
export function asPrice(price) {
  if (!price) return 0
  // return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return price.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ',')
}
export function getAgency(id) {
  if (id == null || usePage().props.agency_types == null) return ''
  for (const el of usePage().props.agency_types) if (el.id == id) return this.__(el.name)
  return ''
}
export function cropText(str, len, trailing = '...') {
  return str && str.length >= len ? `${str.substring(0, len)}${trailing}` : str
}
export function initTableDropdowns() {
  const dropdownElementList = [].slice.call(
    document.querySelectorAll('td [data-te-dropdown-toggle-ref]')
  )
  window.dropdownList = dropdownElementList.map((dropdownToggleEl) => {
    let d = new Dropdown(dropdownToggleEl)
    dropdownToggleEl.addEventListener('click', function (event) {
      d.toggle()
    })
    return d
  })
}
export function getUrlParams(url = null) {
  const queryString = url ? new URL(url).search : window.location.search
  const urlParams = new URLSearchParams(queryString)
  const params = Object.fromEntries(urlParams.entries())
  return params
}
export function log(str) {
  console.log(str)
}
export function setUrlParams(params = {}, url = window.location.href) {
  // Parse the provided URL or use the current window location
  const urlObj = new URL(url)

  for (let i = 0; i < Object.entries(params).length; i++) {
    const [key, value] = Object.entries(params)[i]
    if (value === null || value === undefined) {
      urlObj.searchParams.delete(key)
    } else {
      urlObj.searchParams.set(key, value)
    }
  }
  if (Object.entries(params).length == 0) {
    urlObj.search = ''
  }
  if (typeof window !== 'undefined') {
    window.history.pushState({}, '', urlObj.toString())
    // router.visit(`${window.location.pathname}?${urlObj.searchParams.toString()}`, {
    //   preserveState: true,
    //   preserveScroll: true,
    //   replace: true,
    //   only: [],
    // })
  }

  return urlObj.toString()
}
export function getError(error) {
  if (error.response) {
    if (error.response.status == 419)
      // location.reload();
      null
    if (error.response.data && error.response.data.errors)
      return myMap(error.response.data.errors, (item) => item.message).join('<br/>')
    if (error.response.data && error.response.data.message)
      if (error.response.data.message == 'Unauthenticated.')
        return this.__('first_login_or_register')
    return error.response.data.message
  } else if (error.request) {
    return error.request
  } else {
    return error.message
  }
}
export function getErrors(error) {
  if (error.response) {
    if (error.response.status == 419)
      // location.reload();
      null
    if (error.response.data && error.response.data.errors)
      return error.response.data.errors.reduce((acc, item) => {
        acc[item.field] = item.message // Set key as field, value as message
        return acc
      }, {})
    if (error.response.data && error.response.data.message)
      if (error.response.data.message == 'Unauthenticated.')
        return this.__('first_login_or_register')
    return error.response.data.message
  } else if (error.request) {
    return error.request
  } else {
    return error.message
  }
}
export function myMap(arr, callbackFn) {
  var tmp = []
  for (var i = 0; i < arr.length; i++) {
    tmp.push(callbackFn(arr[i]))
  }
  return tmp
}
export function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    // Modern asynchronous clipboard API
    return navigator.clipboard
      .writeText(text)
      .then(() => {
        this.showToast('success', this.__('copy_to_clipboard_successfully'))
        return
      })
      .catch((err) => {
        // console.error('Failed to copy text: ', err);
      })
  }
  var textArea = document.createElement('textarea')
  textArea.value = text

  // Avoid scrolling to bottom
  textArea.style.top = '0'
  textArea.style.left = '0'
  textArea.style.position = 'fixed'

  document.body.appendChild(textArea)
  textArea.focus()
  textArea.select()

  try {
    var successful = document.execCommand('copy')
    this.showToast('success', this.__('copy_to_clipboard_successfully'))
  } catch (err) {}

  document.body.removeChild(textArea)
}
