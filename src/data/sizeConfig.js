// Size + Material configurations per product category
export const SIZE_CONFIG = {
  rings: {
    label: 'Ring Size',
    sizes: ['4', '5', '6', '7', '8', '9', '10', '11', '12'],
    unit: 'US',
    materials: ['18k Gold', 'Sterling Silver', 'Platinum', 'Rose Gold', 'White Gold'],
    materialLabel: 'Material',
  },
  necklaces: {
    label: 'Length',
    sizes: ['14"', '16"', '18"', '20"', '22"', '24"'],
    unit: 'inches',
    materials: ['18k Gold', 'Sterling Silver', 'Platinum', 'Rose Gold', 'Pearl'],
    materialLabel: 'Material',
  },
  bracelets: {
    label: 'Bracelet Size',
    sizes: ['XS (6")', 'S (6.5")', 'M (7")', 'L (7.5")', 'XL (8")'],
    unit: 'inches',
    materials: ['18k Gold', 'Sterling Silver', 'Platinum', 'Rose Gold'],
    materialLabel: 'Material',
  },
  earrings: {
    label: 'Size',
    sizes: ['Small', 'Medium', 'Large'],
    unit: '',
    materials: ['18k Gold', 'Sterling Silver', 'Platinum', 'Rose Gold', 'Pearl'],
    materialLabel: 'Material',
  },
  watches: {
    label: 'Case Size',
    sizes: ['36mm', '38mm', '40mm', '42mm', '44mm'],
    unit: 'mm',
    materials: ['Analog', 'Digital', 'Chronograph', 'Smart', 'Automatic'],
    materialLabel: 'Type',
  },
  anklets: {
    label: 'Length',
    sizes: ['9"', '10"', '11"'],
    unit: 'inches',
    materials: ['18k Gold', 'Sterling Silver', 'Rose Gold'],
    materialLabel: 'Material',
  },
  pendants: {
    label: 'Chain Length',
    sizes: ['16"', '18"', '20"', '22"'],
    unit: 'inches',
    materials: ['18k Gold', 'Sterling Silver', 'Platinum', 'Rose Gold', 'Diamond'],
    materialLabel: 'Material',
  },
  charms: {
    label: 'Size',
    sizes: ['One Size'],
    unit: '',
    materials: ['18k Gold', 'Sterling Silver', 'Enamel'],
    materialLabel: 'Material',
  },
  default: {
    label: 'Size',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    unit: '',
    materials: ['18k Gold', 'Sterling Silver', 'Platinum', 'Rose Gold'],
    materialLabel: 'Material',
  },
};

export const getSizeConfig = (category) => {
  return SIZE_CONFIG[category?.toLowerCase()] || SIZE_CONFIG.default;
};

export const getStockForSelection = (product, size = '') => {
  if (!product) return 0;

  if (product.hasSize !== false && product.sizeStock && size) {
    const value = product.sizeStock[size];

    if (value === false) return 0;
    if (value === true) return Number(product.quantity) || 0;
    if (value === undefined || value === null || value === '') return Number(product.quantity) || 0;

    return Math.max(0, Number(value) || 0);
  }

  return Math.max(0, Number(product.quantity) || 0);
};

export const isSizeInStock = (product, size) => {
  return getStockForSelection(product, size) > 0;
};