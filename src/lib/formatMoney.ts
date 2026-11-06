// The API and the mobile app both use US dollars with two decimals.
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export const formatMoney = (amount: number) => usd.format(amount)
