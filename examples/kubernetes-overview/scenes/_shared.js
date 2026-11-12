// Visual vocabulary reused across scenes: containers are small squares, pods are
// rounded blue outlines holding containers, nodes are cards holding pods.
import { h } from '/__runtime/helpers.js';

export function container(color = 'var(--accent)', size = 26) {
  return h('div', { class: 'ctr', style: { width: size + 'px', height: size + 'px', borderRadius: '6px', background: color } });
}

export function pod({ containers = 2, label, width = 132, color = 'var(--accent)' } = {}) {
  const el = h('div', { class: 'pod', style: {
    width: width + 'px', height: '92px', border: `4px solid ${color}`, borderRadius: '20px',
    background: 'rgba(91,140,255,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
    position: 'relative', flex: 'none',
  } }, ...Array.from({ length: containers }, () => container(color)));
  if (label) el.appendChild(h('div', { class: 'small muted', style: { position: 'absolute', top: '100px', left: 0, right: 0, textAlign: 'center', fontSize: '24px' } }, label));
  return el;
}

export function node(name, { width, height = 190, pods = [] } = {}) {
  const row = h('div', { class: 'row', style: { gap: '28px', marginTop: '14px' } }, ...pods);
  return h('div', { class: 'card', style: { width: width ? width + 'px' : undefined, height: height + 'px', padding: '20px 32px' } },
    h('div', { class: 'label' }, name), row);
}
