Garden.readStorage = function readStorage(key, fallback) {
  try {
    const rawValue = localStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : fallback;
  } catch {
    return fallback;
  }
};

Garden.writeStorage = function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
};
