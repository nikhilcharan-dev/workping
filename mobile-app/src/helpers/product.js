export const getDiscountAmount = (product) => {
    if (!product?.sale) return 0;
    if (product.sale.type === "amount") return product.sale.discount;
    if (product.sale.type === "percent") return (product.price * product.sale.discount) / 100;
    return 0;
};

export const getCalculatedPrice = (product) => {
    if (!product?.price) return 0;
    return product.price - getDiscountAmount(product);
};

export const getPreciseCurrency = (price) => {
    const num = Number(price);
    return isNaN(num) ? "0.00" : num.toFixed(2);
};
