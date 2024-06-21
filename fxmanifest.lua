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
}

client_scripts {
    "ui/tree.lua",
    "root.lua",
    -- "control/disco_keys.lua",
    "noclip/noclip.lua",
    "teleport/teleport.lua",
    "env.lua",
    "entity/entity.lua",
    "object/gizmo.lua",
    "object/gfx_util.lua",
    "object/select.lua",
    "ui/ui.lua",
    "ui/map.lua",
    "dat/animations.lua",
    "dat/af_flags.lua",
    "dat/aik_flags.lua",
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
