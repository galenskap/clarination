<script setup lang="ts">
import { MaterialShape } from 'material-shapes-ts/vue'
import HomeTile from '@/components/HomeTile.vue'
</script>

<template>
  <main class="home">
    <div class="home__blobs" aria-hidden="true">
      <MaterialShape
        class="home__blob home__blob--coral"
        shape="VerySunny"
        color="#ff5833"
        size="42vh"
      />
      <MaterialShape
        class="home__blob home__blob--sky"
        shape="SoftBoom"
        color="#4a8acb"
        size="34vh"
      />
      <MaterialShape
        class="home__blob home__blob--leaf"
        shape="Flower"
        color="#5fab5a"
        size="22vh"
      />
    </div>

    <header class="home__brand">
      <h1 class="home__title">clarina</h1>
    </header>

    <nav class="home__tiles" aria-label="Jeux et outils">
      <HomeTile label="Accordeur" to="/accordeur" accent="coral">
        <template #icon>
          <svg viewBox="0 0 48 48" fill="currentColor" aria-hidden="true">
            <rect x="6" y="20" width="36" height="8" rx="4" />
            <circle cx="24" cy="24" r="10" />
            <rect x="22" y="8" width="4" height="32" rx="2" />
          </svg>
        </template>
      </HomeTile>

      <HomeTile label="Lecture de notes" to="/lecture" accent="sun">
        <template #icon>
          <svg viewBox="0 0 48 48" fill="currentColor" aria-hidden="true">
            <path d="M14 10h4v20a6 6 0 1 1-4-5.7V10zm16 4h4v16a6 6 0 1 1-4-5.7V14z" />
          </svg>
        </template>
      </HomeTile>

      <HomeTile label="Harmoniques" to="/harmoniques" accent="cream">
        <template #icon>
          <svg viewBox="0 0 48 48" fill="currentColor" aria-hidden="true">
            <circle cx="14" cy="34" r="5" />
            <circle cx="26" cy="28" r="5" />
            <circle cx="38" cy="22" r="5" />
            <rect x="17" y="10" width="3" height="24" rx="1" />
            <rect x="29" y="8" width="3" height="20" rx="1" />
            <rect x="41" y="6" width="3" height="16" rx="1" />
          </svg>
        </template>
      </HomeTile>

      <HomeTile label="Stats" to="/stats" accent="sky">
        <template #icon>
          <svg viewBox="0 0 48 48" fill="currentColor" aria-hidden="true">
            <rect x="8" y="26" width="8" height="14" rx="2" />
            <rect x="20" y="16" width="8" height="24" rx="2" />
            <rect x="32" y="8" width="8" height="32" rx="2" />
          </svg>
        </template>
      </HomeTile>

      <HomeTile label="Options" to="/options" accent="leaf">
        <template #icon>
          <svg viewBox="0 0 48 48" fill="currentColor" aria-hidden="true">
            <path
              fill-rule="evenodd"
              d="M21 6h6l1 5.2c1.4.3 2.7.9 3.9 1.6l4.5-2.7 4.2 4.2-2.7 4.5c.7 1.2 1.3 2.5 1.6 3.9L44 21v6l-5.2 1c-.3 1.4-.9 2.7-1.6 3.9l2.7 4.5-4.2 4.2-4.5-2.7c-1.2.7-2.5 1.3-3.9 1.6L27 42h-6l-1-5.2c-1.4-.3-2.7-.9-3.9-1.6l-4.5 2.7-4.2-4.2 2.7-4.5c-.7-1.2-1.3-2.5-1.6-3.9L4 27v-6l5.2-1c.3-1.4.9-2.7 1.6-3.9L8.1 11.6l4.2-4.2 4.5 2.7c1.2-.7 2.5-1.3 3.9-1.6L21 6zm3 10a8 8 0 1 0 0 16 8 8 0 0 0 0-16z"
            />
          </svg>
        </template>
      </HomeTile>
    </nav>
  </main>
</template>

<style scoped>
.home {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-lg);
  padding-top: max(var(--space-md), env(safe-area-inset-top));
  padding-right: max(var(--space-lg), env(safe-area-inset-right));
  padding-bottom: max(var(--space-md), env(safe-area-inset-bottom));
  padding-left: max(var(--space-lg), env(safe-area-inset-left));
  background: var(--color-plum);
  overflow: hidden;
}

.home__blobs {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.home__blob {
  position: absolute;
  opacity: 0.88;
}

.home__blob--coral {
  top: -18%;
  left: -8%;
  animation: blob-spin 28s linear infinite;
}

.home__blob--sky {
  right: -10%;
  bottom: -22%;
  animation: blob-spin 36s linear infinite reverse;
}

.home__blob--leaf {
  right: 18%;
  top: -12%;
  animation: blob-float var(--duration-slow) var(--ease-spatial) both;
}

.home__brand,
.home__tiles {
  position: relative;
  z-index: 1;
}

.home__brand {
  text-align: center;
  animation: brand-in var(--duration-slow) var(--ease-spatial);
}

.home__title {
  font-size: clamp(2.4rem, 12vh, 4.5rem);
  color: var(--color-sun);
  letter-spacing: -0.03em;
  line-height: 0.92;
}

.home__tiles {
  display: flex;
  flex-wrap: wrap;
  gap: clamp(0.5rem, 2vh, 1.25rem);
  justify-content: center;
}

@keyframes brand-in {
  from {
    transform: translateY(-0.8rem) scale(0.94);
  }
  to {
    transform: none;
  }
}

@keyframes blob-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes blob-float {
  from {
    opacity: 0;
    transform: scale(0.6);
  }
  to {
    opacity: 0.88;
    transform: scale(1);
  }
}
</style>
