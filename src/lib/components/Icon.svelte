<script lang="ts" module>
  // 24×24 stroke icons, drawn with currentColor.
  const PATHS = {
    text: 'M4 6h16M4 12h16M4 18h10',
    image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15.5 9.5h.01',
    audio: 'M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2',
    video: 'M3 6h13v12H3zM16 10l5-3v10l-5-3',
    mic: 'M9 4a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0zM5 11a7 7 0 0 0 14 0M12 18v3',
    stop: 'M7 7h10v10H7z',
    clip: 'M20 11.5l-8.2 8.2a5 5 0 0 1-7-7L13 4.5a3.3 3.3 0 0 1 4.7 4.7l-8 8a1.7 1.7 0 0 1-2.4-2.4L14.5 7.6',
    close: 'M6 6l12 12M18 6L6 18',
    plus: 'M12 5v14M5 12h14',
    sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
    moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z',
    system: 'M3 5h18v11H3zM8 20h8M12 16v4',
    arrow: 'M5 12h14M13 6l6 6-6 6',
    back: 'M19 12H5M11 6l-6 6 6 6',
    copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
    check: 'M5 12.5l4.5 4.5L19 7',
    upload: 'M12 16V4M7 9l5-5 5 5M4 20h16',
  } as const

  export type IconName = keyof typeof PATHS
</script>

<script lang="ts">
  interface Props {
    name: IconName
    size?: number
  }
  let { name, size = 16 }: Props = $props()
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.6"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  <path d={PATHS[name]} />
</svg>

<style>
  svg {
    flex: none;
    display: block;
  }
</style>
