<script lang="ts">
  import { theme } from '../theme.svelte'

  let { size = '240px', class: className = '' }: { size?: string; class?: string } = $props()
</script>

<!-- Decorative; one themed image so only the matching file is fetched. -->
<img
  class="mascot {className}"
  style:--size={size}
  src={`${import.meta.env.BASE_URL}jevfree_${theme.dark ? 'dark' : 'light'}.png`}
  alt=""
  aria-hidden="true"
  width="764"
  height="1167"
  draggable="false"
/>

<style>
  .mascot {
    display: block;
    width: auto;
    height: var(--size);
    user-select: none;
    transform-origin: 50% 100%;
    transition: transform 0.3s ease;
  }
  .mascot:hover {
    transform: rotate(-2deg) translateY(-3px);
  }
  @media (prefers-reduced-motion: reduce) {
    .mascot {
      transition: none;
    }
    .mascot:hover {
      transform: none;
    }
  }
</style>
