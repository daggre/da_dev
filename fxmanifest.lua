--- Copyright © 2024 Joshua Nelson

fx_version 'cerulean'
games {'rdr3'}
rdr3_warning 'I acknowledge that this is a prerelease build of RedM, and I am aware my resources *will* become incompatible once RedM ships.'

author 'daggre_actual'
description 'Development Kit for RedM'
version '0.0.1'
lua54 'yes'
-- this_is_a_map "yes"

shared_scripts {
    "imports.lua", -- Load imports first
}

server_scripts {
    -- "db/convert.lua",
    "cmd/server.lua",
}

client_scripts {
    "util/bounding_box.lua",
    "util/raycast.lua",
    "dat/setup.lua", -- Load globals into namespace
    "dat/animations.lua",
    "dat/objects.lua",
    "dat/peds.lua",
    "dat/pickups.lua",
    "dat/propsets.lua",
    "dat/vehicles.lua",
    "dat/af_flags.lua",
    "dat/aik_flags.lua",
    "control/controls.lua",
    "ui/tree.lua",
    "root.lua",
    "control/disco_keys.lua",
    "teleport/teleport.lua",
    "entity/kinematics.lua",
    "env.lua",
    -- "entity/fx.lua",
    "ui/ui.lua",
    "ui/map.lua",
    "mode/animation.lua",
    "mode/freecam.lua",
    "mode/gizmo.lua",
    "mode/object.lua",
    "mode/devtree.lua",
}

files {
    'ui/web/index.html',
    'ui/web/script.js',
    'ui/web/style.css',
    'ui/web/assets/index.js',
    'ui/web/assets/index.css',
    'ui/web/assets/LiterationMonoNerd.ttf',
}

ui_page {
    'ui/web/index.html',
}


dependencies {
    'da_lib',
}
