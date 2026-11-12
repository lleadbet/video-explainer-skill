import { h, reveal, pop, marker } from '/__runtime/helpers.js';
import { container } from './_shared.js';

export default function ({ el, tl, cue }) {
  const servers = [0, 1, 2].map((i) => {
    const grid = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginTop: '24px' } },
      ...Array.from({ length: 8 }, () => container('var(--accent)', 52)));
    return h('div', { class: 'card', style: { width: '440px', position: 'relative' } }, h('div', { class: 'label' }, `server ${i + 1}`), grid);
  });
  const row = h('div', { class: 'abs row', style: { left: '128px', top: '400px', gap: '84px' } }, ...servers);
  el.appendChild(row);

  const badge = (text, color, left, top) => h('div', { class: 'pill abs', style: { left, top, background: color, color: '#10131c', fontWeight: 700 } }, text);
  const offline = badge('offline', 'var(--danger)', '660px', '320px');
  const traffic = badge('traffic ×10', 'var(--accent4)', '128px', '320px');
  const release = badge('v2 ready to ship', 'var(--accent3)', '1176px', '320px');
  const headline = h('div', { class: 'h2 abs', style: { left: '128px', top: '120px' } }, 'Kubernetes ', h('span', {}, 'automates'), ' all of it');
  const byHand = h('div', { class: 'h2 abs muted', style: { left: '128px', top: '120px' } }, 'Doing it by hand doesn’t scale');
  el.append(offline, traffic, release, headline, byHand);

  reveal(tl, byHand, { at: 0.2 });
  reveal(tl, servers, { at: 0.4, stagger: 0.12 });
  const dead = servers[1].querySelectorAll('.ctr');
  tl.to(servers[1], { borderColor: 'var(--danger)', duration: 0.3 }, cue('Servers fail'));
  tl.to(dead, { autoAlpha: 0, y: 30, duration: 0.4, stagger: 0.03, ease: 'power2.in' }, cue('Servers fail') + 0.1);
  pop(tl, offline, { at: cue('Servers fail') + 0.1 });
  pop(tl, traffic, { at: cue('traffic spikes') });
  tl.to(servers[0], { scale: 1.04, duration: 0.15, yoyo: true, repeat: 3 }, cue('traffic spikes') + 0.1);
  pop(tl, release, { at: cue('new versions') });
  tl.to(byHand, { autoAlpha: 0, y: -20, duration: 0.3 }, cue('Kubernetes automates') - 0.2);
  reveal(tl, headline, { at: cue('Kubernetes automates') });
  tl.to([row, offline, traffic, release], { opacity: 0.35, duration: 0.5 }, cue('Kubernetes automates'));
  marker(tl, headline.children[0], { at: cue('automates') + 0.3, color: 'var(--accent)' });
}
