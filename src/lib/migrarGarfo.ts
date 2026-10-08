// Migração única: garfo_* -> vimo_* no localStorage
export function migrarChavesGarfoParaVimo(): void {
  try {
    const antigas: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('garfo_')) antigas.push(k);
    }
    antigas.forEach((k) => {
      const nova = 'vimo_' + k.slice('garfo_'.length);
      if (localStorage.getItem(nova) === null) {
        const valor = localStorage.getItem(k);
        if (valor !== null) localStorage.setItem(nova, valor);
      }
    });
  } catch {
    // armazenamento indisponível: ignora
  }
}
