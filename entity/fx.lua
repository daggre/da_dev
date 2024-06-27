da.Dev.Menu.RegisterOption("root","blood","7", function()
    local ped = PlayerPedId()
    local fxHandle = da.Fx.New("scr_winter2","scr_blood_drips",{
        entity = ped,
        bone = GetEntityBoneIndexByName(ped, "PH_R_HAND"),
        networked = true,
        loop = true,
    })

    SetTimeout(10000, function()
        da.Log.Debug("Removing fxHandle", fxHandle)
        da.Fx.Remove({handle = fxHandle})
    end)
end)
