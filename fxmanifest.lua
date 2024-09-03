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
    "ui/tree.lua",
    "root.lua",
    "control/disco_keys.lua",
    "src/kinematics_cl.lua",
    "env.lua",
    -- "src/fx_cl.lua",
    "ui/ui.lua",
    "ui/map.lua",
    "mode/freecam.lua",
    "mode/gizmo.lua",
    "mode/object.lua",
    "src/mode_cl.lua",
    "src/teleport_cl.lua",
    "src/ped_cl.lua",
    "src/debug_cl.lua",
    "cmd/client.lua",

    -- Testing
    "test/test_debug.lua",
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
