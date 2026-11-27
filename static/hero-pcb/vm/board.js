/*
 * board.js: the jsnerves board, the hardware around the emulated machine.
 * nerves.cfg gives the machine a GPIO controller and an I2C adapter
 * (gpio0, i2c0), and the firmware (WebDemoNerves.Board) drives them:
 *
 *   LEDs     power   red: the machine has power (not a GPIO)
 *            ready   green: the system is up (LED_READY)
 *            slotA   firmware slot A runs (LED_SLOT_A)
 *            slotB   firmware slot B runs (LED_SLOT_B)
 *   buttons  BUTTON_1, BUTTON_2, BUTTON_3 (1 while pressed)
 *   sensors  fps     I2C 0x10: the frames per second the page renders
 *
 *   const board = NervesBoard.attach(vm);
 *   board.addEventListener("led", (e) => show(e.detail.led, e.detail.on));
 *   board.leds                  {power, ready, slotA, slotB}: true if lit
 *   board.button("BUTTON_1", true) / board.press("BUTTON_1")
 *   board.fps.set(59.8)         report this rate instead of measuring it;
 *   board.fps.measure()         back to measuring this page's frame rate
 *
 * Events (CustomEvents on the board): led {led, on}, button {name,
 * pressed}.
 */
"use strict";

(function(global) {

const LEDS = { ready: "LED_READY", slotA: "LED_SLOT_A", slotB: "LED_SLOT_B" };
const BUTTONS = ["BUTTON_1", "BUTTON_2", "BUTTON_3"];

/* The FPS sensor at I2C address 0x10: register 0 is an ID (0x46, "F"),
   registers 1-2 the rate in hundredths of a frame per second, big-endian. */
const FPS_ADDRESS = 0x10;
const FPS_ID = 0x46;

class FPSSensor {
    constructor() {
        this.registers = new NervesVM.I2CRegisters(16);
        this.registers.set(0, FPS_ID);
        this.value = 0;          /* frames per second it reports */
        this.manual = false;     /* set() rather than measured */
        this._frames = [];
        this._raf = null;
        this.measure();
    }

    /* report this rate (frames per second) from now on */
    set(fps) {
        this.manual = true;
        this._stop();
        this.value = fps;
    }

    /* report the rate this page renders at (requestAnimationFrame) */
    measure() {
        const self = this;
        this.manual = false;
        if (this._raf !== null || typeof requestAnimationFrame == "undefined")
            return;
        function frame(t) {
            const f = self._frames;
            f.push(t);
            while (f.length > 2 && t - f[0] > 1000)
                f.shift();
            if (f.length > 1)
                self.value = 1000 * (f.length - 1) / (t - f[0]);
            self._raf = requestAnimationFrame(frame);
        }
        this._raf = requestAnimationFrame(frame);
    }

    _stop() {
        if (this._raf !== null)
            cancelAnimationFrame(this._raf);
        this._raf = null;
        this._frames = [];
    }

    /* the I2C side (see NervesVM.attachI2C) */
    write(bytes) {
        this.registers.write(bytes);
    }

    read(length) {
        const centi = Math.max(0, Math.min(65535, Math.round(this.value * 100)));
        this.registers.set(1, centi, 2);
        return this.registers.read(length);
    }
}

class Board extends EventTarget {
    constructor(vm) {
        super();
        const board = this;
        this.vm = vm;
        this.leds = { power: vm.powered, ready: false, slotA: false, slotB: false };
        this.buttons = {};
        BUTTONS.forEach(function(name) { board.buttons[name] = false; });
        this.fps = new FPSSensor();
        vm.attachI2C(FPS_ADDRESS, this.fps);

        vm.addEventListener("power", function(e) {
            board._setLed("power", e.detail.on);
        });
        vm.addEventListener("gpio", function(e) {
            const l = e.detail;
            for (const led in LEDS) {
                if (LEDS[led] === l.name)
                    board._setLed(led, l.on);
            }
        });
        vm.gpio.forEach(function(l) {
            for (const led in LEDS) {
                if (l && LEDS[led] === l.name)
                    board.leds[led] = l.on;
            }
        });
    }

    /* hold a button down (true) or let it go */
    button(name, pressed) {
        if (!(name in this.buttons))
            throw new Error("NervesBoard: no button " + name);
        if (this.buttons[name] === !!pressed)
            return;
        this.buttons[name] = !!pressed;
        this.vm.setInput(name, pressed ? 1 : 0);
        this.dispatchEvent(new CustomEvent("button", { detail: { name: name, pressed: !!pressed } }));
    }

    /* press and release it */
    press(name, ms) {
        const board = this;
        this.button(name, true);
        return new Promise(function(resolve) {
            setTimeout(function() {
                board.button(name, false);
                resolve();
            }, ms === undefined ? 150 : ms);
        });
    }

    _setLed(led, on) {
        if (this.leds[led] === on)
            return;
        this.leds[led] = on;
        this.dispatchEvent(new CustomEvent("led", { detail: { led: led, on: on } }));
    }
}

global.NervesBoard = {
    attach: function(vm) { return new Board(vm); },
    LEDS: Object.assign({ power: null }, LEDS),
    BUTTONS: BUTTONS,
    FPS_ADDRESS: FPS_ADDRESS,
    FPSSensor: FPSSensor,
};

})(window);
