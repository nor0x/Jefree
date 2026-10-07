<script lang="ts">
  interface Props {
    vector: Float32Array
    columns?: number
  }
  let { vector, columns = 64 }: Props = $props()

  let canvas: HTMLCanvasElement
  let hover = $state<{ index: number; value: number } | null>(null)

  const rows = $derived(Math.ceil(vector.length / columns))
  const maxAbs = $derived(vector.reduce((m, x) => Math.max(m, Math.abs(x)), 0) || 1)

  function rgb(name: string) {
    const value = getComputedStyle(canvas).getPropertyValue(name).trim()
    const m = value.match(/^#([0-9a-f]{6})$/i)
    const hex = m ? parseInt(m[1], 16) : 0x888888
    return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255]
  }

  $effect(() => {
    const ctx = canvas.getContext('2d')!
    canvas.width = columns
    canvas.height = rows
    const [neg, mid, pos] = ['--heat-neg', '--heat-mid', '--heat-pos'].map(rgb)
    const image = ctx.createImageData(columns, rows)
    for (let i = 0; i < columns * rows; i++) {
      const o = i * 4
      if (i >= vector.length) continue
      // Signed square-root scale so small components stay visible.
      const t = Math.sqrt(Math.abs(vector[i]) / maxAbs)
      const end = vector[i] < 0 ? neg : pos
      for (let c = 0; c < 3; c++) image.data[o + c] = mid[c] + (end[c] - mid[c]) * t
      image.data[o + 3] = 255
    }
    ctx.putImageData(image, 0, 0)
  })

  function onMove(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect()
    const col = Math.floor(((event.clientX - rect.left) / rect.width) * columns)
    const row = Math.floor(((event.clientY - rect.top) / rect.height) * rows)
    const index = row * columns + col
    hover = index >= 0 && index < vector.length ? { index, value: vector[index] } : null
  }
</script>

<div class="heatmap">
  <canvas
    bind:this={canvas}
    style:aspect-ratio="{columns} / {rows}"
    onpointermove={onMove}
    onpointerleave={() => (hover = null)}
    aria-label="Heatmap of {vector.length} embedding values"
  ></canvas>
  <div class="legend small muted">
    {#if hover}
      dim <strong>{hover.index}</strong> = {hover.value.toFixed(5)}
    {:else}
      <span class="swatch neg"></span>−{maxAbs.toFixed(3)}
      <span class="swatch pos"></span>+{maxAbs.toFixed(3)}
      <span class="hint">hover for values</span>
    {/if}
  </div>
</div>

<style>
  canvas {
    display: block;
    width: 100%;
    image-rendering: pixelated;
    border-radius: 6px;
    cursor: crosshair;
  }
  .legend {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 6px;
    min-height: 1.2em;
    font-variant-numeric: tabular-nums;
  }
  .swatch {
    width: 10px;
    height: 10px;
    border-radius: 2px;
  }
  .swatch.neg {
    background: var(--heat-neg);
  }
  .swatch.pos {
    background: var(--heat-pos);
    margin-left: 8px;
  }
  .hint {
    margin-left: auto;
  }
</style>
