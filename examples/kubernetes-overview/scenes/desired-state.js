import { h, codeBlock, reveal, pop, highlightLines } from '/__runtime/helpers.js';
import { pod } from './_shared.js';

const YAML = `
kind: Deployment
metadata:
  name: web
spec:
  replicas: 3
  template:
    containers:
      - image: web:1.4`;

export default function ({ el, tl, cue }) {
  const heading = h('div', { class: 'h2 abs', style: { left: '128px', top: '96px' } }, 'Declare it. Don’t command it.');
  const code = codeBlock(YAML, { lang: 'yaml' });
  Object.assign(code.style, { position: 'absolute', left: '128px', top: '260px', width: '700px' });

  const pods = [pod({ label: 'web-1' }), pod({ label: 'web-2' }), pod({ label: 'web-3' })];
  const fresh = pod({ label: 'web-4', color: 'var(--accent3)' });
  const podRow = h('div', { class: 'abs row', style: { left: '1000px', top: '560px', gap: '56px' } }, ...pods);
  // The replacement takes web-2's slot.
  Object.assign(fresh.style, { position: 'absolute', left: 1000 + 132 + 56 + 'px', top: '560px' });

  const running = h('span', { class: 'mono' }, '3');
  const status = h('div', { class: 'card abs row', style: { left: '1000px', top: '300px', width: '780px', gap: '64px', padding: '28px 40px' } },
    h('div', {}, h('div', { class: 'label' }, 'Desired'), h('div', { class: 'h1 mono' }, '3')),
    h('div', {}, h('div', { class: 'label' }, 'Running'), h('div', { class: 'h1' }, running)),
    h('div', { class: 'small muted', style: { flex: 1 } }, 'Kubernetes keeps these equal'));
  const crash = h('div', { class: 'pill abs', style: { left: '1176px', top: '720px', background: 'var(--danger)', color: '#10131c', fontWeight: 700 } }, 'crashed');
  el.append(heading, code, podRow, fresh, status, crash);

  reveal(tl, heading, { at: 0.3 });
  reveal(tl, code, { at: cue('You declare'), x: -30, y: 0 });
  const three = cue('three copies');
  highlightLines(tl, code, [5], { at: three });
  reveal(tl, status, { at: three + 0.4 });
  pop(tl, pods, { at: three + 0.6, stagger: 0.15 });
  tl.set(fresh, { autoAlpha: 0 }, 0);
  tl.set(crash, { autoAlpha: 0 }, 0);

  const crashAt = cue('If a pod crashes');
  tl.to(pods[1], { borderColor: 'var(--danger)', duration: 0.2 }, crashAt + 0.1);
  tl.to(pods[1].querySelectorAll('.ctr'), { backgroundColor: 'var(--danger)', duration: 0.2 }, crashAt + 0.1);
  tl.to(pods[1], { autoAlpha: 0, scale: 0.6, duration: 0.5, ease: 'power2.in' }, crashAt + 0.6);
  tl.set(crash, { autoAlpha: 1 }, crashAt + 0.4);
  tl.from(crash, { scale: 0.5, duration: 0.3, ease: 'back.out(2)' }, crashAt + 0.4);
  tl.set(running, { textContent: '2' }, cue('notices'));
  tl.fromTo(running, { color: 'var(--fg)' }, { color: 'var(--danger)', duration: 0.3, immediateRender: false }, cue('notices'));
  tl.to(status, { borderColor: 'var(--danger)', duration: 0.3 }, cue('the difference'));
  const fix = cue('starts a replacement');
  tl.to(crash, { autoAlpha: 0, duration: 0.3 }, fix - 0.2);
  tl.set(fresh, { autoAlpha: 1 }, fix);
  tl.from(fresh, { scale: 0.4, duration: 0.5, ease: 'back.out(2)' }, fix);
  tl.set(running, { textContent: '3' }, fix + 0.6);
  tl.to(running, { color: 'var(--accent3)', duration: 0.3 }, fix + 0.6);
  tl.to(status, { borderColor: 'var(--accent3)', duration: 0.3 }, fix + 0.6);
}
