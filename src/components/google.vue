<template>
  <GoogleLogin :callback="handleGoogleLogin">
    <template #default="{ login }">
      <button class="google-btn w-5 pt2" @click="login">
        <img src="../assets/google.png" alt="google" />
      </button>
    </template>
  </GoogleLogin>
</template>

<script setup lang="ts">
import { useUserStore } from '../stores/user'
import axios from 'axios'

const userStore = useUserStore()

const handleGoogleLogin = async (response: any) => {
  const googleToken = response.credential

  const { data } = await axios.post('http://localhost:9000/api/v1/auth/google', {
    access_token: googleToken
  },
  {
    headers: {
      'Content-Type': 'application/json'
    }
  })
console.log(data);

  userStore.setUser(data.user)
}
</script>
