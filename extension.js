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

const BAT_STATUS = "/sys/class/power_supply/BAT0/status";
const POWER_NOW = "/sys/class/power_supply/BAT0/power_now";


/** Indicator
 */

var TPIndicator = GObject.registerClass(
    {
        GTypeName: 'TPIndicator',
    },
    class TPIndicator extends BaseIndicator {
        _init() {
            super._init();

            this.settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.tp_wattmeter');

            // to detect changes FIXME: a better way?
            this.last_period_val = this.settings.get_double('period-sec');

            this.readings = [];
            this.last_value = 0.0;
            this.tm_measure = null;
        }

        _getBatteryStatus() {
            const pct = this._proxy.Percentage.toFixed(0);
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
            this._percentageLabel.clutter_text.set_text(this._getBatteryStatus());
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

            const period_now = this.settings.get_double('period-sec');
            if (period_now.toFixed(1) != this.last_period_val.toFixed(1)) {
                // period changed, re-spawn
                this._spawn();
                this.last_period_val = period_now;
            };

            const avg_of = this.settings.get_int('avg-of');
            if (this.readings.length >= avg_of) {
                this.last_value = this.readings.reduce((acc, elem) => acc + elem, 0.0) / this.readings.length; // simple mean
                this._sync(); // update battery widget now!
                this.readings.length = 0;  // fastest way to clear array?
            } 
            return true;
        }

        _spawn() {
            if (this.tm_measure !== null) {
                GLib.source_remove(this.tm_measure);
            }
            this.tm_measure = GLib.timeout_add(
                GLib.PRIORITY_DEFAULT,
                this.settings.get_double('period-sec') * 1000,
                Lang.bind(this, this._measure)
            );
        }

        _stop() {
            GLib.source_remove(this.tm_measure);
        }
    }
);


/** Extension
 */

class TPWattMeter {
    constructor() {
        this.customIndicator = new TPIndicator();
        this.customIndicator._spawn();

        this.aggregateMenu = Panel.statusArea['aggregateMenu'];
        this.originalIndicator = this.aggregateMenu._power;
        this.aggregateMenu._indicators.replace_child(this.originalIndicator, this.customIndicator);
    }

    destroy(arg) {
        this.customIndicator._stop();
        this.aggregateMenu._indicators.replace_child(this.customIndicator, this.originalIndicator);
        this.customIndicator = null;
    }
}


/** Init
 */

let tp_wattmeter;


function enable() {
    tp_wattmeter = new TPWattMeter();
}

function disable() {
    tp_wattmeter.destroy();
    tp_wattmeter = null;
}
