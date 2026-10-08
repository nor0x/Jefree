import { mount } from 'svelte'
import './fonts'
import './app.css'
import Playground from './Playground.svelte'

const app = mount(Playground, {
  target: document.getElementById('app')!,
})

export default app
