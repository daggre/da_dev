local GetExtents = function(minDim, maxDim)
    local offset = vec3(
        (maxDim.x + minDim.x) / 2,
        (maxDim.y + minDim.y) / 2,
        (maxDim.z + minDim.z) / 2
    )
    local extents = vec3(
        (maxDim.x - minDim.x) / 2,
        (maxDim.y - minDim.y) / 2,
        (maxDim.z - minDim.z) / 2
    )
    local min = offset - extents
    local max = offset + extents

    return min, max
end

local GetRotationMatrix = function(fVec, rVec, uVec)
    return {
        {rVec.x, fVec.x, uVec.x},
        {rVec.y, fVec.y, uVec.y},
        {rVec.z, fVec.z, uVec.z},
    }
end

local ApplyRotationMatrix = function(pIn, m)
    local pOut = {}
    for _, p in ipairs(pIn) do
        table.insert(pOut, vec3(
            p.x * m[1][1] + p.y * m[1][2] + p.z * m[1][3],
            p.x * m[2][1] + p.y * m[2][2] + p.z * m[2][3],
            p.x * m[3][1] + p.y * m[3][2] + p.z * m[3][3]
        ))
    end
    return pOut
end

local GetBoundingBox = function(obj)
    local model = GetEntityModel(obj)
    local dMin, dMax = GetModelDimensions(model)
    local min, max = GetExtents(dMin, dMax)
    local vertices = {
        vec3(min.x, min.y, min.z),
        vec3(max.x, min.y, min.z),
        vec3(max.x, max.y, min.z),
        vec3(min.x, max.y, min.z),
        vec3(min.x, min.y, max.z),
        vec3(max.x, min.y, max.z),
        vec3(max.x, max.y, max.z),
        vec3(min.x, max.y, max.z),
    }

    -- INFO: Swapped fVec and rVec according to API documentation
    local fVec, rVec, uVec, pos = GetEntityMatrix(obj)
    local matrix = GetRotationMatrix(fVec, rVec, uVec)
    vertices = ApplyRotationMatrix(vertices, matrix)

    return vertices, pos
end

local DrawLine = function(a, b, c)
    Citizen.InvokeNative(0xB3426BCC, a, b, c.r, c.g, c.b, c.a)
end

local CubeEdges = {
    {1, 2}, {2, 3}, {3, 4}, {4, 1},
    {5, 6}, {6, 7}, {7, 8}, {8, 5},
    {1, 5}, {2, 6}, {3, 7}, {4, 8},
}

function DrawBoundingBox(obj, color)
    if not obj or not color then return; end
    local vertices, pos = GetBoundingBox(obj)
    for _, edge in ipairs(CubeEdges) do
        DrawLine(vertices[edge[1]] + pos, vertices[edge[2]] + pos, color)
    end
end

