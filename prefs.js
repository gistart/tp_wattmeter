'use strict';

const { Adw, Gio, Gtk } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();


function init() {
}

function fillPreferencesWindow(window) {
    const settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.tp_wattmeter');

    const page = new Adw.PreferencesPage();
    const group = new Adw.PreferencesGroup();
    page.add(group);

    // history depth
    const avg_row = new Adw.ActionRow({ title: 'Show average of this many measurements' });
    group.add(avg_row);

    const avg_spin = new Gtk.SpinButton({
        climb_rate: 1,
        digits: 0,
        adjustment: new Gtk.Adjustment({
            value: settings.get_uint('avg-of'),
            lower: 1,
            upper: 25,
            step_increment: 1,
        }),
    });
    settings.bind(
        'avg-of',
        avg_spin,
        'value',
        Gio.SettingsBindFlags.DEFAULT
    );
    avg_row.add_suffix(avg_spin);
    avg_row.activatable_widget = avg_spin;

    // measure period
    const period_row = new Adw.ActionRow({ title: 'Period between measurements in seconds' });
    group.add(period_row);

    const period_spin = new Gtk.SpinButton({
        climb_rate: 1,
        digits: 1,
        adjustment: new Gtk.Adjustment({
            value: settings.get_double('period-sec'),
            lower: 0.1,
            upper: 10.0,
            step_increment: 0.5,
        }),
    });
    settings.bind(
        'period-sec',
        period_spin,
        'value',
        Gio.SettingsBindFlags.DEFAULT
    );
    period_row.add_suffix(period_spin);
    period_row.activatable_widget = period_spin;

    // done
    window.add(page);
}
