window.Bar = window.Bar || {};

// `featured: true` drinks are built glass by glass in the scroll menu; every drink
// shows up in "Browse the full bar". To promote a drink to the scroll menu, set
// `featured: true` (its ingredient `piece` values must exist in stage3d/pieces.js).
Bar.COCKTAILS = [
  {
    id: 'honey-im-home',
    name: "Honey, I'm Home",
    tagline: 'Gin, honey and fresh mint',
    spirit: 'Gin',
    featured: true,
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
    spirit: 'Whiskey',
    featured: true,
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
    spirit: 'Gin',
    featured: true,
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
    spirit: 'Tequila',
    featured: true,
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
  },
  {
    id: 'wide-awake',
    name: 'Wide Awake',
    tagline: 'Vodka, coffee liqueur and fresh espresso',
    spirit: 'Vodka',
    glass: 'coupe',
    color: '#6B4226',
    method: 'Shake hard with ice, strain, float three coffee beans',
    effect: 'shakeFoam',
    ingredients: [
      { label: 'Vodka', amount: '50ml', piece: 'splash' },
      { label: 'Coffee liqueur', amount: '20ml', piece: 'splash' },
      { label: 'Fresh espresso', amount: '30ml', piece: 'splash' },
      { label: 'Simple syrup', amount: '10ml', piece: 'splash' },
      { label: 'Ice (shaken)', amount: '', piece: 'ice' },
      { label: 'Coffee beans', amount: '3', piece: 'bean', count: 3 }
    ]
  },
  {
    id: 'mint-condition',
    name: 'Mint Condition',
    tagline: 'Rum, lime and a mountain of mint',
    spirit: 'Rum',
    glass: 'highball',
    color: '#B6E27A',
    method: 'Muddle mint and lime, add rum, top with soda',
    effect: 'bubbles',
    ingredients: [
      { label: 'Fresh mint', amount: '', piece: 'mint' },
      { label: 'Lime juice', amount: '30ml', piece: 'lime' },
      { label: 'Simple syrup', amount: '20ml', piece: 'splash' },
      { label: 'White rum', amount: '50ml', piece: 'splash' },
      { label: 'Soda water', amount: '', piece: 'splash' }
    ]
  },
  {
    id: 'side-hustle',
    name: 'Side Hustle',
    tagline: 'Cognac, orange liqueur and lemon, sugar-rimmed',
    spirit: 'Brandy',
    glass: 'coupe',
    color: '#D9822B',
    method: 'Shake with ice, strain into a sugar-rimmed coupe',
    effect: 'shakeFoam',
    ingredients: [
      { label: 'Cognac', amount: '50ml', piece: 'splash' },
      { label: 'Orange liqueur', amount: '20ml', piece: 'splash' },
      { label: 'Lemon juice', amount: '20ml', piece: 'lemon' },
      { label: 'Ice (shaken)', amount: '', piece: 'ice' }
    ]
  },
  {
    id: 'spritz-happens',
    name: 'Spritz Happens',
    tagline: 'Prosecco, Aperol and a splash of soda',
    spirit: 'Prosecco',
    glass: 'highball',
    color: '#FF6B3D',
    method: 'Build over ice, top with soda, garnish with orange',
    effect: 'bubbles',
    ingredients: [
      { label: 'Ice', amount: '', piece: 'ice' },
      { label: 'Prosecco', amount: '90ml', piece: 'splash' },
      { label: 'Aperol', amount: '60ml', piece: 'splash' },
      { label: 'Soda water', amount: '30ml', piece: 'splash' },
      { label: 'Orange slice', amount: '', piece: 'orange' }
    ]
  },
  {
    id: 'smoke-signal',
    name: 'Smoke Signal',
    tagline: 'Mezcal, grapefruit and lime with a salt rim',
    spirit: 'Mezcal',
    glass: 'rocks',
    color: '#F28B73',
    method: 'Build over ice in a salt-rimmed glass',
    effect: 'iceClink',
    garnish: 'lime',
    ingredients: [
      { label: 'Mezcal', amount: '50ml', piece: 'splash' },
      { label: 'Grapefruit juice', amount: '60ml', piece: 'splash' },
      { label: 'Lime juice', amount: '15ml', piece: 'lime' },
      { label: 'Agave syrup', amount: '10ml', piece: 'splash' },
      { label: 'Ice', amount: '', piece: 'ice' }
    ]
  },
  {
    id: 'old-faithful',
    name: 'Old Faithful',
    tagline: 'Bourbon, sugar and bitters, stirred slow',
    spirit: 'Whiskey',
    glass: 'rocks',
    color: '#A65A1E',
    method: 'Stir over one large cube, garnish with an orange slice',
    effect: 'iceClink',
    garnish: 'orange',
    ingredients: [
      { label: 'Sugar cube', amount: '', piece: 'sugar' },
      { label: 'Angostura bitters', amount: '3 dashes', piece: 'splash' },
      { label: 'Bourbon', amount: '60ml', piece: 'splash' },
      { label: 'Large ice cube', amount: '', piece: 'ice' },
      { label: 'Orange slice', amount: '', piece: 'orange' }
    ]
  }
];

Bar.FEATURED = Bar.COCKTAILS.filter(c => c.featured);
