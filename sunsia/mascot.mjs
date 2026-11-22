// 퐁당이(물방울 마스코트): 납작한 색면 + 굵은 윤곽선 스티커 느낌. 기분: happy · worry · wow
const INK = '#245272';
export function mascotSVG(mood = 'happy', size = 96) {
  const eyes = mood === 'ouch'
    ? `<path d="M24.200 29.500l4.200 2-4.200 2M39.800 29.500l-4.200 2 4.200 2" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
    : mood === 'wow'
    ? `<circle cx="27" cy="31" r="2.6" fill="${INK}"/><circle cx="37" cy="31" r="2.6" fill="${INK}"/>`
    : mood === 'worry'
      ? `<circle cx="27" cy="31.500" r="1.900" fill="${INK}"/><circle cx="37" cy="31.500" r="1.900" fill="${INK}"/>`
      : `<path d="M24.800 31.200q2.200-3 4.400 0M34.800 31.200q2.200-3 4.400 0" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`;
  const brows = mood === 'worry' ? `<path d="M24.200 27.400l5-1.800M39.800 27.400l-5-1.800" stroke="${INK}" stroke-width="1.700" stroke-linecap="round" fill="none"/>` : '';
  const mouth = mood === 'ouch' ? `<path d="M28.500 37.500q1.200-1.600 2.400 0t2.400 0 2.400 0" fill="none" stroke="${INK}" stroke-width="1.700" stroke-linecap="round"/>`
    : mood === 'worry' ? `<path d="M29.200 38q2.800-2.400 5.600 0" fill="none" stroke="${INK}" stroke-width="1.800" stroke-linecap="round"/>`
    : mood === 'wow' ? `<ellipse cx="32" cy="37.500" rx="2" ry="2.600" fill="${INK}"/>`
    : `<path d="M28.600 35.600q3.400 4 6.800 0" fill="#fff" stroke="${INK}" stroke-width="1.800" stroke-linecap="round" stroke-linejoin="round"/>`;
  const sweat = mood === 'worry' ? `<path d="M49.500 21c1.600 2.200 2.600 3.600 2.600 4.900a2.600 2.600 0 0 1-5.200 0c0-1.300 1-2.700 2.600-4.900z" fill="#d9f1ff" stroke="${INK}" stroke-width="1.600" stroke-linejoin="round"/>` : '';
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true" class="mascot mascot-${mood}" style="cursor:pointer">
<path d="M32 10.500C37.500 18 45.500 23.500 45.500 32.500a13.500 13.500 0 0 1-27 0C18.500 23.500 26.500 18 32 10.500z" fill="#62c1f7" stroke="${INK}" stroke-width="1.900" stroke-linejoin="round"/>
<path d="M22.500 36.500c.6 5 4.300 8.500 9.500 8.800 4.300.2 8-2.200 9.600-5.800-2.500 1.700-5.400 2.400-8.500 1.900-4.400-.7-8.500-2.500-10.600-4.900z" fill="#3ba3e6"/>
<path d="M24.200 25.500c1-2.800 2.600-4.800 4.600-6.200" fill="none" stroke="#fff" stroke-width="2.400" stroke-linecap="round"/>
<path d="M32 10.500V6.500" stroke="${INK}" stroke-width="2.200" stroke-linecap="round"/>
<path d="M32 8c-1-4.500-5.500-5.800-9.500-4.500.1 3.800 3.800 5.800 9.500 4.500z" fill="#97dc3c" stroke="${INK}" stroke-width="1.500" stroke-linejoin="round"/>
<path d="M32 8c1-4.500 5.500-5.800 9.500-4.500-.1 3.800-3.800 5.800-9.500 4.500z" fill="#6cc22b" stroke="${INK}" stroke-width="1.500" stroke-linejoin="round"/>
${eyes}${brows}${mouth}<circle cx="22.500" cy="36.200" r="1.900" fill="#ff9db1"/><circle cx="41.500" cy="36.200" r="1.900" fill="#ff9db1"/>${sweat}</svg>`.replace(/(\d+\.\d)00/g, '$1');
}
