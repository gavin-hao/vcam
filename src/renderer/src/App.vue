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
</style>