<script setup>
import Checkbox from '~/components/Checkbox.vue'
import GuestLayout from '~/layouts/GuestLayout.vue'
import InputError from '~/components/InputError.vue'
import InputLabel from '~/components/InputLabel.vue'
import PrimaryButton from '~/components/PrimaryButton.vue'
import TextInput from '~/components/TextInput.vue'
import { Head, Link, useForm, usePage } from '@inertiajs/vue3'
import { UserIcon, EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline'
import { onMounted, ref } from 'vue'
import { route } from '@izzyjs/route/client'
import { __, dir, showAlert, showToast } from '~/js/mixins.js'

defineProps({
  canResetPassword: Boolean,
  status: String,
})
let showPassword = ref(false)
const $page = usePage()
const form = useForm({
  username: '',
  password: '',
  remember: false,
})

const submit = () => {
  form.post(
    route().current('admin.login-form') ? route('admin.auth.login') : route('user.auth.login'),
    {
      onSuccess: (response) => {},
      onFinish: (response) => {
        form.reset('password')
      },
      onError: (err) => {
        // console.log(err)
        // showToast({ status: 'danger', message: err })
      },
    }
  )
}
</script>

<template>
  <GuestLayout :dir="dir()" aria-expanded="false">
    <Head :title="__('login')" />

    <div v-if="status" class="mb-4 font-medium text-sm text-green-600">
      {{ status }}
    </div>

    <form @submit.prevent="submit">
      <div>
        <InputLabel for="login" :value="__('username')" />

        <TextInput
          id="username"
          type="text"
          classes="  "
          v-model="form.username"
          required
          autofocus
          autocomplete="username"
        >
          <template v-slot:prepend>
            <div class="p-3">
              <UserIcon class="h-5 w-5" />
            </div>
          </template>
        </TextInput>

        <InputError class="mt-2" :message="form.errors.username" />
      </div>

      <div class="mt-4">
        <InputLabel for="password" :value="__('password')" />

        <TextInput
          id="password"
          :type="showPassword ? 'text' : 'password'"
          classes=" "
          v-model="form.password"
          required
          suggested="current-password"
        >
          <template v-slot:prepend>
            <div class="p-3" @click="showPassword = !showPassword">
              <EyeIcon v-if="!showPassword" class="h-5 w-5" />
              <EyeSlashIcon v-else class="h-5 w-5" />
            </div>
          </template>
        </TextInput>

        <InputError class="mt-2" :message="form.errors.password" />
      </div>

      <div class="flex mt-4 items-center justify-between">
        <label class="flex items-center">
          <Checkbox name="remember" v-model:checked="form.remember" />
          <span class="m-2 text-sm text-gray-600">{{ __('remember_me') }}</span>
        </label>
        <Link
          v-if="canResetPassword"
          :href="
            route().current('admin.login-form')
              ? route('admin.password.request')
              : route('password.request')
          "
          class="underline text-sm text-gray-600 hover:text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {{ __('forgot_my_password') }}
        </Link>
      </div>

      <div class="relative mt-4">
        <PrimaryButton
          class="w-full"
          :class="{ 'opacity-25': form.processing }"
          :disabled="form.processing"
        >
          <span class="text-lg"> {{ __('login') }}</span>
        </PrimaryButton>
      </div>
      <div v-if="!route().current('admin.login-form')" class="w-full mt-5">
        <span>{{ __('not_have_account?') }}</span>
        <Link
          v-if="canResetPassword"
          :href="route('register')"
          class="underline mx-2 text-sm text-gray-600 hover:text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {{ __('signup') }}
        </Link>
      </div>
      <div v-if="route().current('user.login-form')" class="w-full mt-5 text-end">
        <Link
          :href="route('admin.login-form')"
          class="text-primary-600 mx-2 text-sm text-gray-600 hover:text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {{ __('admin_portal') }}
        </Link>
      </div>
    </form>
  </GuestLayout>
</template>
