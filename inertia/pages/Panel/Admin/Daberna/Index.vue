<template>
  <Panel>
    <template v-slot:header>
      <title>{{ __('transactions') }}</title>
    </template>

    <template v-slot:content>
      <!-- Content header -->
      <div class="flex items-center justify-between px-4 py-2 text-primary-500 border-b md:py-4">
        <div class="flex">
          <Bars2Icon class="h-7 w-7 mx-3" />
          <h1 class="text-2xl font-semibold">
            {{ `${__('transactions')}  ${params.type ? `(${__(params.type)})` : ``}` }}
          </h1>
        </div>
        <div v-if="false">
          <Link
            :href="route('admin.panel.admin.create')"
            class="inline-flex items-center justify-center px-4 py-2 bg-green-500 border border-transparent rounded-md font-semibold transition-all duration-500 text-white hover:bg-green-600 focus:bg-gray-700 active:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition ease-in-out duration-150"
          >
            {{ __('new_transaction') }}
          </Link>
        </div>
      </div>
      <!-- Content -->
      <div class="px-2 flex flex-col md:px-4">
        <div class="flex-col bg-white overflow-x-auto shadow-lg rounded-lg">
          <!--          search and table-->
          <div class="flex flex-wrap items-center justify-start gap-2 py-4 p-4">
            <!--              Dropdown Actions-->
            <div>
              <div class="relative mx-1" data-te-dropdown-ref>
                <button
                  id="dropdownActionsSetting"
                  data-te-dropdown-toggle-ref
                  aria-expanded="false"
                  data-te-ripple-init
                  data-te-ripple-color="light"
                  class="inline-flex items-center text-gray-500 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-lg text-sm px-3 py-1.5"
                >
                  <span class="sr-only">table actions</span>
                  <span>{{ __('bulk_actions') }}</span>
                  <ChevronDownIcon class="h-4 w-4 mx-1" />
                </button>

                <!--     menu -->
                <div
                  ref="actionsMenu"
                  data-te-dropdown-menu-ref
                  class="min-w-[12rem] absolute z-[1000] float-start m-0 hidden min-w-max list-none overflow-hidden rounded-lg border-none bg-white bg-clip-padding text-start text-base shadow-lg [&[data-te-dropdown-show]]:block"
                  tabindex="-1"
                  role="menu"
                  aria-orientation="vertical"
                  aria-label="Actions menu"
                  aria-labelledby="dropdownActionsSetting"
                ></div>
              </div>
            </div>
            <!--              Dropdown Paginate-->
            <div class="flex items-center">
              <div class="relative mx-1" data-te-dropdown-ref>
                <button
                  id="dropdownPaginate"
                  data-te-dropdown-toggle-ref
                  aria-expanded="false"
                  data-te-ripple-init
                  data-te-ripple-color="light"
                  class="inline-flex items-center text-gray-500 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-lg text-sm px-3 py-1.5"
                >
                  <span class="sr-only">table actions</span>
                  <span>{{ params.paginate }}</span>
                  <ChevronDownIcon class="h-4 w-4 mx-1" />
                </button>

                <!--     menu -->
                <div
                  ref="adminMenu"
                  data-te-dropdown-menu-ref
                  class="min-w-[12rem] absolute z-[1000] start-0 text-gray-500 m-0 hidden min-w-max list-none overflow-hidden rounded-lg border-none bg-white bg-clip-padding text-start text-base shadow-lg [&[data-te-dropdown-show]]:block"
                  tabindex="-1"
                  role="menu"
                  aria-orientation="vertical"
                  aria-label="User menu"
                  aria-labelledby="dropdownPaginate"
                >
                  <div v-for="num in $page.props.pageItems" class="">
                    <div
                      @click="(params.paginate = num), getData()"
                      role="menuitem"
                      class="cursor-pointer select-none block p-2 px-6 text-sm transition-colors hover:bg-gray-100"
                    >
                      {{ num }}
                    </div>
                    <hr class="border-gray-200" />
                  </div>
                </div>
              </div>

              <!--                Paginate-->
              <Pagination @paginationChanged="paginationChanged" :pagination="pagination" />
            </div>

            <div class="relative">
              <label for="table-search" class="sr-only">Search</label>
              <div
                class="absolute inset-y-0 cursor-pointer text-gray-500 hover:text-gray-700 start-0 flex items-center px-3"
              >
                <MagnifyingGlassIcon @click="getData()" class="w-4 h-4" />
              </div>
              <div
                class="absolute inset-y-0 end-0 text-gray-500 flex items-center px-3 cursor-pointer hover:text-gray-700"
                @click="(params.search = null), getData()"
              >
                <XMarkIcon class="w-4 h-4" />
              </div>
              <input
                type="text"
                id="table-search-admins"
                v-model="params.search"
                @keydown.enter="getData()"
                class="block ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg w-80 bg-gray-50 focus:ring-blue-500 focus:border-blue-500"
                :placeholder="__('search')"
              />
            </div>

            <!--            select user-->
            <UserSelector
              v-if="admin"
              :colsData="['id', 'username', 'phone', 'agencyId']"
              :labelsData="['id', 'name', 'phone', 'agency_id']"
              :link="
                route('admin.panel.user.search') +
                (admin.agencyId ? `?agency_id=${admin.agencyId}` : '')
              "
              :label="null"
              :error="null"
              v-on:change="getData('clear')"
              :id="'user'"
              v-model:selected="params.user_id"
              :preload="null"
            >
              <template v-slot:selector="props">
                <div
                  :class="props.selectedText ? 'py-2' : 'py-2'"
                  class="px-4 border border-gray-200 rounded-lg hover:bg-gray-100 cursor-pointer flex items-center"
                >
                  <div class="grow text-sm">
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

            <!--            type selector-->
            <div class="block flex-grow">
              <div class="inline-flex" role="group">
                <div
                  v-for="(s, idx) in $page.props.types"
                  type="button"
                  @click="
                    params.type == s.name ? (params.type = null) : (params.type = s.name),
                      getData('clear')
                  "
                  class="inline-block select-none border-2 w-24 p-2 text-center text-xs font-medium uppercase leading-normal transition duration-150 ease-in-out hover:border-primary-accent-200 focus:border-primary-accent-200 focus:bg-secondary-50/50 focus:outline-none focus:ring-0 active:border-primary-accent-200 motion-reduce:transition-none dark:border-primary-400"
                  :class="`  cursor-pointer ${idx == 0 ? 'rounded-s-lg' : idx == $page.props.types.length - 1 ? 'rounded-e-lg' : ''} border-dark-500 ${s.name === params.type ? `text-white dark:text-white bg-${s.color}-500` : `text-${s.color}-500 dark:text-${s.color}-500 bg-white`}`"
                  data-twe-ripple-init
                  data-twe-ripple-color="light"
                >
                  {{ __(s.name) }}
                </div>
              </div>
            </div>
          </div>
          <div class="text-gray-500 text-sm px-4">
            {{ `${__('total')} ${total} ${__('item')}` }}
          </div>
          <!--           table-->
          <table class="w-full text-sm text-left text-gray-500">
            <thead class="text-xs text-gray-700 uppercase bg-gray-50">
              <!--         table header-->
              <tr class="text-sm text-center">
                <th scope="col" class="p-4" @click="toggleAll">
                  <div class="flex items-center">
                    <input
                      id="checkbox-all-search"
                      type="checkbox"
                      v-model="toggleSelect"
                      class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <label for="checkbox-all-search" class="sr-only">checkbox</label>
                  </div>
                </th>
                <th
                  scope="col"
                  class="px-2 py-3 cursor-pointer duration-300 hover:text-gray-500 hover:scale-[105%]"
                  @click="
                    (params.order_by = 'id'),
                      (params.dir = params.dir == 'ASC' ? 'DESC' : 'ASC'),
                      (params.page = 1),
                      getData()
                  "
                >
                  <div class="flex items-center justify-center">
                    <span class="px-2"> {{ __('id') }} </span>
                    <ArrowsUpDownIcon class="w-4 h-4" />
                  </div>
                </th>
                <th
                  scope="col"
                  class="px-2 py-3 cursor-pointer duration-300 hover:text-gray-500 hover:scale-[105%]"
                  @click="
                    (params.order_by = 'created_at'),
                      (params.dir = params.dir == 'ASC' ? 'DESC' : 'ASC'),
                      (params.page = 1),
                      getData()
                  "
                >
                  <div class="flex items-center justify-center">
                    <span class="px-2"> {{ __('created_at') }} </span>
                    <ArrowsUpDownIcon class="w-4 h-4" />
                  </div>
                </th>
                <th
                  scope="col"
                  class="px-2 py-3 cursor-pointer duration-300 hover:text-gray-500 hover:scale-[105%]"
                  @click="
                    (params.order_by = 'player_count'),
                      (params.dir = params.dir == 'ASC' ? 'DESC' : 'ASC'),
                      (params.page = 1),
                      getData()
                  "
                >
                  <div class="flex items-center justify-center">
                    <span class="px-2"> {{ __('player') }}</span>
                    <ArrowsUpDownIcon class="w-4 h-4" />
                  </div>
                </th>
                <th
                  scope="col"
                  class="px-2 py-3 cursor-pointer duration-300 hover:text-gray-500 hover:scale-[105%]"
                  @click="
                    (params.order_by = 'card_count'),
                      (params.dir = params.dir == 'ASC' ? 'DESC' : 'ASC'),
                      (params.page = 1),
                      getData()
                  "
                >
                  <div class="flex items-center justify-center">
                    <span class="px-2"> {{ __('card') }}</span>
                    <ArrowsUpDownIcon class="w-4 h-4" />
                  </div>
                </th>
                <th
                  scope="col"
                  class="px-2 py-3 cursor-pointer duration-300 hover:text-gray-500 hover:scale-[105%]"
                  @click="
                    (params.order_by = 'real_total_money'),
                      (params.dir = params.dir == 'ASC' ? 'DESC' : 'ASC'),
                      (params.page = 1),
                      getData()
                  "
                >
                  <div class="flex items-center justify-center">
                    <span class="px-2"> {{ __('input') }}</span>
                    <ArrowsUpDownIcon class="w-4 h-4" />
                  </div>
                </th>
                <th
                  scope="col"
                  class="px-2 py-3 cursor-pointer duration-300 hover:text-gray-500 hover:scale-[105%]"
                  @click="
                    (params.order_by = 'real_prize'),
                      (params.dir = params.dir == 'ASC' ? 'DESC' : 'ASC'),
                      (params.page = 1),
                      getData()
                  "
                >
                  <div class="flex items-center justify-center">
                    <span class="px-2"> {{ __('output') }}</span>
                    <ArrowsUpDownIcon class="w-4 h-4" />
                  </div>
                </th>

                <th
                  scope="col"
                  class="px-2 py-3 cursor-pointer duration-300 hover:text-gray-500 hover:scale-[105%]"
                  @click="
                    (params.order_by = 'type'),
                      (params.dir = params.dir == 'ASC' ? 'DESC' : 'ASC'),
                      (params.page = 1),
                      getData()
                  "
                >
                  <div class="flex items-center justify-center">
                    <span class="px-2"> {{ __('subject') }} </span>
                    <ArrowsUpDownIcon class="w-4 h-4" />
                  </div>
                </th>
                <th
                  scope="col"
                  class="px-24 py-3 cursor-pointer duration-300 hover:text-gray-500 hover:scale-[105%]"
                  @click="
                    (params.order_by = 'row_winners'),
                      (params.dir = params.dir == 'ASC' ? 'DESC' : 'ASC'),
                      (params.page = 1),
                      getData()
                  "
                >
                  <div class="flex items-center justify-center">
                    <span class="px-2"> {{ __('row_winners') }}</span>
                    <ArrowsUpDownIcon class="w-4 h-4" />
                  </div>
                </th>
                <th
                  scope="col"
                  class="px-24 py-3 cursor-pointer duration-300 hover:text-gray-500 hover:scale-[105%]"
                  @click="
                    (params.order_by = 'winners'),
                      (params.dir = params.dir == 'ASC' ? 'DESC' : 'ASC'),
                      (params.page = 1),
                      getData()
                  "
                >
                  <div class="flex items-center justify-center">
                    <span class="px-2"> {{ __('full_winners') }}</span>
                    <ArrowsUpDownIcon class="w-4 h-4" />
                  </div>
                </th>
                <th
                  scope="col"
                  class="px-24 py-3 cursor-pointer duration-300 hover:text-gray-500 hover:scale-[105%]"
                  @click="
                    (params.order_by = 'boards'),
                      (params.dir = params.dir == 'ASC' ? 'DESC' : 'ASC'),
                      (params.page = 1),
                      getData()
                  "
                >
                  <div class="flex items-center justify-center">
                    <span class="px-2"> {{ __('players') }}</span>
                    <ArrowsUpDownIcon class="w-4 h-4" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody class=" ">
              <tr
                v-if="loading"
                v-for="i in 3"
                class="animate-pulse bg-white text-center border-b hover:bg-gray-50"
              >
                <td class="w-4 p-4">
                  <div class="flex items-center">
                    <input
                      id="checkbox-table-search-1"
                      type="checkbox"
                      class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                  </div>
                </td>
                <td class="flex items-center px-6 py-4 text-gray-900 whitespace-nowrap">
                  <div class="w-10 h-10 rounded-full" />
                  <div class="px-3">
                    <div class="text-base bg-gray-200 px-5 py-2 rounded-lg"></div>
                    <div class="font-normal text-gray-500"></div>
                  </div>
                </td>
                <td class="px-2 py-4">
                  <div class="bg-gray-200 px-5 py-2 rounded-lg"></div>
                </td>
                <td class="px-2 py-4">
                  <div class="bg-gray-200 px-5 py-2 rounded-lg"></div>
                </td>
                <td class="px-2 py-4">
                  <div class="bg-gray-200 px-5 py-2 rounded-lg"></div>
                </td>
                <td class="px-2 py-4">
                  <div
                    class="justify-center bg-gray-200 px-5 py-3 rounded-lg items-center text-center rounded-md"
                  ></div>
                </td>
                <td class="px-2 py-4">
                  <div class="bg-gray-200 px-5 py-2 rounded-lg"></div>
                </td>
                <td class="px-2 py-4">
                  <!-- Actions Group -->
                  <div class="bg-gray-200 px-5 py-4 rounded-lg rounded-md" role="group"></div>
                </td>
              </tr>
              <tr v-for="(d, idx) in data" class="bg-white text-center border-b hover:bg-gray-50">
                <td class="w-4 p-4" @click="d.selected = !d.selected">
                  <div class="flex items-center">
                    <input
                      id="checkbox-table-search-1"
                      type="checkbox"
                      v-model="d.selected"
                      class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                  </div>
                </td>
                <td class=" ">{{ d.id }}</td>
                <td>{{ toShamsi(d.createdAt, true) }}</td>

                <td class="px-2 py-4">
                  <div>{{ d.playerCount }}</div>
                </td>
                <td class="px-2 py-4">
                  <div>{{ d.cardCount }}</div>
                </td>
                <td class="px-2 py-4">
                  <div>{{ asPrice(d.realTotalMoney) }}</div>
                </td>
                <td class="px-2 py-4">
                  <div>{{ asPrice(d.realPrize) }}</div>
                </td>
                <td class="px-2 py-4">
                  <div>{{ `${__(d.type)}` || '' }}</div>
                </td>
                <td class="px-2 py-4">
                  <div
                    v-html="
                      (d.rowWinners ?? [])
                        .map(
                          (i) =>
                            `[🃏${i.card_number}](👤${i.user_id})[${i.username}]<${asPrice(i.prize)}>`
                        )
                        .join('♦️')
                    "
                  ></div>
                </td>
                <td class="px-2 py-4">
                  <div
                    v-html="
                      (d.winners ?? [])
                        .map(
                          (i) =>
                            `[🃏${i.card_number}](👤${i.user_id})[${i.username}]<${asPrice(i.prize)}>`
                        )
                        .join('♦️')
                    "
                  ></div>
                </td>
                <td class="px-2 py-4">
                  <div
                    v-html="
                      (d.boards ?? [])
                        .map((i) => `[🃏${i.card_number}](👤${i.user_id})[${i.username}]`)
                        .join('♦️')
                    "
                  ></div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </Panel>
</template>

<script>
import Panel from '~/layouts/Panel.vue'
import { Head, Link, router, useForm } from '@inertiajs/vue3'
import Pagination from '~/components/Pagination.vue'
import {
  Bars2Icon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  HomeIcon,
  XMarkIcon,
  ArrowsUpDownIcon,
} from '@heroicons/vue/24/outline'
import Image from '~/components/Image.vue'
import Tooltip from '~/components/Tooltip.vue'

import {
  __,
  asPrice,
  toShamsi,
  cropText,
  showToast,
  showDialog,
  initTableDropdowns,
  getUrlParams,
  log,
  setUrlParams,
  isLoading,
  getErrors,
} from '~/js/mixins.js'
import { route } from '@izzyjs/route/client'

export default {
  data() {
    return {
      params: {
        page: 1,
        payed_at: null,
        search: null,
        paginate: this.$page.props.pageItems[0],
        type: null,
        order_by: null,
        dir: 'DESC',
      },
      data: [],
      urlParams: getUrlParams(),
      pagination: {},
      toggleSelect: false,
      loading: false,
      error: null,
      total: 0,
      admin: this.$page.props.auth.user,
    }
  },
  components: {
    Head,
    Link,
    HomeIcon,
    ChevronDownIcon,
    Panel,
    Bars2Icon,
    Image,
    MagnifyingGlassIcon,
    XMarkIcon,
    Pagination,
    ArrowsUpDownIcon,
    Tooltip,
  },
  mounted() {
    this.tableWrapper = document.querySelector('table').parentElement

    this.params.type = this.urlParams.type
    this.params.payed_at = this.urlParams.payed_at ? Number.parseInt(this.urlParams.payed_at) : null
    // setUrlParams( {})
    this.getData()
    // console.log(this.urlParams)
    // this.showDialog('danger', 'message',()=>{});
    // this.showDialog('danger', 'message',()=>{});
    // this.isLoading(false);
  },
  methods: {
    showDialog,
    log,
    route,
    __,
    toShamsi,
    asPrice,
    cropText,
    showToast,
    isLoading,
    getErrors,
    getData(clear) {
      this.loading = true
      this.data = []
      if (clear) this.params.page = 1
      window.axios
        .get(
          route(`admin.panel.daberna.search`),
          {
            params: this.params,
          },
          {}
        )
        .then((response) => {
          if (response.data) {
            this.data = response.data.data
            this.total = response.data.meta.total
          }
          this.data.forEach((el) => {
            el.selected = false
            el.accesses = el.accesses ? el.accesses.split(',') : []
          })
          delete response.data.data
          this.pagination = response.data.meta

          this.$nextTick(() => {
            initTableDropdowns()
            this.setTableHeight()
          })
        })

        .catch((error) => {
          if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.log(error.response.data)
            console.log(error.response.status)
            console.log(error.response.headers)
            this.error = error.response.data
          } else if (error.request) {
            // The request was made but no response was received
            // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
            // http.ClientRequest in node.js
            console.log(error.request)
            this.error = error.request
          } else {
            // Something happened in setting up the request that triggered an Error
            console.log('Error', error.message)
            this.error = error.message
          }
          console.log(error.config)

          showToast('danger', error)
        })
        .finally(() => {
          // always executed
          this.loading = false
        })
    },
    setTableHeight() {
      let a = window.innerHeight - this.tableWrapper.offsetTop
      // this.tableWrapper.classList.add(`h-[60vh]`);
      this.tableWrapper.style.height = `${a}px`
      // this.tableWrapper.firstChild.classList.add(`overflow-y-scroll`);
    },
    toggleAll() {
      this.toggleSelect = !this.toggleSelect
      this.data.forEach((e) => {
        e.selected = this.toggleSelect
      })
    },
    edit(params) {
      this.isLoading(true)
      window.axios
        .patch(route('admin.panel.transaction.update'), params, {})
        .then((response) => {
          if (response.data && response.data.message) {
            this.showToast('success', response.data.message)
          }

          if (response.data.status) {
            this.data[params.idx].status = response.data.status
          }

          if (response.data.payed_at) {
            this.data[params.idx].payedAt = response.data.payed_at
          }
          if (response.data.removed) {
            this.getData(true)
          }
        })

        .catch((error) => {
          this.error = this.getErrors(error)
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
          this.showToast('danger', this.error)
        })
        .finally(() => {
          // always executed
          this.isLoading(false)
        })
    },
    paginationChanged(data) {
      this.params.page = data.page
      this.getData()
    },
    bulkAction(cmnd) {},
  },
}
</script>
