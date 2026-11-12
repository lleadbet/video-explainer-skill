import { h, svgLayer, arrow, drawArrow, reveal, typewriter, pop, marker } from '/__runtime/helpers.js';

export default function ({ el, tl, cue }) {
  // Browser address bar
  const urlText = h('span', { class: 'mono' });
  const bar = h('div', { class: 'card row abs', style: { left: '160px', top: '420px', width: '640px', padding: '28px 36px', gap: '24px' } },
    h('div', { style: { display: 'flex', gap: '12px' } }, ...['danger', 'accent4', 'accent3'].map((c) =>
      h('div', { style: { width: '22px', height: '22px', borderRadius: '50%', background: `var(--${c})` } }))),
    h('div', { class: 'h3', style: { fontWeight: 500 } }, urlText));
  const nameLbl = h('div', { class: 'label abs', style: { left: '160px', top: '360px' } }, 'What you type');

  // IP result
  const ip = h('div', { class: 'card abs mono h3', style: { left: '1160px', top: '420px', width: '600px', textAlign: 'center', borderColor: 'var(--accent3)' } }, '93.184.216.34');
  const ipLbl = h('div', { class: 'label abs', style: { left: '1160px', top: '360px' } }, 'What computers use');

  const layer = svgLayer(el);
  const a = arrow(layer, { from: [830, 470], to: [1130, 470], color: 'var(--accent)', width: 8 });
  const dns = h('div', { class: 'pill abs', style: { left: '900px', top: '540px', background: 'var(--accent)', color: '#fff' } }, 'DNS');

  const headline = h('div', { class: 'h2 abs', style: { left: '160px', top: '140px', width: '1600px' } },
    'DNS is the internet’s ', h('span', {}, 'phone book'));
  el.append(nameLbl, bar, ipLbl, ip, dns, headline);

  reveal(tl, [nameLbl, bar], { at: 0.3, stagger: 0.1 });
  typewriter(tl, urlText, 'example.com', { at: 0.6, cps: 14 });
  const ipAt = cue('IP address');
  drawArrow(tl, a, { at: ipAt - 0.4 });
  pop(tl, dns, { at: ipAt - 0.2 });
  reveal(tl, [ipLbl, ip], { at: ipAt + 0.2, x: -30, y: 0, stagger: 0.1 });
  reveal(tl, headline, { at: cue('DNS is the phone book') });
  marker(tl, headline.lastChild, { at: cue('phone book') + 0.2, color: 'var(--accent4)' });
}
