<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface HealthResult {
  status: 'ok' | 'degraded'
  timestamp: string
  services: {
    db: 'ok' | 'error'
    redis: 'ok' | 'error'
  }
}

const health = ref<HealthResult | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  const base = import.meta.env.VITE_API_URL ?? ''
  try {
    const res = await fetch(`${base}/api/v1/health`)
    health.value = await res.json()
  } catch (e) {
    error.value = 'Cannot reach API server'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="flex items-center justify-center min-h-screen bg-gray-50">
    <div class="w-full max-w-md p-8 bg-white rounded-xl shadow-sm border border-gray-100">
      <h1 class="text-2xl font-bold text-gray-800 mb-6">🌳 Family Tree — Health Check</h1>

      <!-- Loading -->
      <div v-if="loading" class="text-gray-400 text-sm">Checking services...</div>

      <!-- Fetch error -->
      <div v-else-if="error" class="flex items-center gap-2 text-red-600 text-sm">
        <span class="text-lg">✗</span>
        <span>{{ error }}</span>
      </div>

      <!-- Health result -->
      <div v-else-if="health">
        <!-- Overall status -->
        <div
          class="flex items-center gap-3 mb-6 p-3 rounded-lg"
          :class="health.status === 'ok' ? 'bg-green-50' : 'bg-yellow-50'"
        >
          <span class="text-2xl">{{ health.status === 'ok' ? '✅' : '⚠️' }}</span>
          <div>
            <p class="font-semibold text-gray-800 capitalize">{{ health.status }}</p>
            <p class="text-xs text-gray-400">{{ new Date(health.timestamp).toLocaleString() }}</p>
          </div>
        </div>

        <!-- Service list -->
        <div class="space-y-3">
          <div
            v-for="(val, key) in health.services"
            :key="key"
            class="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
          >
            <span class="text-sm font-medium text-gray-700 uppercase tracking-wide">{{ key }}</span>
            <span
              class="text-xs font-semibold px-2 py-0.5 rounded-full"
              :class="val === 'ok' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
            >
              {{ val }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
