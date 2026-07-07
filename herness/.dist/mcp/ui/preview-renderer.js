"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderPreview = renderPreview;
function renderPreview(screen) {
    const body = screen.children.map(n => renderNode(n)).join('\n');
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(screen.title ?? screen.name)}</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#333;background:#f5f5f5;min-height:100vh}
.h-screen{display:flex;flex-direction:column;min-height:100vh}
.h-screen-centered{display:flex;align-items:center;justify-content:center;min-height:100vh}
.h-screen-sidebar{display:flex;min-height:100vh}
.h-screen-sidebar>.h-sidebar{flex-shrink:0}
.h-screen-sidebar>.h-main{flex:1}
.h-container{display:flex}
.h-row{flex-direction:row}
.h-col{flex-direction:column}
.h-grid{display:grid}
.h-center{align-items:center}
.h-start{align-items:flex-start}
.h-end{align-items:flex-end}
.h-stretch{align-items:stretch}
.h-between{justify-content:space-between}
.h-around{justify-content:space-around}
.h-evenly{justify-content:space-evenly}
.h-wrap{flex-wrap:wrap}
.h-card{background:#fff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,.1)}
.h-btn{display:inline-flex;align-items:center;justify-content:center;border:none;cursor:pointer;font-size:14px;border-radius:4px;transition:all .2s;color:#fff;text-decoration:none}
.h-input{display:block;width:100%;border:1px solid #d9d9d9;border-radius:4px;padding:8px 12px;font-size:14px;outline:none;transition:border .2s}
.h-input:focus{border-color:#1890ff;box-shadow:0 0 0 2px rgba(24,144,255,.2)}
.h-heading{font-weight:600;line-height:1.4}
.h-text{line-height:1.6}
.h-label{font-size:14px;color:#666}
.h-divider{border:none;border-top:1px solid #e8e8e8}
.h-image{max-width:100%}
.h-avatar{border-radius:50%;object-fit:cover}
.h-badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:12px}
.h-tag{display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px;background:#f0f0f0}
.h-link{color:#1890ff;text-decoration:none;cursor:pointer}
.h-link:hover{color:#40a9ff}
.h-navbar{display:flex;align-items:center;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.08);padding:12px 24px}
.h-sidebar{background:#fff;box-shadow:1px 0 4px rgba(0,0,0,.08);padding:16px}
.h-footer{background:#f5f5f5;padding:16px 24px;text-align:center;font-size:12px;color:#999}
.h-menu{list-style:none}
.h-menu-item{padding:8px 16px;cursor:pointer;border-radius:4px;transition:background .2s}
.h-menu-item:hover{background:#f0f0f0}
.h-tabs{display:flex;border-bottom:1px solid #e8e8e8}
.h-tab{padding:8px 16px;cursor:pointer;border-bottom:2px solid transparent;transition:all .2s}
.h-tab:hover,.h-tab-active{border-bottom-color:#1890ff;color:#1890ff}
.h-loading{display:flex;align-items:center;justify-content:center;padding:40px;color:#999}
</style>
</head>
<body>
<div class="h-screen-${screen.layout}">
${body}
</div>
</body>
</html>`;
}
function renderNode(node) {
    const css = buildCSS(node);
    const children = node.children?.map(n => renderNode(n)).join('\n') ?? '';
    switch (node.type) {
        case 'container':
            return `<div class="${css.classes}" style="${css.style}">${children}</div>`;
        case 'card':
            return `<div class="h-card ${css.classes}" style="${css.style}">${children}</div>`;
        case 'form':
            return `<form class="${css.classes}" style="${css.style}">${children}</form>`;
        case 'table':
            return `<table class="${css.classes}" style="${css.style}">${children}</table>`;
        case 'grid':
            return `<div class="h-grid ${css.classes}" style="${css.style}">${children}</div>`;
        case 'button': {
            const text = esc(node.props.text ?? '');
            const href = node.props.to;
            if (href)
                return `<a href="${esc(href)}" class="h-btn ${css.classes}" style="${css.style}">${text}</a>`;
            return `<button class="h-btn ${css.classes}" style="${css.style}">${text}</button>`;
        }
        case 'input': {
            const placeholder = esc(node.props.placeholder ?? '');
            const name = esc(node.props.name ?? '');
            return `<input type="text" name="${name}" placeholder="${placeholder}" class="h-input ${css.classes}" style="${css.style}" />`;
        }
        case 'textarea': {
            const placeholder = esc(node.props.placeholder ?? '');
            const name = esc(node.props.name ?? '');
            return `<textarea name="${name}" placeholder="${placeholder}" class="h-input ${css.classes}" style="${css.style}"></textarea>`;
        }
        case 'select': {
            const name = esc(node.props.name ?? '');
            const options = node.props.options ?? [];
            const opts = options.map(o => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('');
            return `<select name="${name}" class="h-input ${css.classes}" style="${css.style}">${opts}</select>`;
        }
        case 'checkbox': {
            const label = esc(node.props.label ?? '');
            const name = esc(node.props.name ?? '');
            return `<label class="${css.classes}" style="${css.style}"><input type="checkbox" name="${name}" /> ${label}</label>`;
        }
        case 'radio': {
            const label = esc(node.props.label ?? '');
            const name = esc(node.props.name ?? '');
            return `<label class="${css.classes}" style="${css.style}"><input type="radio" name="${name}" /> ${label}</label>`;
        }
        case 'switch': {
            const label = esc(node.props.label ?? '');
            return `<label class="h-switch ${css.classes}" style="${css.style}"><input type="checkbox" /> ${label}</label>`;
        }
        case 'heading': {
            const level = Math.min(Math.max(node.props.level ?? 2, 1), 6);
            const text = esc(node.props.text ?? '');
            return `<h${level} class="h-heading ${css.classes}" style="${css.style}">${text}</h${level}>`;
        }
        case 'text': {
            const content = esc(node.props.content ?? '');
            return `<p class="h-text ${css.classes}" style="${css.style}">${content}</p>`;
        }
        case 'paragraph':
            return `<p class="h-text ${css.classes}" style="${css.style}">${children || esc(node.props.content ?? '')}</p>`;
        case 'label': {
            const text = esc(node.props.text ?? '');
            const htmlFor = node.props.for;
            if (htmlFor)
                return `<label for="${esc(htmlFor)}" class="h-label ${css.classes}" style="${css.style}">${text}</label>`;
            return `<span class="h-label ${css.classes}" style="${css.style}">${text}</span>`;
        }
        case 'link': {
            const text = esc(node.props.text ?? '');
            const to = esc(node.props.to ?? '#');
            return `<a href="${to}" class="h-link ${css.classes}" style="${css.style}">${text}</a>`;
        }
        case 'image': {
            const src = esc(node.props.src ?? '');
            const alt = esc(node.props.alt ?? '');
            return `<img src="${src}" alt="${alt}" class="h-image ${css.classes}" style="${css.style}" />`;
        }
        case 'icon': {
            const name = esc(node.props.name ?? '');
            return `<span class="h-icon ${css.classes}" style="${css.style}" data-icon="${name}">[${name}]</span>`;
        }
        case 'divider':
            return `<hr class="h-divider ${css.classes}" style="${css.style}" />`;
        case 'spacer':
            return `<div class="${css.classes}" style="${css.style}"></div>`;
        case 'avatar': {
            const src = esc(node.props.src ?? '');
            const alt = esc(node.props.alt ?? '');
            const size = node.props.size ?? 40;
            return `<img src="${src}" alt="${alt}" class="h-avatar ${css.classes}" style="width:${size}px;height:${size}px;${css.style}" />`;
        }
        case 'badge': {
            const text = esc(node.props.text ?? '');
            const bg = node.style?.backgroundColor ?? '#1890ff';
            return `<span class="h-badge ${css.classes}" style="background:${bg};${css.style}">${text}</span>`;
        }
        case 'tag': {
            const text = esc(node.props.text ?? '');
            return `<span class="h-tag ${css.classes}" style="${css.style}">${text}</span>`;
        }
        case 'navbar':
            return `<nav class="h-navbar ${css.classes}" style="${css.style}">${children}</nav>`;
        case 'sidebar':
            return `<aside class="h-sidebar ${css.classes}" style="${css.style}">${children}</aside>`;
        case 'footer':
            return `<footer class="h-footer ${css.classes}" style="${css.style}">${children}</footer>`;
        case 'menu': {
            return `<ul class="h-menu ${css.classes}" style="${css.style}">${renderMenuItems(node.children ?? [])}</ul>`;
        }
        case 'tabs': {
            return `<div class="h-tabs ${css.classes}" style="${css.style}">${renderTabs(node.children ?? [])}</div>`;
        }
        case 'list': {
            return `<div class="h-list ${css.classes}" style="${css.style}">${children}</div>`;
        }
        case 'list_item': {
            return `<div class="h-list-item ${css.classes}" style="padding:8px 16px;border-bottom:1px solid #eee;${css.style}">${children}</div>`;
        }
        case 'dropdown': {
            const label = esc(node.props.label ?? '');
            return `<div class="${css.classes}" style="position:relative;${css.style}"><button class="h-btn">${label} ▾</button><div class="h-dropdown-content" style="display:none;position:absolute;top:100%;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.15);border-radius:4px;min-width:120px">${children}</div></div>`;
        }
        case 'modal': {
            return `<div class="h-modal-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:1000"><div class="h-card ${css.classes}" style="max-width:90vw;${css.style}">${children}</div></div>`;
        }
        case 'tooltip': {
            return `<span class="${css.classes}" style="position:relative;${css.style}">${children}<span class="h-tooltip-text" style="display:none;position:absolute;bottom:100%;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:4px 8px;border-radius:4px;font-size:12px;white-space:nowrap">${esc(node.props.text ?? '')}</span></span>`;
        }
        default:
            return `<div class="${css.classes}" style="${css.style}">${children}</div>`;
    }
}
function buildCSS(node) {
    const classes = ['h-container'];
    const styles = [];
    if (node.layout) {
        const l = node.layout;
        if (l.direction === 'row') {
            classes.push('h-row');
        }
        if (l.direction === 'column') {
            classes.push('h-col');
        }
        if (l.align)
            classes.push(`h-${l.align}`);
        if (l.justify)
            classes.push(`h-${l.justify}`);
        if (l.wrap)
            classes.push('h-wrap');
        if (l.gap && l.gap > 0)
            styles.push(`gap:${l.gap}px`);
        if (l.padding) {
            if (typeof l.padding === 'number')
                styles.push(`padding:${l.padding}px`);
            else
                styles.push(`padding:${l.padding.top}px ${l.padding.right}px ${l.padding.bottom}px ${l.padding.left}px`);
        }
        if (l.columns && l.direction === 'grid') {
            styles.push(`grid-template-columns:repeat(${l.columns},1fr)`);
        }
    }
    if (node.style) {
        const s = node.style;
        if (s.width)
            styles.push(`width:${typeof s.width === 'number' ? s.width + 'px' : s.width}`);
        if (s.height)
            styles.push(`height:${typeof s.height === 'number' ? s.height + 'px' : s.height}`);
        if (s.maxWidth)
            styles.push(`max-width:${typeof s.maxWidth === 'number' ? s.maxWidth + 'px' : s.maxWidth}`);
        if (s.backgroundColor)
            styles.push(`background:${s.backgroundColor}`);
        if (s.borderColor)
            styles.push(`border:1px solid ${s.borderColor}`);
        if (s.borderRadius && s.borderRadius > 0)
            styles.push(`border-radius:${s.borderRadius}px`);
        if (s.borderWidth && s.borderWidth > 0)
            styles.push(`border-width:${s.borderWidth}px`);
        if (s.shadow)
            styles.push(`box-shadow:${s.shadow}`);
        if (s.fontSize)
            styles.push(`font-size:${s.fontSize}px`);
        if (s.fontWeight)
            styles.push(`font-weight:${s.fontWeight}`);
        if (s.color)
            styles.push(`color:${s.color}`);
        if (s.textAlign)
            styles.push(`text-align:${s.textAlign}`);
        if (s.margin) {
            if (typeof s.margin === 'number')
                styles.push(`margin:${s.margin}px`);
            else
                styles.push(`margin:${s.margin.top}px ${s.margin.right}px ${s.margin.bottom}px ${s.margin.left}px`);
        }
    }
    return { classes: classes.join(' '), style: styles.join(';') };
}
function renderMenuItems(nodes) {
    return nodes.map(n => {
        const text = esc(n.props.text ?? '');
        return `<li class="h-menu-item">${text}</li>`;
    }).join('\n');
}
function renderTabs(nodes) {
    return nodes.map((n, i) => {
        const text = esc(n.props.text ?? '');
        const active = i === 0 ? ' h-tab-active' : '';
        return `<div class="h-tab${active}">${text}</div>`;
    }).join('\n');
}
function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
//# sourceMappingURL=preview-renderer.js.map