#!/bin/bash

# compile schema
glib-compile-schemas schemas/

# pack extension
zip -r tp_wattmeter.zip \
            extension.js \
            prefs.js \
            metadata.json \
            schemas/gschemas.compiled \
            schemas/org.gnome.shell.extensions.tp_wattmeter.gschema.xml

# install extension
gnome-extensions install ./tp_wattmeter.zip --force

# test settings
# gnome-extensions prefs tp_wattmeter@gistart
