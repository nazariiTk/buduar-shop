const priceFormatter = new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 0 });

export function getName(item) {
  return item?.name || item?.name_uk || '';
}

export function formatPrice(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    return '0 ₴';
  }
  return `${priceFormatter.format(num)} ₴`;
}
