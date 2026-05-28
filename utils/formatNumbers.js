/**
 * Format large numbers to abbreviated form
 * 1000 -> 1k
 * 1100 -> 1.1k
 * 2500 -> 2.5k
 * 12000 -> 12k
 * 1500000 -> 1.5M
 * etc.
 */
export const formatCount = (count) => {
  if (typeof count !== 'number') {
    return '0';
  }

  if (count < 1000) {
    return count.toString();
  }

  if (count < 1000000) {
    const thousands = count / 1000;
    if (thousands % 1 === 0) {
      return `${thousands}k`;
    } else {
      return `${thousands.toFixed(1)}k`;
    }
  }

  if (count < 1000000000) {
    const millions = count / 1000000;
    if (millions % 1 === 0) {
      return `${millions}M`;
    } else {
      return `${millions.toFixed(1)}M`;
    }
  }

  const billions = count / 1000000000;
  if (billions % 1 === 0) {
    return `${billions}B`;
  } else {
    return `${billions.toFixed(1)}B`;
  }
}; 