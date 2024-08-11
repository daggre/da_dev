local Deg2Rad = math.pi / 180

function RayCastCrosshair(ped, distance)
    local pos = GetFinalRenderedCamCoord()
    local rot = GetFinalRenderedCamRot()
    local yaw = rot.z * Deg2Rad
    local pitch = rot.x * Deg2Rad
    local hdg = {
        x = -math.sin(yaw) * math.abs(math.cos(pitch)),
        y = math.cos(yaw) * math.abs(math.cos(pitch)),
        z = math.sin(pitch),
    }
    local _, hit, endPos, _, obj = GetShapeTestResult(
        StartShapeTestRay(
            pos.x, pos.y, pos.z,
            pos.x + hdg.x * distance,
            pos.y + hdg.y * distance,
            pos.z + hdg.z * distance,
            -1, ped, 0
        )
    )
    return hit, obj, endPos
end

function RayCastCursor(x, y, distance)
    local _, normal = GetWorldCoordFromScreenCoord(x, y)
    local pos = GetFinalRenderedCamCoord()
    local _, hit, endPos, _, obj = GetShapeTestResult(
        StartShapeTestRay(
            pos.x, pos.y, pos.z,
            pos.x + normal.x * distance,
            pos.y + normal.y * distance,
            pos.z + normal.z * distance,
            -1, nil, 0
        )
    )
    return hit, obj, endPos
end

