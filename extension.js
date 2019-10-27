const Lang = imports.lang;
const UPower = imports.gi.UPowerGlib;
const BaseIndicator = imports.ui.status.power.Indicator;
const ExtensionUtils = imports.misc.extensionUtils;
const Panel = imports.ui.main.panel;
const Shell = imports.gi.Shell;
const GObject = imports.gi.GObject;
const GLib = imports.gi.GLib;
const Config = imports.misc.config;


/** Settings
 */

const HISTORY_DEPTH = 5;
const MEASURE_PERIOD = 1000;
const FORCE_SYNC_PERIOD = 5000;

const BAT_STATUS = "/sys/class/power_supply/BAT0/status";
const POWER_NOW = "/sys/class/power_supply/BAT0/power_now";


/** Indicator
 */

var TPIndicator = class extends BaseIndicator {
    constructor() {
        super();

        this.readings = [];
        this.last_value = 0.0;
        this.tm_measure = null;
        this.tm_force_sync = null;
    }

    _getBatteryStatus() {
        const pct = this._proxy.Percentage;
        const power = this.last_value.toFixed(1);
        const status = this._read_file(BAT_STATUS, '???');

        let sign = ' ';
        if (status == 'Charging') {
            sign = '+';
        } else if (status == 'Discharging') {
            sign = '-';
        }

        return _("%s%% %s%sW").format(pct, sign, power);
    }

    _sync() {
        super._sync();
        const new_text = '<span size="smaller">' + this._getBatteryStatus() + '</span>';
        this._percentageLabel.clutter_text.set_markup(new_text);
        return true;
    }

    _read_file(filePath, defaultValue) {
        try {
            return Shell.get_file_contents_utf8_sync(filePath).trim();
        } catch (e) {
            log(`Cannot read file ${filePath}`, e);
        }
        return defaultValue;
    }

    _measure() {
        const power = parseFloat(this._read_file(POWER_NOW), 0) / 1000000;
        this.readings.push(power)

        if (this.readings.length >= HISTORY_DEPTH) {
            let avg = this.readings.reduce((acc, elem) => acc + elem, 0.0) / this.readings.length;
            this.last_value = avg;

            while (this.readings.length) { this.readings.pop(); };
            this.readings.push(avg);
        }
        return true;
    }

    _force_sync() {
        this._sync();
        return true;
    }

    _spawn() {
        this.tm_measure = GLib.timeout_add(
            GLib.PRIORITY_DEFAULT,
            MEASURE_PERIOD,
            Lang.bind(this, this._measure));
        this.tm_force_sync = GLib.timeout_add(
            GLib.PRIORITY_DEFAULT,
            FORCE_SYNC_PERIOD,
            Lang.bind(this, this._force_sync));
    }

    _stop() {
        GLib.source_remove(this.tm_measure);
        GLib.source_remove(this.tm_force_sync);
    }
}


/** Extension
 */

class TPWattMeter {
    constructor() {
        this.customIndicator = new TPIndicator();
        this.customIndicator._spawn();

        this.aggregateMenu = Panel.statusArea['aggregateMenu'];
        this.originalIndicator = this.aggregateMenu._power;
        this.aggregateMenu._indicators.replace_child(this.originalIndicator.indicators, this.customIndicator.indicators);
    }

    destroy(arg) {
        this.customIndicator._stop();
        this.aggregateMenu._indicators.replace_child(this.customIndicator.indicators, this.originalIndicator.indicators);
        this.customIndicator = null;
    }
}


/** Init
 */

let tp_wattmeter;


function enable() {
    tp_wattmeter = new TPWattMeter(); //tp_reader, tp_indicator);
}

function disable() {
    tp_wattmeter.destroy();
    tp_wattmeter = null;
}
