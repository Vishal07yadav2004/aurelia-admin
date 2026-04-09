// Default fallback products — admin can override these from Firebase
export const bestSellers = [
  { id: 1,  name: 'Heirloom Watch',          price: 2990, category: 'watches',   image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400&q=80' },
  { id: 2,  name: 'Gold Signet Ring',         price: 890,  category: 'rings',     image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&q=80' },
  { id: 3,  name: 'Diamond Tennis Bracelet',  price: 3500, category: 'bracelets', image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400&q=80' },
  { id: 4,  name: 'Platinum Chronograph',     price: 4800, category: 'watches',   image: 'https://images.unsplash.com/photo-1434056886845-dac89ffe9b56?w=400&q=80' },
  { id: 5,  name: 'Sapphire Solitaire',       price: 2100, category: 'rings',     image: 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=400&q=80' },
  { id: 6,  name: 'Cuban Link Chain',         price: 650,  category: 'necklaces', image: 'https://images.unsplash.com/photo-1598560917807-1bae44bd2be8?w=400&q=80' },
  { id: 7,  name: 'Classic Diamond Ring',     price: 1850, category: 'rings',     image: 'https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?w=400&q=80' },
  { id: 8,  name: 'Pearl Drop Earrings',      price: 420,  category: 'earrings',  image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400&q=80' },
];

export const newArrivals = [
  { id: 9,  name: 'Eternity Pearl Drops',     price: 650,  category: 'earrings',  image: 'https://images.unsplash.com/photo-1573408301185-9519f94815b9?w=400&q=80' },
  { id: 10, name: 'Onyx Statement Necklace',  price: 1100, category: 'necklaces', image: 'https://images.unsplash.com/photo-1599459183200-59c7687a0c70?w=400&q=80' },
  { id: 11, name: 'Vintage Emerald Ring',     price: 4200, category: 'rings',     image: 'https://images.unsplash.com/photo-1583292650898-7d22cd27ca6f?w=400&q=80' },
  { id: 12, name: 'Minimalist Gold Choker',   price: 850,  category: 'necklaces', image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&q=80' },
  { id: 13, name: 'Rose Gold Cuff',           price: 550,  category: 'bracelets', image: 'https://images.unsplash.com/photo-1576022162916-77c28f32e4e3?w=400&q=80' },
  { id: 14, name: 'Freshwater Pearl Choker',  price: 490,  category: 'necklaces', image: 'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=400&q=80' },
  { id: 15, name: '18k Gold Bangle',          price: 1200, category: 'bracelets', image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400&q=80' },
  { id: 16, name: 'Moonstone Ring',           price: 720,  category: 'rings',     image: 'https://images.unsplash.com/photo-1589674781759-c21c37956a44?w=400&q=80' },
];

export const allProducts = [...bestSellers, ...newArrivals];