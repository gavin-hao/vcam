<template>
  <template v-if="overtime">
    <div class="notice">已超出试用期，请联系研发人员</div>
  </template>
  <template v-else>
    <Camera />
  </template>
</template>

<script setup lang="ts">
  import { computed } from 'vue';
  import Camera from './components/Camera.vue';
  
  const overtime = computed(() => {
    return new Date() > new Date('2024-08-15')
  })
</script>

<style scoped>
.notice {
  text-align: center;
  height: 100%;
  margin: auto;
}
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
