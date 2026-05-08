export const renameKeys = (obj, newKeys) => {
    if (!obj || !newKeys) return obj || {};
    const entries = Object.keys(obj).map((key) => {
        const newKey = newKeys[key] || key;
        return { [newKey]: obj[key] };
    });
    return Object.assign({}, ...entries);
};
