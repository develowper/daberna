<template>
  <Panel>
    <template v-slot:header>
      <title>{{ __('panel') }}</title>
    </template>

    <template v-slot:content>
      <!-- Content header -->
      <div class="flex items-center justify-between px-4 py-2 text-primary-500 border-b md:py-4">
        <div class="flex">
          <Bars2Icon class="h-7 w-7 mx-3" />
          <h1 class="text-2xl font-semibold">{{ __('settings') }}</h1>
        </div>
        <client-only>
          <button
            v-if="false"
            @click="(params.id = null), (params.key = null), (params.value = null), modal.show()"
            data-te-toggle="modal"
            data-te-target="#settingModal"
            data-te-ripple-init
            class="inline-flex items-center justify-center px-4 py-2 bg-green-500 border border-transparent rounded-md font-semibold transition-all duration-500 text-white hover:bg-green-600 focus:bg-gray-700 active:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition ease-in-out duration-150"
          >
            {{ __('new_setting') }}
          </button>
        </client-only>
      </div>
      <!-- Content -->
      <div class="px-2 flex flex-col md:px-4">
        <div class="flex-col bg-white overflow-x-auto shadow-lg rounded-lg">
          <div class="flex items-center justify-between py-4 p-4">
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
                  ref="userMenu"
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
                id="table-search-users"
                v-model="params.search"
                @keydown.enter="getData()"
                class="block p-2 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg w-80 bg-gray-50 focus:ring-blue-500 focus:border-blue-500"
                :placeholder="__('search')"
              />
            </div>
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
                    (params.order_by = 'title'),
                      (params.dir = params.dir == 'ASC' ? 'DESC' : 'ASC'),
                      (params.page = 1),
                      getData()
                  "
                >
                  <div class="flex items-center justify-center">
                    <span class="px-2"> {{ __('key') }}</span>
                    <ArrowsUpDownIcon class="w-4 h-4" />
                  </div>
                </th>

                <th
                  scope="col"
                  class="px-2 py-3 cursor-pointer duration-300 hover:text-gray-500 hover:scale-[105%]"
                  @click="
                    (params.order_by = 'view'),
                      (params.dir = params.dir == 'ASC' ? 'DESC' : 'ASC'),
                      (params.page = 1),
                      getData()
                  "
                >
                  <div class="flex items-center justify-center">
                    <span class="px-2"> {{ __('value') }} </span>
                    <ArrowsUpDownIcon class="w-4 h-4" />
                  </div>
                </th>

                <th scope="col" class="px-2 py-3">
                  {{ __('actions') }}
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
                <td
                  @click="
                    ;(params.id = d.id),
                      (params.key = d.key),
                      (params.title = d.title),
                      (params.value = toJson(d.value) ? toJson(d.value) : d.value),
                      modal.show()
                  "
                  data-te-toggle="modal"
                  data-te-target="#settingModal"
                  data-te-ripple-init
                  class="flex hover:cursor-pointer hover:text-gray-400 flex-col items-center px-6 py-4 text-gray-900 whitespace-nowrap"
                >
                  <div>{{ d.key }}</div>
                  <div class="text-xs text-gray-500">{{ d.title }}</div>
                </td>

                <td class="px-2 py-4">
                  {{ d.value }}
                </td>

                <td class="px-2 py-4">
                  <!-- Actions Group -->
                  <div
                    class="inline-flex rounded-md shadow-[0_4px_9px_-4px_#3b71ca] transition duration-150 ease-in-out hover:bg-primary-600 hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:bg-primary-600 focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:outline-none focus:ring-0 active:bg-primary-700 active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)]"
                    role="group"
                  >
                    <button
                      @click="
                        ;(params.id = d.id),
                          (params.key = d.key),
                          (params.title = d.title),
                          (params.value = toJson(d.value) ? toJson(d.value) : d.value),
                          modal.show()
                      "
                      data-te-toggle="modal"
                      data-te-target="#settingModal"
                      data-te-ripple-init
                      class="inline-flex items-center rounded-md justify-center px-4 py-2 bg-orange-500 border border-transparent transition-all duration-500 text-white hover:bg-orange-400 focus:bg-gray-700 active:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition ease-in-out duration-150"
                    >
                      {{ __('edit') }}
                    </button>
                    <button
                      v-if="false"
                      @click="
                        showDialog('danger', __('remove_item?'), __('remove'), removeData, d.id)
                      "
                      type="button"
                      class="inline-block rounded-e bg-red-500 text-white px-6 py-2 text-xs font-medium uppercase leading-normal text-white transition duration-150 ease-in-out hover:bg-red-400 focus:outline-none focus:ring-0"
                      data-te-ripple-init
                      data-te-ripple-color="light"
                    >
                      {{ __('remove') }}
                    </button>

                    <!--                  <button -->
                    <!--                      type="button"-->
                    <!--                      class="inline-block rounded-e bg-teal-500 px-6 py-2 text-xs font-medium uppercase leading-normal text-white transition duration-150 ease-in-out hover:bg-teal-400   focus:outline-none focus:ring-0  "-->
                    <!--                      data-te-ripple-init-->
                    <!--                      data-te-ripple-color="light">-->
                    <!--                    {{ __('charge') }}-->
                    <!--                  </button>-->
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal -->
      <div
        data-te-modal-init
        class="fixed left-0 top-0 backdrop-blur z-[1055] hidden h-full w-full overflow-y-auto overflow-x-hidden outline-none"
        id="settingModal"
        tabindex="-1"
        aria-labelledby="settingModalLabel"
        aria-hidden="true"
      >
        <div
          data-te-modal-dialog-ref
          class="pointer-events-none relative w-auto translate-y-[-50px] opacity-0 transition-all duration-300 ease-in-out min-[576px]:mx-auto min-[576px]:mt-7 px-2 sm:px-4 md:px8 min-[576px]:max-w-5xl"
        >
          <div
            class="min-[576px]:shadow-[0_0.5rem_1rem_rgba(#000, 0.15)] pointer-events-auto relative flex w-full flex-col rounded-md border-none bg-white bg-clip-padding text-current shadow-lg outline-none"
          >
            <div
              class="flex flex-shrink-0 items-center justify-between rounded-t-md border-b-2 border-neutral-100 border-opacity-100 p-4"
            >
              <!--Modal title-->
              <h5
                class="text-xl font-medium leading-normal text-neutral-800"
                id="settingModalLabel"
              ></h5>
              <!--Close button-->
              <button
                :class="`text-danger`"
                type="button"
                class="box-content rounded-none border-none hover:no-underline hover:opacity-75 focus:opacity-100 focus:shadow-none focus:outline-none"
                data-te-modal-dismiss
                aria-label="Close"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  class="h-6 w-6"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!--Modal body-->
            <div class="relative flex-auto p-4" data-te-modal-body-ref>
              <div
                class="flex items-center justify-start px-4 py-2 text-primary-500 border-b md:py-4"
              >
                <FolderPlusIcon class="h-7 w-7 mx-3" />

                <h1 class="text-2xl font-semibold">{{ __('settings') }}</h1>
              </div>

              <div class="px-2 md:px-4">
                <div class="mx-auto md:max-w-3xl mt-6 px-2 md:px-4 py-4 overflow-hidden rounded-lg">
                  <div class="flex flex-col mx-2 col-span-2 w-full px-2">
                    <form @submit.prevent="addEditData">
                      <div class="my-2 p-2">
                        <TextInput
                          id="title"
                          type="text"
                          :placeholder="__('title')"
                          classes="  "
                          v-model="params.title"
                          autocomplete="title"
                          :error="params.errors.title"
                        >
                          <template v-slot:prepend>
                            <div class="p-3">
                              <Bars2Icon class="h-5 w-5" />
                            </div>
                          </template>
                        </TextInput>
                      </div>
                      <div class="my-2 p-2">
                        <TextInput
                          id="key"
                          type="text"
                          :placeholder="__('key')"
                          classes="  "
                          v-model="params.key"
                          autocomplete="key"
                          :error="params.errors.key"
                        >
                          <template v-slot:prepend>
                            <div class="p-3">
                              <Bars2Icon class="h-5 w-5" />
                            </div>
                          </template>
                        </TextInput>
                      </div>
                      <!--value types-->
                      <div
                        v-if="params.value && isObject(params.value)"
                        v-for="(row, ix) in params.value"
                        class="border rounded-lg my-2 p-2"
                      >
                        <div
                          v-if="row && isObject(row)"
                          v-for="(col, idx) in row"
                          class="border rounded p-1 m-1"
                        >
                          <div v-if="col && isObject(col)" v-for="(icol, idxx) in col">
                            <TextInput
                              :id="idx"
                              type="text"
                              :placeholder="idxx"
                              classes="  "
                              v-model="params.value[ix][idx][idxx]"
                              autocomplete="key"
                              :error="params.errors.value"
                            >
                              <template v-slot:prepend>
                                <div class="p-3">
                                  <Bars2Icon class="h-5 w-5" />
                                </div>
                              </template>
                            </TextInput>
                          </div>
                          <TextInput
                            v-else
                            :id="idx"
                            type="text"
                            :placeholder="idx"
                            classes="  "
                            v-model="params.value[ix][idx]"
                            autocomplete="key"
                            :error="params.errors.value"
                          >
                            <template v-slot:prepend>
                              <div class="p-3">
                                <Bars2Icon class="h-5 w-5" />
                              </div>
                            </template>
                          </TextInput>
                        </div>
                        <div v-else class="my-2">
                          <TextInput
                            id="value"
                            type="text"
                            :multiline="true"
                            :placeholder="`${__(ix)}`"
                            classes="  "
                            v-model="params.value[ix]"
                            autocomplete="value"
                            :error="params.errors.value"
                          >
                            <template v-slot:prepend>
                              <div class="p-3">
                                <Bars2Icon class="h-5 w-5" />
                              </div>
                            </template>
                          </TextInput>
                        </div>
                      </div>

                      <div v-else class="my-2">
                        <TextInput
                          id="value"
                          type="text"
                          :multiline="true"
                          :placeholder="__('value')"
                          classes="  "
                          v-model="params.value"
                          autocomplete="value"
                          :error="params.errors.value"
                        >
                          <template v-slot:prepend>
                            <div class="p-3">
                              <Bars2Icon class="h-5 w-5" />
                            </div>
                          </template>
                        </TextInput>
                      </div>

                      <div
                        v-if="loading"
                        class="shadow w-full bg-grey-light m-2 bg-gray-200 rounded-full"
                      >
                        <div
                          class="bg-primary rounded text-xs leading-none py-[.1rem] text-center text-white duration-300"
                          :class="{ ' animate-pulse': loading }"
                          :style="`width: 100%`"
                        ></div>
                      </div>

                      <div class="mt-4">
                        <PrimaryButton
                          class="w-full"
                          :class="{ 'opacity-25': loading }"
                          :disabled="loading"
                        >
                          <LoadingIcon class="w-4 h-4 mx-3" v-if="loading" />
                          <span class="text-lg"> {{ __('register_info') }}</span>
                        </PrimaryButton>
                      </div>
                    </form>
                  </div>
                </div>
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
import Pagination from '~/components/Pagination.vue'
import {
  Bars2Icon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  HomeIcon,
  XMarkIcon,
  ArrowsUpDownIcon,
  FolderPlusIcon,
  PlusIcon,
} from '@heroicons/vue/24/outline'
import Image from '~/components/Image.vue'
import Tooltip from '~/components/Tooltip.vue'
import LoadingIcon from '~/components/LoadingIcon.vue'
import TextInput from '~/components/TextInput.vue'
import PrimaryButton from '~/components/PrimaryButton.vue'
import { __, log, showDialog, showToast, toJson, getError, f2e } from '../../../../js/mixins.js'
import { route } from '@izzyjs/route/client'
import { isArray, isObject, isString } from 'node:util'
import ClientOnly from '~/components/ClientOnly.vue'

export default {
  data() {
    return {
      params: {
        page: 1,
        search: null,
        paginate: this.$page.props.pageItems[1],
        order_by: null,
        dir: 'DESC',
        id: null,
        key: null,
        title: null,
        value: null,
        errors: {},
      },
      data: [],
      pagination: {},
      toggleSelect: false,
      loading: false,
      error: null,
      selected: null,
    }
  },
  components: {
    ClientOnly,
    TextInput,
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
    LoadingIcon,
    FolderPlusIcon,
    PlusIcon,
    PrimaryButton,
  },
  async mounted() {
    const { Modal } = await import('tw-elements')
    this.getData()
    const modalEl = document.getElementById('settingModal')
    this.modal = new Modal(modalEl)
    // this.showDialog('danger', 'message',()=>{});
    // this.isLoading(false);
  },
  methods: {
    log,
    isObject,
    isString,
    isArray,
    showDialog,
    __,
    toJson,
    getData() {
      this.loading = true
      this.data = []
      window.axios
        .get(
          route('admin.panel.setting.search'),
          {
            params: this.params,
          },
          {}
        )
        .then((response) => {
          this.data = response.data.data
          this.data.forEach((el) => {
            el.selected = false
          })
          delete response.data.data
          this.pagination = response.data.meta
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
    toggleAll() {
      this.toggleSelect = !this.toggleSelect
      this.data.forEach((e) => {
        e.selected = this.toggleSelect
      })
    },
    addEditData() {
      this.loading = true
      const params = JSON.parse(JSON.stringify(this.params))
      params.value = !isString(params.value) ? JSON.stringify(params.value) : params.value
      params.value = f2e(params.value)
      // params._method = 'PATCH'
      window.axios
        .patch(route('admin.panel.setting.update'), params, {})
        .then((response) => {
          if (response.data && response.data.message) {
            this.modal.hide()
            showToast('success', response.data.message)
            this.params.page = 1
            this.getData()
          }
        })

        .catch((error) => {
          this.error = getError(error)
          if (error.response && error.response.data) {
          }
          showToast('danger', this.error)
        })
        .finally(() => {
          // always executed
          this.loading = false
        })
    },
    removeData(id) {
      this.loading = true
      window.axios
        .delete(route('admin.panel.setting.delete', id), {}, {})
        .then((response) => {
          if (response.data && response.data.message) {
            showToast('success', response.data.message)
            this.params.page = 1
            this.getData()
          }
        })

        .catch((error) => {
          this.error = this.getError(error)
          if (error.response && error.response.data) {
          }
          showToast('danger', this.error)
        })
        .finally(() => {
          // always executed
          this.loading = false
        })
    },
    paginationChanged(data) {
      this.params.page = data.page
      this.getData()
    },
  },
}
</script>
