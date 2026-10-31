// Only a native file reference is stored before the encrypted Accounting import.
// Entry context is encrypted with the signed-in account's existing device vault.
export function pendingScan(storage, vault) {
  const requestKey = 'ojm-native-request214', resultKey = 'ojm-native-result214';
  const label = actor => actor + ':native-scan214';
  const read = key => JSON.parse(storage.getItem(key) || 'null');
  function context() {
    const envelope = read(requestKey), v = vault();
    if (!envelope || !v?.unlocked || envelope.actor !== v.actor) return null;
    return v.unpack(envelope, label(v.actor));
  }
  return {
    start(value) {
      const v = vault();
      if (!v?.unlocked || v.actor !== value.owner) throw Error('Sign in again before scanning.');
      if (read(requestKey)) throw Error('An unfinished native scan must be recovered in its original account first.');
      const request = { ...value, id: crypto.randomUUID() };
      storage.setItem(requestKey, JSON.stringify(v.pack(request, label(v.actor))));
      return request;
    },
    context,
    record(result) {
      const envelope = read(requestKey);
      if (!envelope) throw Error('The scan has no saved Accounting destination.');
      const request = context();
      if (request && result.requestId && result.requestId !== request.id) throw Error('The returned scan belongs to another capture session.');
      if (read(resultKey)) throw Error('A scan is already waiting to be imported.');
      const paths = result.scannedImages;
      if (!Array.isArray(paths) || paths.some(p => typeof p !== 'string' || !/^(file:\/\/|content:\/\/|\/)/.test(p))) throw Error('The native scanner returned invalid page files.');
      storage.setItem(resultKey, JSON.stringify({ paths, acknowledged: [] }));
    },
    pending() {
      const request = context(), result = read(resultKey);
      return request && result ? { ...request, ...result } : null;
    },
    acknowledge(id, index) {
      const request = context(), result = read(resultKey);
      if (!request || request.id !== id || !result) throw Error('The scan account changed before saving completed.');
      if (!result.acknowledged.includes(index)) result.acknowledged.push(index);
      storage.setItem(resultKey, JSON.stringify(result));
    },
    assertComplete(id) {
      const job=this.pending();
      if(!job||job.id!==id||!job.paths.every((_,i)=>job.acknowledged.includes(i)))throw Error('Protect every returned page before finishing.');
    },
    complete(id) {
      this.assertComplete(id);
      storage.removeItem(resultKey);storage.removeItem(requestKey);
    },
    cancel(id) {
      if (context()?.id !== id || read(resultKey)) throw Error('A returned scan must be saved before clearing it.');
      storage.removeItem(requestKey);
    }
  };
}
