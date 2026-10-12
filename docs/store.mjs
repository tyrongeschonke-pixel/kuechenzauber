export class LocalStore {
  constructor(name='kuechenzauber') { this.db = null; this.name=name; }
  async open() {
    this.db = await new Promise((resolve,reject) => {
      const request = indexedDB.open(this.name,1);
      request.onupgradeneeded = () => request.result.createObjectStore('data');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Bitte andere Küchenzauber-Fenster schließen.'));
    });
    this.db.onversionchange = () => this.db.close();
  }
  async get(key) {
    if (!this.db) return undefined;
    return new Promise((resolve,reject) => {
      const request = this.db.transaction('data').objectStore('data').get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  async save(values) {
    if (!this.db) throw new Error('Lokaler Speicher nicht verfügbar.');
    return new Promise((resolve,reject) => {
      const tx = this.db.transaction('data','readwrite');
      for (const [key,value] of Object.entries(values)) tx.objectStore('data').put(value,key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Speichern abgebrochen.'));
    });
  }
}
