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
    "src/cmd_srv.lua",
}

client_scripts {
    "util/bounding_box.lua",
    "util/raycast.lua",
    "ui/tree.lua",
    "root.lua",
    "src/keys_cl.lua",
    "src/kinematics_cl.lua",
    "env.lua",
    -- "src/fx_cl.lua",
    "ui/ui.lua",
    "ui/map.lua",
    "src/mode_freecam_cl.lua",
    "src/mode_gizmo_cl.lua",
    "src/mode_object_cl.lua",
    "src/mode_cl.lua",
    "src/teleport_cl.lua",
    "src/ped_cl.lua",
    "src/debug_cl.lua",
    "src/cmd_cl.lua",

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
