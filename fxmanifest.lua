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
}

client_scripts {
    "ui/tree.lua",
    "root.lua",
    "noclip/noclip.lua",
    "teleport/teleport.lua",
    "ui/ui.lua",
}

files {
    'ui/web/index.html',
    'ui/web/script.js',
    'ui/web/style.css',
    'ui/web/fonts/RDRLino-Regular.ttf',
}

ui_page {
    'ui/web/index.html',
}


dependencies {
    'da_lib',
}
