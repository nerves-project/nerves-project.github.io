// The hero's live demo: Nerves running in the page, on the board in the picture.
//
// "Try Me" on the board (pcb-hero.js) opens a panel over the hero's left side. While the
// firmware downloads it shows a progress bar; then a terminal opens there, at the IEx prompt of
// a machine restored from a snapshot. Meanwhile the board's plates smack together and it turns
// top down: its buttons press GPIO lines of the machine, its LEDs follow them and its
// temperature sensor answers on I2C.
//
// The machine is jsnerves (vm/, copied by tools/pcb-hero/sync_jsnerves.sh): TinyEMU compiled to
// WebAssembly, emulating a RISC-V board that boots a Nerves firmware. Nothing of it loads until
// the sign is clicked.
//
// Usage:
//   import { mountNervesDemo } from './nerves-demo.js';
//   mountNervesDemo({ hero, host, copy });
// hero: what mountPcbHero returned; host: the element the panel covers the left of (it gets
// position: relative if it is static); copy: what the panel replaces on narrow screens.
// Options: vmUrl (where vm/ is), autoAttachLog (default true: the log is attached to the console,
// so button presses show).

const VM_URL = new URL('./vm/', import.meta.url);

// what the firmware calls the board's lines (vm/board.js), by the hero's names for its parts
const LEDS = ['power', 'ready', 'slotA', 'slotB'];

// The TMP103 on the starter kit: I2C 0x70, register 0 is the temperature in whole degrees
// Celsius, two's complement.
const TMP103_ADDRESS = 0x70;

const HINTS = [
  { label: 'Read the temperature', run: 'with {:ok, bus} <- Circuits.I2C.open("i2c-0"), {:ok, <<t::signed>>} <- Circuits.I2C.write_read(bus, 0x70, <<0>>, 1), do: t' },
  { label: 'Frame rate sensor', run: 'WebDemoNerves.Board.fps()' },
  { label: 'Firmware slots', run: 'Nerves.Runtime.KV.get_all()' },
  { label: 'Reboot', run: 'Nerves.Runtime.reboot()' },
];

const MONO_ADVANCE = 0.62;   // a monospace cell is about this wide, in em (measured after layout)

function bytes(n) {
  return n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;
}
function seconds(s) {
  return s < 10 ? `${s.toFixed(1)} s` : s < 90 ? `${Math.round(s)} s` : `${Math.round(s / 60)} min`;
}
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    el.onload = resolve;
    el.onerror = () => reject(new Error(`could not load ${src}`));
    document.head.appendChild(el);
  });
}
const h = (tag, cls, text) => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text !== undefined) el.textContent = text;
  return el;
};

export function mountNervesDemo({ hero, host, copy, vmUrl = VM_URL, autoAttachLog = true } = {}) {
  if (!hero || !host) return null;
  const base = new URL(vmUrl, document.baseURI);
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
  host.classList.add('nerves-demo-host');
  copy?.classList.add('nerves-demo-copy');

  // --- the panel
  const panel = h('section', 'nerves-demo');
  panel.setAttribute('aria-label', 'Live Nerves demo');
  panel.hidden = true;
  const bar = h('div', 'nerves-demo__bar');
  const title = h('span', 'nerves-demo__title', 'Nerves, running in your browser');
  const close = h('button', 'nerves-demo__close', '×');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close the demo');
  bar.append(title, close);

  const loader = h('div', 'nerves-demo__loader');
  loader.setAttribute('role', 'status');
  const loaderText = h('p', 'nerves-demo__loader-text', 'Fetching a Nerves device…');
  const track = h('div', 'nerves-demo__track');
  const fill = h('div', 'nerves-demo__fill');
  track.append(fill);
  const loaderDetail = h('p', 'nerves-demo__loader-detail', 'loading the emulator');
  loader.append(loaderText, track, loaderDetail);

  const screen = h('div', 'nerves-demo__screen');
  screen.hidden = true;
  const termBox = h('div', 'nerves-demo__term');
  const input = h('textarea', 'nerves-demo__input');
  Object.assign(input, { rows: 1, autocomplete: 'off', autocapitalize: 'off', spellcheck: false });
  input.setAttribute('autocorrect', 'off');
  input.setAttribute('aria-label', 'Terminal input');
  screen.append(termBox, input);

  const hints = h('div', 'nerves-demo__hints');
  hints.hidden = true;
  hints.append(h('span', 'nerves-demo__hints-label', 'Try'));
  const foot = h('p', 'nerves-demo__foot');
  // without the 3D board: its lights and buttons as a strip under the terminal
  const strip = h('div', 'nerves-demo__strip');
  strip.hidden = true;
  panel.append(bar, loader, screen, strip, hints, foot);
  host.append(panel);

  const state = { open: false, started: false, running: false, vm: null, board: null, term: null, status: '', disk: '' };
  const showFoot = () => { foot.textContent = [state.status, state.disk].filter(Boolean).join(' · '); };

  // how much of the hero's own element the panel covers, for the board to keep clear of
  function inset() {
    if (!state.open || !hero.el) return 0;
    const p = panel.getBoundingClientRect(), s = hero.el.getBoundingClientRect();
    // beside the board (wide screens) it covers its left; stacked above it, nothing
    if (p.bottom <= s.top + 1 || p.top >= s.bottom - 1) return 0;
    return Math.max(0, p.right - s.left + 12);
  }
  const place = () => { hero.demoInset = inset(); };
  new ResizeObserver(() => { place(); fit(); }).observe(panel);
  addEventListener('resize', () => { place(); fit(); });

  function open() {
    if (state.open) return;
    state.open = true;
    panel.hidden = false;
    host.classList.add('is-demo-open');
    // next frame, so the panel's opening transition runs
    requestAnimationFrame(() => { panel.classList.add('is-open'); place(); });
    place();
    hero.setDemo(true);
    if (!state.started) start();
    else focus();
  }
  function shut() {
    if (!state.open) return;
    state.open = false;
    panel.classList.remove('is-open');
    host.classList.remove('is-demo-open');
    panel.hidden = true;
    hero.demoInset = 0;
    hero.setDemo(false);
  }
  close.addEventListener('click', shut);
  hero.onTry = open;

  // --- the terminal: sized to the panel when it is created, its font scaled to fit afterwards
  let cols = 80, rows = 24;
  function measure() {
    const narrow = matchMedia('(max-width: 860px)').matches;
    const w = panel.clientWidth - 24;
    const font = narrow ? 11 : 13;
    cols = Math.max(40, Math.min(80, Math.floor((w - 16) / (font * MONO_ADVANCE))));
    const room = narrow ? Math.min(innerHeight * 0.4, 300) : Math.min(host.clientHeight - 150, 560);
    rows = Math.max(9, Math.min(30, Math.floor(room / (font * 1.2))));
  }
  function fit() {
    const el = state.term?.term_el;
    if (!el || screen.hidden) return;
    const avail = screen.clientWidth;
    let size = parseFloat(el.style.fontSize) || 13;
    for (let i = 0; i < 3; i++) {
      const w = el.getBoundingClientRect().width;
      if (!w || !avail) return;
      const next = Math.max(7, Math.min(15, Math.floor(size * (avail / w) * 10) / 10));
      if (Math.abs(next - size) < 0.1) break;
      size = next;
      el.style.fontSize = `${size}px`;
    }
  }
  const focus = () => { if (!screen.hidden && document.activeElement !== input) input.focus({ preventScroll: true }); };
  const typing = () => state.open && panel.contains(document.activeElement);

  // term.js listens for keys on the whole document: let them through only while the terminal
  // has the focus, so the rest of the page keeps its keyboard
  function gateKeys() {
    const gate = (e) => { if (!typing() || e.target.closest?.('button')) e.stopImmediatePropagation(); };
    for (const type of ['keydown', 'keyup', 'keypress']) document.addEventListener(type, gate, true);
    addEventListener('paste', (e) => { if (!typing()) e.stopImmediatePropagation(); });
  }

  // phones deliver text through "input" events on a focused field, which term.js does not
  // listen for: turn changes of the hidden textarea into terminal input (after jsnerves' page.js)
  function softKeyboard(term) {
    let prev = '';
    const send = (str) => { term.show_cursor(); term.handler(term.utf8 ? term.to_utf8(str) : str); };
    input.addEventListener('input', () => {
      let cur = input.value;
      const nl = cur.indexOf('\n');
      if (nl >= 0) cur = cur.replace(/\n/g, '');
      let i = 0;
      const n = Math.min(prev.length, cur.length);
      while (i < n && prev.charCodeAt(i) === cur.charCodeAt(i)) i++;
      if (prev.length > i) send('\x7f'.repeat(prev.length - i));
      if (cur.length > i) send(cur.substring(i));
      if (nl >= 0) { send('\r'); prev = ''; input.value = ''; } else prev = cur;
    });
    input.addEventListener('compositionend', () => { if (input.value.length > 64) { input.value = ''; prev = ''; } });
    screen.addEventListener('click', focus);
  }

  // Type a command and enter it. The enter follows a moment later: IEx draws a line twice when
  // both arrive at once.
  function run(command) {
    state.vm.write(command);
    setTimeout(() => state.vm.write('\r'), 80);
  }

  function reveal() {
    if (!screen.hidden) return;
    loader.hidden = true;
    screen.hidden = false;
    hints.hidden = false;
    panel.classList.add('is-running');
    fit();
    place();
    focus();
  }

  function fail(message) {
    loaderText.textContent = 'The demo could not start';
    loaderDetail.textContent = message;
    panel.classList.add('is-failed');
    state.status = `error: ${message}`;
    showFoot();
  }

  async function start() {
    state.started = true;
    measure();
    try {
      for (const f of ['term.js', 'nerves-vm.js', 'board.js']) await loadScript(new URL(f, base).href);
    } catch (e) { fail(e.message); return; }
    const { NervesVM, NervesBoard, Term } = window;

    const vm = state.vm = new NervesVM({
      config: new URL('nerves.cfg', base).href,
      emulator: new URL('riscvemu64-wasm.js', base).href,
      cols, rows,
    });
    const board = state.board = NervesBoard.attach(vm);
    window.nervesVM = vm;          // for the browser console
    window.nervesBoard = board;

    // the temperature sensor by the thermal slot: the slider on the board sets what it reads
    const tmp = new NervesVM.I2CRegisters(4);
    const setTemp = (c) => tmp.set(0, Math.round(c) & 0xff);
    setTemp(hero.sensorValue?.() ?? 23);
    hero.onSensor = setTemp;
    vm.attachI2C(TMP103_ADDRESS, tmp);

    // lights and buttons
    for (const led of LEDS) hero.setLed(led, !!board.leds[led]);
    board.addEventListener('led', (e) => hero.setLed(e.detail.led, e.detail.on));
    hero.onButton = (name, pressed) => { if (state.running) board.button(name, pressed); };
    if (hero.fallback) flatBoard(board);

    gateKeys();
    const term = state.term = new Term(cols, rows, (str) => vm.write(str), 5000);
    term.open(termBox, input);
    term.term_el.style.fontSize = '13px';
    softKeyboard(term);
    vm.addEventListener('console', (e) => term.write(e.detail.data));

    vm.addEventListener('download', (e) => {
      const p = e.detail;
      fill.style.width = `${p.percent.toFixed(1)}%`;
      track.setAttribute('aria-valuenow', Math.floor(p.percent));
      let text = `${bytes(p.loaded)} of ${bytes(p.total)}`;
      if (!p.done && p.secondsLeft !== null) text += ` · ${seconds(p.secondsLeft)} left`;
      loaderDetail.textContent = p.done ? `${bytes(p.total)} in ${seconds(p.elapsed)}` : text;
    });
    vm.addEventListener('snapshot', (e) => {
      if (e.detail.phase === 'error') loaderDetail.textContent = 'no snapshot, booting instead';
    });
    vm.addEventListener('stage', (e) => {
      const s = e.detail;
      if (s.stage === 'downloading' || s.stage === 'loading') return;
      if (s.stage === 'restoring') { loaderText.textContent = 'Waking it up…'; return; }
      state.running = true;
      reveal();
      state.status = s.stage === 'ready'
        ? (s.restored ? 'restored from a snapshot, already booted' : `booted in ${seconds(s.sinceBoot / 1000)}`)
        : s.stage === 'reset' ? 'rebooting' : s.stage === 'off' ? 'powered off: reload the page to boot it again' : `booting: ${s.label}`;
      showFoot();
      // with the log on the console a button press shows as soon as it happens
      if (s.stage === 'ready' && autoAttachLog) setTimeout(() => run('RingLogger.attach()'), 150);
    });
    vm.addEventListener('disk', (e) => {
      state.disk = e.detail.status === 'on' ? 'what it writes to disk stays in this browser' : '';
      showFoot();
    });
    vm.addEventListener('poweroff', () => term.write('\r\n\x1b[1m[ The machine is off. Reload the page to boot it again. ]\x1b[0m\r\n'));
    vm.addEventListener('error', (e) => fail(e.detail.message));

    for (const hint of HINTS) {
      const b = h('button', 'nerves-demo__hint', hint.label);
      b.type = 'button';
      b.title = hint.run;
      b.addEventListener('pointerdown', (e) => e.preventDefault());   // the terminal keeps the focus
      b.addEventListener('click', () => { if (state.running) { run(hint.run); focus(); } });
      hints.append(b);
    }

    try { await vm.start(); } catch (e) { fail(e.message || String(e)); }
  }

  // The board without WebGPU: LEDs and buttons in a row.
  function flatBoard(board) {
    strip.hidden = false;
    const names = { power: 'PWR', ready: 'RDY', slotA: 'A', slotB: 'B' };
    const dots = {};
    for (const led of LEDS) {
      const el = h('span', `nerves-demo__led is-${led}`, names[led]);
      el.classList.toggle('is-on', !!board.leds[led]);
      strip.append(el);
      dots[led] = el;
    }
    board.addEventListener('led', (e) => dots[e.detail.led]?.classList.toggle('is-on', e.detail.on));
    for (const b of hero.demo?.buttons || []) {
      const el = h('button', 'nerves-demo__key', b.label);
      el.type = 'button';
      el.setAttribute('aria-label', `Button ${b.label}`);
      const set = (down) => (e) => { e.preventDefault(); if (state.running) board.button(b.name, down); el.classList.toggle('is-down', down); };
      el.addEventListener('pointerdown', set(true));
      for (const t of ['pointerup', 'pointerleave', 'pointercancel']) el.addEventListener(t, set(false));
      strip.append(el);
    }
  }

  return { open, close: shut, panel, get vm() { return state.vm; }, get board() { return state.board; } };
}
