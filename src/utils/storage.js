export const saveBills = (bills) => {
    localStorage.setItem('bills', JSON.stringify(bills));
};

export const getBills = () => {
    const stored = localStorage.getItem('bills');
    return stored ? JSON.parse(stored) : [];
};