"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateReact = generateReact;
exports.generateVue = generateVue;
function generateReact(screen) {
    const files = [];
    const componentName = toPascalCase(screen.name) + 'Screen';
    const propTypes = [];
    const childComponents = collectComponents(screen.children);
    for (const [name, node] of childComponents) {
        files.push(renderReactComponent(name, node));
    }
    const mainCode = renderReactScreen(screen, componentName);
    files.unshift(mainCode);
    return files;
}
function generateVue(screen) {
    const files = [];
    const componentName = toPascalCase(screen.name) + 'Screen';
    const childComponents = collectComponents(screen.children);
    for (const [name, node] of childComponents) {
        files.push(renderVueComponent(name, node));
    }
    const mainCode = renderVueScreen(screen, componentName);
    files.unshift(mainCode);
    return files;
}
function collectComponents(nodes) {
    const map = new Map();
    for (const n of nodes) {
        const name = n.name ?? n.type;
        const pascal = toPascalCase(name);
        if (!map.has(pascal))
            map.set(pascal, n);
        if (n.children) {
            const childMap = collectComponents(n.children);
            for (const [k, v] of childMap) {
                if (!map.has(k))
                    map.set(k, v);
            }
        }
    }
    return map;
}
function renderReactScreen(screen, name) {
    const imports = [`import React from 'react'`];
    const childComponents = collectComponents(screen.children);
    for (const [cname] of childComponents) {
        imports.push(`import { ${cname} } from './${cname}'`);
    }
    const body = screen.children.map(n => renderReactNode(n, '    ')).join('\n');
    return `${imports.join('\n')}

export const ${name}: React.FC = () => {
  return (
    <div className="screen-${screen.layout}">
${body}
    </div>
  )
}
`;
}
function renderReactNode(node, indent) {
    const children = node.children?.map(n => renderReactNode(n, indent + '    ')).join('\n') ?? '';
    const props = buildReactProps(node);
    switch (node.type) {
        case 'button': return `${indent}<button${props}>${escReact(node.props.text ?? '')}</button>`;
        case 'input': return `${indent}<input type="text"${props} />`;
        case 'textarea': return `${indent}<textarea${props} />`;
        case 'heading': return `${indent}<h${node.props.level ?? 2}${props}>${escReact(node.props.text ?? '')}</h${node.props.level ?? 2}>`;
        case 'text': return `${indent}<p${props}>${escReact(node.props.content ?? '')}</p>`;
        case 'paragraph': return `${indent}<p${props}>${children || escReact(node.props.content ?? '')}</p>`;
        case 'label': return `${indent}<label${props}>${escReact(node.props.text ?? '')}</label>`;
        case 'link': return `${indent}<a href="${escReact(node.props.to ?? '#')}"${props}>${escReact(node.props.text ?? '')}</a>`;
        case 'image': return `${indent}<img src="${escReact(node.props.src ?? '')}" alt="${escReact(node.props.alt ?? '')}"${props} />`;
        case 'divider': return `${indent}<hr${props} />`;
        case 'spacer': return `${indent}<div${props} />`;
        case 'badge': return `${indent}<span className="badge"${props}>${escReact(node.props.text ?? '')}</span>`;
        case 'tag': return `${indent}<span className="tag"${props}>${escReact(node.props.text ?? '')}</span>`;
        case 'container':
        case 'card':
        case 'form':
        case 'navbar':
        case 'sidebar':
        case 'footer':
        case 'grid':
        case 'list':
        case 'modal':
        default:
            return `${indent}<div${props}>${children ? '\n' + children + '\n' + indent : ''}</div>`;
    }
}
function buildReactProps(node) {
    const parts = [];
    if (node.name)
        parts.push(`data-name="${node.name}"`);
    const s = node.style;
    const styleMap = {};
    if (s?.width)
        styleMap.width = typeof s.width === 'number' ? `${s.width}px` : s.width;
    if (s?.height)
        styleMap.height = typeof s.height === 'number' ? `${s.height}px` : s.height;
    if (s?.backgroundColor)
        styleMap.background = s.backgroundColor;
    if (s?.borderColor)
        styleMap.border = `1px solid ${s.borderColor}`;
    if (s?.borderRadius)
        styleMap.borderRadius = `${s.borderRadius}px`;
    if (s?.fontSize)
        styleMap.fontSize = `${s.fontSize}px`;
    if (s?.color)
        styleMap.color = s.color;
    if (Object.keys(styleMap).length > 0) {
        const styleStr = Object.entries(styleMap)
            .map(([k, v]) => `${k}: '${v}'`)
            .join(', ');
        parts.push(`style={{${styleStr}}}`);
    }
    if (node.layout) {
        const cls = [];
        if (node.layout.direction === 'row')
            cls.push('flex', 'flex-row');
        if (node.layout.direction === 'column')
            cls.push('flex', 'flex-col');
        if (node.layout.align === 'center')
            cls.push('items-center');
        if (node.layout.justify === 'center')
            cls.push('justify-center');
        if (cls.length > 0)
            parts.push(`className="${cls.join(' ')}"`);
    }
    return parts.length > 0 ? ' ' + parts.join(' ') : '';
}
function renderReactComponent(name, node) {
    return `import React from 'react'

interface ${name}Props {}

export const ${name}: React.FC<${name}Props> = (props) => {
  return (
    <div>
      {/* ${node.type}: ${node.name ?? ''} */}
    </div>
  )
}
`;
}
function renderVueScreen(screen, name) {
    const body = screen.children.map(n => renderVueNode(n, '    ')).join('\n');
    return `<template>
  <div class="screen-${screen.layout}">
${body}
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
</style>
`;
}
function renderVueNode(node, indent) {
    const children = node.children?.map(n => renderVueNode(n, indent + '    ')).join('\n') ?? '';
    const props = buildVueProps(node);
    switch (node.type) {
        case 'button': return `${indent}<button${props}>${escReact(node.props.text ?? '')}</button>`;
        case 'input': return `${indent}<input type="text"${props} />`;
        case 'textarea': return `${indent}<textarea${props} />`;
        case 'heading': return `${indent}<h${node.props.level ?? 2}${props}>${escReact(node.props.text ?? '')}</h${node.props.level ?? 2}>`;
        case 'text': return `${indent}<p${props}>${escReact(node.props.content ?? '')}</p>`;
        case 'label': return `${indent}<label${props}>${escReact(node.props.label ?? '')}</label>`;
        case 'link': return `${indent}<a href="${escReact(node.props.to ?? '#')}"${props}>${escReact(node.props.text ?? '')}</a>`;
        case 'image': return `${indent}<img src="${escReact(node.props.src ?? '')}" alt="${escReact(node.props.alt ?? '')}"${props} />`;
        case 'divider': return `${indent}<hr${props} />`;
        case 'spacer': return `${indent}<div${props} />`;
        default:
            return `${indent}<div${props}>${children ? '\n' + children + '\n' + indent : ''}</div>`;
    }
}
function buildVueProps(node) {
    const parts = [];
    const s = node.style;
    const styles = [];
    if (s?.width)
        styles.push(`width:${typeof s.width === 'number' ? s.width + 'px' : s.width}`);
    if (s?.height)
        styles.push(`height:${typeof s.height === 'number' ? s.height + 'px' : s.height}`);
    if (s?.backgroundColor)
        styles.push(`background:${s.backgroundColor}`);
    if (s?.borderRadius)
        styles.push(`border-radius:${s.borderRadius}px`);
    if (s?.fontSize)
        styles.push(`font-size:${s.fontSize}px`);
    if (styles.length > 0)
        parts.push(`style="${styles.join(';')}"`);
    return parts.length > 0 ? ' ' + parts.join(' ') : '';
}
function renderVueComponent(name, node) {
    return `<template>
  <div>
    <!-- ${node.type}: ${node.name ?? ''} -->
  </div>
</template>

<script setup lang="ts">
</script>
`;
}
function toPascalCase(s) {
    return s
        .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
        .replace(/^./, c => c.toUpperCase())
        .replace(/[^a-zA-Z0-9]/g, '');
}
function escReact(s) {
    return s.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\n/g, '\\n');
}
//# sourceMappingURL=component-generator.js.map