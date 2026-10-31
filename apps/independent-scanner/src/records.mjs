// Immutable record files plus one atomic index commit keep interrupted edits recoverable.
// The driver supplies durable files and an OS-native preference index.
export function createRecords(driver) {
  let chain = Promise.resolve();
  const serialize = fn => {
    const next = chain.catch(() => {}).then(fn);
    chain = next;
    return next;
  };
  const index = async () => JSON.parse(await driver.readIndex() || '{}');
  return {
    read(key) { return serialize(async () => { const map = await index(); return map[key] ? JSON.parse(await driver.read(map[key])) : null; }); },
    batch(entries, deleted = []) { return serialize(async () => {
      const previous = await index(), next = { ...previous }, created = [];
      try {
        for (const [key, value] of entries) {
          const path = 'records/' + driver.uuid() + '.json';
          await driver.write(path, JSON.stringify(value)); created.push(path); next[key] = path;
        }
        for (const key of deleted) delete next[key];
        await driver.writeIndex(JSON.stringify(next));
      } catch (error) {
        // Do not delete new files: an interrupted index acknowledgment might already reference them.
        throw error;
      }
      const retained = new Set(Object.values(next));
      for (const path of Object.values(previous)) if (!retained.has(path)) await driver.remove(path).catch(() => {});
    }); }
  };
}
