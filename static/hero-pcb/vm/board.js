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
 *   updates  the firmware tells the page what it runs through a mailbox
 *            on I2C (0x51): board.firmware is {active, a, b, valid}, the
 *            slot that runs, the version in each and whether what runs is
 *            validated (it can be updated only then), once it has said so
 *            (when it starts, and again when it is validated; a machine
 *            restored from a snapshot has not).
 *            await board.sendUpdate(bytes) puts a .fw file into the disk's
 *            scratch area, for WebDemoNerves.Update.install() to apply;
 *            board.update is how that goes: "applying", "ok", "failed".
 *
 * Events (CustomEvents on the board): led {led, on}, button {name,
 * pressed}, firmware {active, a, b, valid}, update {status}.
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

/* The mailbox at I2C address 0x51: the firmware writes a register number
   and a line of text. Register 0 is what runs ("active=a a=1.2.2 b= valid=1"),
   register 1 how an update goes. */
const MAILBOX_ADDRESS = 0x51;

/* The scratch area for firmware updates: the last 8 MB of the disk (see
   extract_firmware.sh), "NFWU", the file's size (32 bits, big-endian) and
   the file. */
const SCRATCH_BYTES = 8 * 1024 * 1024;

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
        this.firmware = null;    /* {active, a, b} once the firmware said so */
        this.update = null;      /* "applying", "ok" or "failed" */
        vm.attachI2C(MAILBOX_ADDRESS, {
            write: function(bytes) { board._mail(bytes); },
            read: function(length) { return new Uint8Array(length); },
        });

        /* a reboot: the firmware that starts says what it is */
        vm.addEventListener("reset", function() {
            board.firmware = null;
            board.update = null;
        });
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

    /* Put a firmware file (a Uint8Array) where WebDemoNerves.Update.install()
       looks for it. */
    async sendUpdate(bytes) {
        const data = new Uint8Array(8 + bytes.length);
        if (data.length > SCRATCH_BYTES)
            throw new Error("NervesBoard: the update is larger than the scratch area");
        if (!this.vm.diskBytes)
            throw new Error("NervesBoard: no disk yet");
        data.set([0x4e, 0x46, 0x57, 0x55]);    /* "NFWU" */
        new DataView(data.buffer).setUint32(4, bytes.length);
        data.set(bytes, 8);
        await this.vm.writeDisk(this.vm.diskBytes - SCRATCH_BYTES, data);
    }

    _mail(bytes) {
        const text = new TextDecoder().decode(Uint8Array.from(bytes).subarray(1)).trim();
        let m;
        if (bytes[0] === 0) {
            m = /^active=(\w*) a=(\S*) b=(\S*) valid=(\d)$/.exec(text);
            if (!m)
                return;
            this.firmware = { active: m[1], a: m[2] || null, b: m[3] || null,
                              valid: m[4] == "1" };
            this.dispatchEvent(new CustomEvent("firmware", { detail: this.firmware }));
        } else if (bytes[0] === 1) {
            this.update = text;
            this.dispatchEvent(new CustomEvent("update", { detail: { status: text } }));
        }
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
