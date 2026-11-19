const villageSprites = {
  manager: {
    colors: { o: '#3d2832', h: '#71483e', s: '#f5ba86', e: '#392933', c: '#645a80', l: '#a399ba', w: '#fff1c9' },
    pixels: [
      '.....oooooo.....', '....ohhhhhho....', '...ohhhhhhhho...', '...ohhhhhhhho...',
      '...ohsssshho...', '...osessesho...', '....ossssso....', '.....osso......',
      '....ocwwco.....', '...occllcco....', '...oscllcso....', '....occcco.....',
      '.....occo......', '.....o..o......', '....oo..oo.....'
    ]
  }
};

const residentPalettes = {
  coco: { outline: '#574033', fur: '#e9af64', shade: '#b87845', cream: '#fff0c8', pink: '#f39b97', eyes: '#422d35', scarf: '#80a067' },
  bori: { outline: '#232231', fur: '#55556e', shade: '#38384f', cream: '#fff2db', pink: '#e99aa5', eyes: '#262130', scarf: '#77a9b3' },
  lulu: { outline: '#44384b', fur: '#a58da9', shade: '#695875', cream: '#fff0de', pink: '#f3a5af', eyes: '#3d3146', scarf: '#df9a61' },
  chichi: { outline: '#56303b', fur: '#bc7762', shade: '#8e514b', cream: '#ffe4c4', pink: '#f3a1a8', eyes: '#4a2934', scarf: '#d8839f' },
  mochi: { outline: '#705b46', fur: '#f4e3bc', shade: '#c9ad82', cream: '#fff4dc', pink: '#eeac9c', eyes: '#493b31', scarf: '#788144' },
  'shrine-cat': { outline: '#30262e', fur: '#57505c', shade: '#8b5548', cream: '#ffebce', pink: '#d28f85', eyes: '#cf974c', scarf: '#423962' }
};

function drawResidentCat(context, id, motion, direction, time) {
  const { outline, fur, shade, cream, pink, eyes, scarf } = residentPalettes[id];
  const stride = motion === 'walking' ? Math.floor(time / 125) % 2 : 0;
  const sitting = motion === 'sitting';
  const blink = Math.floor(time / 160) % 27 === 26;
  const block = (color, x, y, width, height) => {
    context.fillStyle = color;
    context.fillRect(direction < 0 ? 24 - x - width : x, sitting ? Math.min(y + 2, 22) : y, width, height);
  };
  context.clearRect(0, 0, 24, 24);
  block('#35271447', 6, 22, 13, 2);

  // Separate legs, hands and a short tail keep the upright villager silhouette.
  block(outline, 17, 17, 4, 3);
  block(fur, 19, 16, 2, 2);
  block(outline, 7, 15, 10, 6);
  block(scarf, 8, 15, 8, 5);
  block(cream, 11, 15, 2, 1);
  block(shade, 11, 17, 2, 1);
  block(fur, 6, 17, 2, 3);
  block(fur, 16, 17, 2, 3);
  block(outline, 8, sitting ? 18 : 20 - stride, 3, 3);
  block(outline, 13, sitting ? 18 : 20 + stride, 3, 3);
  block(cream, 8, sitting ? 19 : 21 - stride, 3, 1);
  block(cream, 13, sitting ? 19 : 21 + stride, 3, 1);

  // Tapered ears and a rounded head read like a toy cat at map scale.
  block(outline, 6, 2, 2, 6);
  block(outline, 8, 4, 2, 4);
  block(outline, 16, 2, 2, 6);
  block(outline, 14, 4, 2, 4);
  block(pink, 7, 4, 1, 3);
  block(pink, 16, 4, 1, 3);
  block(outline, 7, 6, 10, 10);
  block(outline, 5, 8, 14, 5);
  block(fur, 7, 7, 10, 7);
  block(fur, 6, 9, 12, 4);
  block(cream, 8, 12, 8, 3);
  block(pink, 7, 12, 2, 1);
  block(pink, 15, 12, 2, 1);
  block(eyes, 9, 10, 1, blink ? 1 : 2);
  block(eyes, 14, 10, 1, blink ? 1 : 2);
  block(shade, 11, 12, 2, 1);
  block(eyes, 11, 13, 2, 1);
  if (id === 'mochi') {
    block(cream, 6, 10, 6, 4);
    block(eyes, 9, 10, 2, 1);
    block(eyes, 13, 10, 2, 1);
    block(outline, 6, 16, 12, 4);
    block(scarf, 7, 16, 10, 4);
    block('#a3a35a', 9, 19, 5, 1);
    block(cream, 10, 16, 1, 2);
    block(cream, 14, 16, 1, 2);
    block('#ce5e78', 11, 15, 3, 4);
    block('#ffa9b0', 11, 15, 3, 1);
  } else if (id === 'shrine-cat') {
    block('#aa494b', 7, 7, 10, 1);
    block('#e2ad55', 11, 6, 2, 2);
    block(scarf, 7, 17, 10, 4);
    block('#b84b4b', 8, 18, 8, 1);
    block(cream, 6, 15, 2, 3);
    block(cream, 16, 15, 2, 3);
    block('#719783', 16, 18, 2, 1);
    block('#e8b05a', 5, 17, 3, 2);
    block('#ffe4a1', 6, 16, 1, 1);
  }
}

function drawVillageSprite(context, id, motion, direction, time) {
  if (id !== 'manager' && id !== 'diver') { drawResidentCat(context, id, motion, direction, time); return; }
  const { pixels, colors: outfit } = villageSprites.manager;
  const colors = id === 'diver' ? { ...outfit, h: '#173c52', c: '#1c5868', l: '#67bdd0', w: '#ffb968' } : outfit;
  const sitting = motion === 'sitting';
  const stride = motion === 'walking' && Math.floor(time / 130) % 2;
  context.clearRect(0, 0, 16, 16);
  context.fillStyle = '#35271455';
  context.fillRect(4, 14, 8, 2);
  for (const [y, row] of pixels.entries()) {
    for (const [x, pixel] of Array.from(row).entries()) {
      if (!colors[pixel]) continue;
      context.fillStyle = colors[pixel];
      const offset = stride && y > 12 && x < 7 ? -1 : 0;
      if (!sitting || y < 12) context.fillRect(direction < 0 ? 15 - x : x, y + offset + (sitting ? 2 : 0), 1, 1);
    }
  }
  if (id === 'diver') {
    context.fillStyle = '#23526c';
    context.fillRect(4, 5, 8, 3);
    context.fillStyle = '#9ceaf0';
    context.fillRect(5, 5, 5, 2);
    context.fillStyle = '#ffc575';
    context.fillRect(direction < 0 ? 11 : 3, 8, 2, 5);
  }
  if (sitting) {
    context.fillStyle = colors.c;
    context.fillRect(4, 13, 8, 2);
    context.fillStyle = colors.o;
    context.fillRect(4, 15, 3, 1);
    context.fillRect(9, 15, 3, 1);
  }
}
