// Regressão: mapProfessionalSearchRow aceita as duas shapes de RPC
// (professional_id legado e id atual) e nunca produz id 'undefined'.
// Build: npx esbuild src/services/database.ts --bundle --format=esm \
//   --define:import.meta.env.VITE_SUPABASE_URL='"https://x.invalid"' \
//   --define:import.meta.env.VITE_SUPABASE_ANON_KEY='"x"' --outfile=/tmp/db-bundle.mjs
import assert from 'node:assert/strict';
const { mapProfessionalSearchRow } = await import('/tmp/db-bundle.mjs');

const legado = mapProfessionalSearchRow({ professional_id: 'p-legado', display_name: 'A', experience: '10 anos', specialization: 'NR-35, NR-10' });
assert.equal(legado.id, 'p-legado');
assert.equal(legado.nome, 'A');
assert.equal(legado.experiencia, 10);
assert.deepEqual(legado.especializacoes, ['NR-35', 'NR-10']);

const atual = mapProfessionalSearchRow({ id: 'p-atual', display_name: 'B', hourly_rate: 150 });
assert.equal(atual.id, 'p-atual');
assert.equal(atual.valorHora, 150);

const semId = mapProfessionalSearchRow({ display_name: null });
assert.equal(semId.id, '');
assert.notEqual(semId.id, 'undefined');
assert.equal(semId.nome, 'Profissional');

const ambos = mapProfessionalSearchRow({ professional_id: 'p1', id: 'p2' });
assert.equal(ambos.id, 'p1');

console.log('mapper-shapes: 4/4 PASS');
