const DECIMAL_PRECISION = 5;
const STREAMING_EXTENTS_PADDING = 400;
const DEFAULT_LOD = 500;

const EntityFlags = {
    INVISIBLE: 0x1,
    NO_COLLISION: 0x2,
    FROZEN: 0x20,
    DISABLE_LIGHTING: 0x40,
    DYNAMIC_ENTITY: 0x100000,
};

/**
 * Set a flag in the given flag value.
 * @param {number} flags - The current flags value.
 * @param {number} flag - The flag to set.
 * @returns {number} - Updated flags value.
 */
function setFlag(flags, flag) {
    return flags | flag;
}

/**
 * Unset (remove) a flag in the given flag value.
 * @param {number} flags - The current flags value.
 * @param {number} flag - The flag to unset.
 * @returns {number} - Updated flags value.
 */
function unsetFlag(flags, flag) {
    return flags & ~flag;
}

/**
 * Check if a flag is set in the given flag value.
 * @param {number} flags - The current flags value.
 * @param {number} flag - The flag to check.
 * @returns {boolean} - True if the flag is set, false otherwise.
 */
function hasFlag(flags, flag) {
    return (flags & flag) !== 0;
}

export function parseYMAP(xmlString) {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "application/xml");

        if (xmlDoc.querySelector("parsererror")) {
            console.error("Invalid XML format.");
            return { success: false, objects: [] };
        }

        const sceneObjects = [];
        const entities = xmlDoc.querySelector("entities");

        if (!entities) {
            console.error("No entities found in XML.");
            return { success: false, objects: [] };
        }

        entities.querySelectorAll("Item[type='CEntityDef']").forEach(item => {
            const modelName = item.querySelector("archetypeName")?.textContent || "unknown";
            const positionNode = item.querySelector("position");
            const rotationNode = item.querySelector("rotation");
            const flagsNode = item.querySelector("flags");

            const position = positionNode ? {
                x: parseFloat(positionNode.getAttribute("x")) || 0,
                y: parseFloat(positionNode.getAttribute("y")) || 0,
                z: parseFloat(positionNode.getAttribute("z")) || 0
            } : { x: 0, y: 0, z: 0 };

            const rotation = rotationNode ? {
                w: parseFloat(rotationNode.getAttribute("w")) || 1,
                x: parseFloat(rotationNode.getAttribute("x")) || 0,
                y: parseFloat(rotationNode.getAttribute("y")) || 0,
                z: parseFloat(rotationNode.getAttribute("z")) || 0
            } : { w: 1, x: 0, y: 0, z: 0 };

            const euler = toEuler(rotation);
            const flagsValue = parseInt(flagsNode?.getAttribute("value")) || 0;

            sceneObjects.push({
                modelName,
                coords_x: position.x,
                coords_y: position.y,
                coords_z: position.z,
                rotation_w: rotation.w,
                rotation_x: rotation.x,
                rotation_y: rotation.y,
                rotation_z: rotation.z,
                rotation_pitch: euler.pitch,
                rotation_roll: euler.roll,
                rotation_yaw: euler.yaw,
                frozen: hasFlag(flagsValue, EntityFlags.FROZEN),
                visible: !hasFlag(flagsValue, EntityFlags.INVISIBLE),
                collision: !hasFlag(flagsValue, EntityFlags.NO_COLLISION),
            });
        });

        return { success: true, objects: sceneObjects };
    } catch (error) {
        console.error("Failed to parse YMAP XML:", error);
        return { success: false, objects: [] };
    }
}

export function exportYMAP(scene) {
    let minX, maxX, minY, maxY, minZ, maxZ;

    const xmlDoc = document.implementation.createDocument(null, "CMapData");
    const root = xmlDoc.documentElement;

    function createElement(name, attributes, textContent = null) {
        const element = xmlDoc.createElement(name);
        Object.entries(attributes || {}).forEach(([key, value]) => element.setAttribute(key, value));
        if (textContent) element.textContent = textContent;
        return element;
    }

    root.appendChild(createElement("flags", { value: "2" }));
    root.appendChild(createElement("contentFlags", { value: "65" }));

    const entitiesNode = createElement("entities");

    scene.objects.forEach((obj) => {
        let flags = 1572865; // Default entity flags

        if (obj.frozen) flags = setFlag(flags, EntityFlags.FROZEN);
        if (!obj.visible) flags = setFlag(flags, EntityFlags.INVISIBLE);
        if (!obj.collision) flags = setFlag(flags, EntityFlags.NO_COLLISION);

        const q = toQuaternion(obj.rotation_pitch, obj.rotation_roll, obj.rotation_yaw);

        minX = minX === undefined ? obj.coords_x : Math.min(minX, obj.coords_x);
        maxX = maxX === undefined ? obj.coords_x : Math.max(maxX, obj.coords_x);
        minY = minY === undefined ? obj.coords_y : Math.min(minY, obj.coords_y);
        maxY = maxY === undefined ? obj.coords_y : Math.max(maxY, obj.coords_y);
        minZ = minZ === undefined ? obj.coords_z : Math.min(minZ, obj.coords_z);
        maxZ = maxZ === undefined ? obj.coords_z : Math.max(maxZ, obj.coords_z);

        const itemNode = createElement("Item", { type: "CEntityDef" });

        itemNode.appendChild(createElement("archetypeName", {}, obj.modelName));
        itemNode.appendChild(createElement("flags", { value: flags }));
        itemNode.appendChild(createElement("position", {
            x: obj.coords_x.toFixed(DECIMAL_PRECISION),
            y: obj.coords_y.toFixed(DECIMAL_PRECISION),
            z: obj.coords_z.toFixed(DECIMAL_PRECISION)
        }));
        itemNode.appendChild(createElement("rotation", {
            w: q.w.toFixed(DECIMAL_PRECISION),
            x: q.x.toFixed(DECIMAL_PRECISION),
            y: q.y.toFixed(DECIMAL_PRECISION),
            z: q.z.toFixed(DECIMAL_PRECISION)
        }));
        itemNode.appendChild(createElement("scaleXY", { value: "1" }));
        itemNode.appendChild(createElement("scaleZ", { value: "1" }));
        itemNode.appendChild(createElement("parentIndex", { value: "-1" }));
        itemNode.appendChild(createElement("lodDist", { value: DEFAULT_LOD }));
        itemNode.appendChild(createElement("childLodDist", { value: DEFAULT_LOD }));
        itemNode.appendChild(createElement("lodLevel", {}, "LODTYPES_DEPTH_HD"));
        itemNode.appendChild(createElement("numChildren", { value: "0" }));
        itemNode.appendChild(createElement("ambientOcclusionMultiplier", { value: "255" }));
        itemNode.appendChild(createElement("artificialAmbientOcclusion", { value: "255" }));

        entitiesNode.appendChild(itemNode);
    });

    if (minX !== undefined) {
        root.appendChild(createElement("streamingExtentsMin", {
            x: minX - STREAMING_EXTENTS_PADDING,
            y: minY - STREAMING_EXTENTS_PADDING,
            z: minZ - STREAMING_EXTENTS_PADDING
        }));
        root.appendChild(createElement("streamingExtentsMax", {
            x: maxX + STREAMING_EXTENTS_PADDING,
            y: maxY + STREAMING_EXTENTS_PADDING,
            z: maxZ + STREAMING_EXTENTS_PADDING
        }));
        root.appendChild(createElement("entitiesExtentsMin", { x: minX, y: minY, z: minZ }));
        root.appendChild(createElement("entitiesExtentsMax", { x: maxX, y: maxY, z: maxZ }));
    }

    root.appendChild(entitiesNode);

    const rawXml = new XMLSerializer().serializeToString(xmlDoc);

    return `<?xml version="1.0"?>\n` + formatXML(rawXml);
}

function formatXML(xmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "application/xml");

    const tab = "  "; // Use 2 spaces for indentation
    let formatted = "";
    let indentLevel = 0;

    // Elements that should remain inline
    const inlineElements = new Set(["archetypeName", "lodLevel"]);

    function formatNode(node, indent) {
        if (node.nodeType === Node.TEXT_NODE) {
            const trimmedText = node.nodeValue.trim();
            if (trimmedText) {
                formatted += trimmedText; // Keep inline text values without extra indentation
            }
            return;
        }

        if (node.nodeType === Node.ELEMENT_NODE) {
            const tagName = node.nodeName;
            const attributes = [...node.attributes]
                .map(attr => `${attr.name}="${attr.value}"`)
                .join(" ");

            if (node.childNodes.length === 0) {
                formatted += `${indent}<${tagName}${attributes ? " " + attributes : ""}/>\n`;
                return;
            }

            if (node.childNodes.length === 1 && node.firstChild.nodeType === Node.TEXT_NODE && inlineElements.has(tagName)) {
                formatted += `${indent}<${tagName}${attributes ? " " + attributes : ""}>${node.firstChild.nodeValue.trim()}</${tagName}>\n`;
                return;
            }

            formatted += `${indent}<${tagName}${attributes ? " " + attributes : ""}>\n`;

            [...node.childNodes].forEach(child => formatNode(child, indent + tab));

            formatted += `${indent}</${tagName}>\n`;
        }
    }

    formatNode(xmlDoc.documentElement, ""); // Start from root

    return formatted.trim(); // Remove trailing newlines
}

function toQuaternion(pitch, roll, yaw) {
    const degToRad = Math.PI / 180;
    pitch *= degToRad;
    roll *= degToRad;
    yaw *= degToRad;

    const cy = Math.cos(yaw * 0.5);
    const sy = Math.sin(yaw * 0.5);
    const cr = Math.cos(roll * 0.5);
    const sr = Math.sin(roll * 0.5);
    const cp = Math.cos(pitch * 0.5);
    const sp = Math.sin(pitch * 0.5);

    return {
        w: cy * cr * cp + sy * sr * sp,
        x: cy * sr * cp - sy * cr * sp,
        y: cy * cr * sp + sy * sr * cp,
        z: sy * cr * cp - cy * sr * sp,
    };
}

function toEuler(q) {
    const radToDeg = 180 / Math.PI;

    // Roll (X-axis rotation)
    const sinr_cosp = 2 * (q.w * q.x + q.y * q.z);
    const cosr_cosp = 1 - 2 * (q.x * q.x + q.y * q.y);
    const roll = Math.atan2(sinr_cosp, cosr_cosp) * radToDeg;

    // Pitch (Y-axis rotation)
    let pitch;
    const sinp = 2 * (q.w * q.y - q.z * q.x);
    if (Math.abs(sinp) >= 1) {
        pitch = (Math.sign(sinp) * 90); // Clamp to 90 degrees if out of range
    } else {
        pitch = Math.asin(sinp) * radToDeg;
    }

    // Yaw (Z-axis rotation)
    const siny_cosp = 2 * (q.w * q.z + q.x * q.y);
    const cosy_cosp = 1 - 2 * (q.y * q.y + q.z * q.z);
    const yaw = Math.atan2(siny_cosp, cosy_cosp) * radToDeg;

    return { pitch, roll, yaw };
}

