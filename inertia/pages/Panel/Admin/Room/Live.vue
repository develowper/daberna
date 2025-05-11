<template>
  <Panel>
    <template v-slot:header>
      <title>{{ data.title }}</title>
    </template>

    <template v-slot:content>
      <!-- Content header -->
      <div class="flex items-center justify-start px-4 py-2 text-primary-500 border-b md:py-4">
        <PencilSquareIcon class="h-7 w-7 mx-3" />

        <h1 class="text-2xl font-semibold">{{ data.title }}</h1>
      </div>

      <!-- Content -->
      <div class="px-2 md:px-4 mx-auto md:max-w-5xl">
        <div v-if="data && data.id" class="flex flex-col mt-4">
          <div class="flex text-sm">
            <div class="text-gray-500 animate-pulse">{{ __('card_count') }}:</div>
            <div class="text-primary-700 mx-2">{{ socketParams.cardCount }}</div>
          </div>
          <div class="flex text-sm">
            <div class="text-gray-500 animate-pulse">{{ __('player_count') }}:</div>
            <div class="text-primary-700 mx-2">{{ socketParams.playerCount }}</div>
          </div>
          <div class="flex text-sm">
            <div class="text-gray-500 animate-pulse">{{ __('waiting') }}:</div>
            <div class="text-primary-700 mx-2">{{ socketParams.secondsRemaining }}</div>
          </div>

          <div class="flex text-sm">
            <div class="text-gray-500">{{ __('status') }}:</div>
            <div class="mx-2" :class="`text-${!!data.isActive ? 'success' : 'danger'}-500`">
              {{ !!data.isActive ? __('active') : __('inactive') }}
            </div>
          </div>
          <!--          <div>{{ Object.keys(data).join(' ') }}</div>-->
        </div>
        <div
          v-if="data && data.id"
          class="mx-auto md:max-w-3xl my-6 px-2 md:px-4 py-4 bg-white shadow-md overflow-hidden rounded-lg"
        >
          <div class="flex flex-col p-2 my-4 border border-gray-300 rounded-lg">
            <!--            select user-->
            <div class="my-2">
              <UserSelector
                v-if="admin"
                :colsData="['id', 'username', 'phone', 'agencyId']"
                :labelsData="['id', 'name', 'phone', 'agency_id']"
                :where="{
                  /* role: 'bo'*/
                }"
                :link="
                  route('admin.panel.user.search') +
                  (admin.agencyId ? `?agency_id=${admin.agencyId}` : '')
                "
                :label="null"
                :error="null"
                v-on:change=""
                :id="'user'"
                v-model:selected="user_id"
                :preload="null"
              >
                <template v-slot:selector="props">
                  <div
                    :class="props.selectedText ? 'py-2' : 'py-2'"
                    class="px-4 border border-gray-200 rounded-lg hover:bg-gray-100 cursor-pointer flex items-center"
                  >
                    <div class="grow text-sm p-1">
                      {{ props.selectedText ?? __('select_user') }}
                    </div>
                    <div
                      v-if="props.selectedText"
                      class="bg-danger rounded mx-2 cursor-pointer text-white hover:bg-danger-400"
                      @click.stop="props.clear(), getData('clear')"
                    >
                      <XMarkIcon class="w-5 h-5" />
                    </div>
                  </div>
                </template>
              </UserSelector>
            </div>

            <div class="my-2">
              <TextInput
                id="card_count"
                type="number"
                :placeholder="__('card_count')"
                classes="  "
                v-model="card_count"
                autocomplete="card_count"
                :error="errors.card_count"
              >
                <template v-slot:prepend>
                  <div class="p-2 px-3">
                    <UserIcon class="h-5 w-5" />
                  </div>
                </template>
              </TextInput>
            </div>
            <div class="mt-4">
              <PrimaryButton
                class="w-full flex justify-center items-center"
                :class="{ 'opacity-25': isLoading }"
                :disabled="isLoading"
                @click="
                  edit({ user_id: this.user_id, card_count: this.card_count, cmnd: 'add-bot' })
                "
              >
                <LoadingIcon class="w-4 h-4 mx-3" v-if="isLoading" />
                <span class="text-lg"> {{ __('add') }}</span>
              </PrimaryButton>
            </div>
          </div>

          <div class="border-b">{{ __('players') }}</div>

          <div v-for="player in socketParams.players">
            <div class="flex items-center justify-center m-2 p-2 rounded-md bg-gray-100">
              <div class="bg-indigo-200 rounded mx-2 px-2">{{ player.user_id }}</div>
              <div class="mx-2 px-2">{{ player.username }}</div>
              <div class="bg-indigo-200 rounded mx-2 px-2">
                {{ player.card_count }} {{ __('card') }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </Panel>
</template>

<script>
import Panel from '~/layouts/Panel.vue'
import { Head, Link, useForm } from '@inertiajs/vue3'
import {
  ChevronDownIcon,
  UserIcon,
  Bars2Icon,
  Squares2X2Icon,
  CreditCardIcon,
  BanknotesIcon,
  ChevronUpDownIcon,
  PencilSquareIcon,
} from '@heroicons/vue/24/outline'
import InputError from '~/components/InputError.vue'
import InputLabel from '~/components/InputLabel.vue'
import PrimaryButton from '~/components/PrimaryButton.vue'
import TextInput from '~/components/TextInput.vue'
import RadioGroup from '~/components/RadioGroup.vue'
import LoadingIcon from '~/components/LoadingIcon.vue'
import Popover from '~/components/Popover.vue'
import Tooltip from '~/components/Tooltip.vue'
import TagInput from '~/components/TagInput.vue'
import Selector from '~/components/Selector.vue'
import { route } from '@izzyjs/route/client'
import {
  __,
  asPrice,
  getError,
  getErrors,
  getSocketUrl,
  hasAccess,
  isLoading,
  showAlert,
  showToast,
  toShamsi,
} from '~/js/mixins.js'
import { io } from 'socket.io-client'
import { XMarkIcon } from '@heroicons/vue/24/outline/index.js'

export default {
  data() {
    return {
      data: this.data || {},
      socketParams: {},
      socket: null,
      user_id: null,
      card_count: null,
      cmnd: null,
      isLoading: false,
      errors: {},
    }
  },
  components: {
    XMarkIcon,
    LoadingIcon,
    Head,
    Link,
    ChevronDownIcon,
    Panel,
    InputLabel,
    TextInput,
    InputError,
    PrimaryButton,
    RadioGroup,
    UserIcon,
    Popover,
    Tooltip,
    Bars2Icon,
    TagInput,
    Selector,
    Squares2X2Icon,
    CreditCardIcon,
    BanknotesIcon,
    ChevronUpDownIcon,
    PencilSquareIcon,
  },
  created() {
    this.data = this.$page.props.data ?? {}
    this.admin = this.$page.props.auth.user ?? {}
    this.socketParams = {
      cardCount: this.data.cardCount,
      playerCount: this.data.playerCount,
      cmnd: this.data.cmnd,
      players: this.data.players,
      secondsRemaining: this.data.secondsRemaining,
      startWithMe: this.data.startWithMe,
      type: this.data.type,
    }
  },
  mounted() {
    // this.$nextTick(() => {
    //
    // });

    // console.log(this.data)

    this.initSocketIO()
  },
  beforeUnmount() {
    // console.log('*******')
    this.socket.disconnect()
  },
  methods: {
    asPrice,
    toShamsi,
    hasAccess,
    __,
    route,
    edit(params) {
      params.id = this.data.id
      this.isLoading = true
      isLoading(true)
      window.axios
        .patch(route('admin.panel.room.update'), params, {})
        .then((response) => {
          if (response.data && response.data.message) {
            showToast('success', response.data.message)
          }
        })

        .catch((error) => {
          this.error = getError(error)
          this.errors = getErrors(error)
          if (error.response && error.response.data) {
            if (error.response.data.charge) {
              this.data[params.idx].charge = error.response.data.charge
            }
            if (error.response.data.view_fee) {
              this.data[params.idx].view_fee = error.response.data.view_fee
            }
            if (error.response.data.meta) {
              this.data[params.idx].meta = error.response.data.meta
            }
          }
          showToast('danger', this.error)
        })
        .finally(() => {
          // always executed
          isLoading(false)
          this.isLoading = false
        })
    },

    initSocketIO() {
      this.socket = io(getSocketUrl(), {
        // transports: ['websocket' /* 'polling', 'flashsocket' */],
        // path: '/',
        // cors: true,
        // origins: ['*'],

        extraHeaders: {
          'request-room': this.data.type,
        },
        // auth: {
        //   token: document.cookie,
        // },
      })

      // this.socket.onAny((name, arg) => {
      //   console.log('onAny ' + name)
      //   // console.log(arg);
      // })
      // socket.on("hello", (arg) => {
      //     console.log(arg);
      // });
      this.socket.on(`ad-room-${this.data.type}`, (data) => {
        this.refresh(data)
      })
      this.socket.on('game-start', (data) => {
        console.log('game-start')
        this.refresh(null)
      })
      this.socket.on('connect', () => {
        // console.log(`Connected Socket ${this.socket.id} `)
        this.socket.onAny((name, arg) => {
          // console.log('onAny ' + name)
          // console.log(arg);
        })

        // socket.emit('hello', 'stranger')
      })
      // socket.emit("hello", `hello from  `);
    },
    refresh(data) {
      if (!data) this.socketParams = {}
      else
        this.socketParams = {
          cardCount: data.card_count,
          playerCount: data.player_count,
          cmnd: data.cmnd,
          players: JSON.parse(data.players || '[]'),
          secondsRemaining: data.seconds_remaining,
          startWithMe: data.start_with_me,
          type: data.type,
        }
    },
  },
}
</script>
