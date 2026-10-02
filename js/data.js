window.Bar = window.Bar || {};

Bar.COCKTAILS = [
  {
    id: 'honey-im-home',
    name: "Honey, I'm Home",
    tagline: 'Gin, honey and fresh mint',
    glass: 'highball',
    color: '#E8A93B',
    method: 'Muddle mint, build over ice',
    effect: 'honeyDrip',
    ingredients: [
      { label: 'Fresh mint', amount: '', piece: 'mint' },
      { label: 'Honey', amount: '', piece: 'honey' },
      { label: 'Gin', amount: '', piece: 'splash' },
      { label: 'Ice', amount: '', piece: 'ice' }
    ]
  },
  {
    id: 'monkey-on-the-loose',
    name: 'Monkey on the Loose',
    tagline: 'Whiskey with a fresh lemon kick',
    glass: 'rocks',
    color: '#C2691F',
    method: 'Build over ice',
    effect: 'iceClink',
    ingredients: [
      { label: 'Mint', amount: '', piece: 'mint' },
      { label: 'Lemon juice', amount: '30ml', piece: 'lemon' },
      { label: 'Simple syrup', amount: '30ml', piece: 'splash' },
      { label: 'Whiskey', amount: '60ml', piece: 'splash' }
    ]
  },
  {
    id: 'rain-check',
    name: 'Rain Check',
    tagline: 'Gin, basil and lemon, shaken cold',
    glass: 'coupe',
    color: '#7FB43A',
    method: 'Muddle basil, shake with ice, strain',
    effect: 'shakeFoam',
    ingredients: [
      { label: 'Basil', amount: '', piece: 'basil' },
      { label: 'Lemon', amount: '', piece: 'lemon' },
      { label: 'Simple syrup', amount: '15ml', piece: 'splash' },
      { label: 'Gin', amount: '', piece: 'splash' },
      { label: 'Ice (shaken)', amount: '', piece: 'ice' }
    ]
  },
  {
    id: 'pineapple-express',
    name: 'Pineapple Express',
    tagline: 'Tequila, pineapple and ginger fizz',
    glass: 'highball',
    color: '#F2A33A',
    method: 'Muddle pineapple, lemon & mint; top with soda',
    effect: 'bubbles',
    ingredients: [
      { label: 'Pineapple', amount: '', piece: 'pineapple' },
      { label: 'Lemon', amount: '', piece: 'lemon' },
      { label: 'Mint', amount: '', piece: 'mint' },
      { label: 'Tequila', amount: '', piece: 'splash' },
      { label: 'Ginger lemon soda', amount: '', piece: 'splash' }
    ]
  }
];
