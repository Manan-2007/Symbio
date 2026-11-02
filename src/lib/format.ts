export const number = (value: number) => value.toLocaleString("en-IN", { maximumFractionDigits: 3 });
export const kg = (value: number) => `${number(value)} kg`;
export const money = (value: number) => `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
export const pricePerKg = (value: number) => value === 0 ? "Free" : `${money(value)}/kg`;
