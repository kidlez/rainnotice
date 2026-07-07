"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateScreen = validateScreen;
exports.normalizeScreen = normalizeScreen;
const VALID_TYPES = new Set([
    'screen', 'container', 'card', 'form', 'table', 'grid',
    'button', 'input', 'textarea', 'select', 'checkbox', 'radio', 'switch',
    'heading', 'paragraph', 'label', 'link', 'text',
    'image', 'icon', 'divider', 'spacer', 'avatar', 'badge', 'tag',
    'navbar', 'sidebar', 'footer', 'menu', 'tabs',
    'list', 'list_item', 'dropdown', 'modal', 'tooltip',
]);
const REQUIRED_PROPS = {
    button: ['text'],
    heading: ['text'],
    text: ['content'],
    label: ['text'],
    input: ['name'],
    link: ['text', 'to'],
    image: ['src'],
};
const TYPE_DEFAULTS = {
    heading: { level: 1 },
    button: { variant: 'default' },
    input: { placeholder: '' },
};
function validateScreen(screen) {
    const errors = [];
    if (!screen.name || screen.name.trim().length === 0) {
        errors.push({ path: '$', message: 'Screen must have a name', severity: 'error' });
    }
    if (!Array.isArray(screen.children)) {
        errors.push({ path: '$', message: 'Screen must have a children array', severity: 'error' });
        return { valid: errors.length === 0, errors };
    }
    for (let i = 0; i < screen.children.length; i++) {
        validateNode(screen.children[i], `children[${i}]`, errors);
    }
    return { valid: errors.every(e => e.severity !== 'error'), errors };
}
function validateNode(node, path, errors) {
    if (!node.type || !VALID_TYPES.has(node.type)) {
        errors.push({
            path,
            message: `Invalid type: "${node.type}". Must be one of: ${[...VALID_TYPES].join(', ')}`,
            severity: 'error',
        });
        return;
    }
    if (!node.props || typeof node.props !== 'object') {
        errors.push({ path: `${path}.props`, message: 'Node must have a props object', severity: 'error' });
        return;
    }
    const required = REQUIRED_PROPS[node.type];
    if (required) {
        for (const key of required) {
            if (node.props[key] === undefined || node.props[key] === '') {
                errors.push({
                    path: `${path}.props.${key}`,
                    message: `Required prop "${key}" is missing for type "${node.type}"`,
                    severity: 'warning',
                });
            }
        }
    }
    const defaults = TYPE_DEFAULTS[node.type];
    if (defaults) {
        for (const [key, value] of Object.entries(defaults)) {
            if (node.props[key] === undefined) {
                node.props[key] = value;
            }
        }
    }
    if (node.layout) {
        if (node.layout.direction && !['row', 'column', 'grid'].includes(node.layout.direction)) {
            errors.push({ path: `${path}.layout.direction`, message: `Invalid direction: ${node.layout.direction}`, severity: 'warning' });
        }
    }
    if (node.children && Array.isArray(node.children)) {
        for (let i = 0; i < node.children.length; i++) {
            validateNode(node.children[i], `${path}.children[${i}]`, errors);
        }
    }
}
function normalizeScreen(screen) {
    const children = screen.children.map(n => normalizeNode(n));
    return { ...screen, children };
}
function normalizeNode(node) {
    const defaults = TYPE_DEFAULTS[node.type];
    const props = node.props ?? {};
    if (defaults) {
        for (const [key, value] of Object.entries(defaults)) {
            if (props[key] === undefined)
                props[key] = value;
        }
    }
    const style = node.style ?? {};
    const children = node.children?.map(n => normalizeNode(n)) ?? [];
    return { ...node, type: node.type, props, children: children.length > 0 ? children : undefined, style: Object.keys(style).length > 0 ? style : undefined };
}
//# sourceMappingURL=dsl-validator.js.map