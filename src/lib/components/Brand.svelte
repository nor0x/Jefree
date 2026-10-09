<script lang="ts">
  import { theme } from '../theme.svelte'
</script>

<a class="brand" href="./" aria-label="Jevfree, home">
  <img class="icon" src={`${import.meta.env.BASE_URL}icon_${theme.dark ? 'dark' : 'light'}.png`} alt="" width="350" height="350" draggable="false" />
  <span>Jevfree<span class="period">.</span></span>
</a>

<style>
  .brand {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-family: var(--serif);
    font-optical-sizing: auto;
    font-size: 1.4rem;
    font-style: italic;
    font-weight: 500;
    line-height: 1;
    letter-spacing: -0.02em;
    text-decoration: none;
  }
  .icon {
    width: auto;
    height: 1.6rem;
    transform-origin: 20% 90%;
    transition: transform 0.2s;
  }
  .brand:hover .icon {
    transform: translateY(-2px) rotate(-6deg);
  }
  .period {
    color: var(--accent-ink);
    transition: color 0.15s;
  }
  .brand:hover .period {
    color: var(--accent);
  }
  @media (prefers-reduced-motion: reduce) {
    .icon {
      transition: none;
    }
    .brand:hover .icon {
      transform: none;
    }
  }
</style>
