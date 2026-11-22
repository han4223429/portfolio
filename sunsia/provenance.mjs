// Traceability only: input assertions are neither source verification nor contract prices.
// Keep input rows separately; an observation ID must never become a purchase SKU.
export function provenanceColumns(data, menuId) {
  const tables = [
    ['menus', 'MENU', null],
    ['ingredients', 'ORIGINAL', 'ingredient_id'],
    ['candidates', 'CANDIDATE', 'candidate_ingredient_id'],
  ];
  const inputs = tables.flatMap(([table, role, skuField]) =>
    (data[table] || []).flatMap((row, index) => row.menu_id === menuId ? [{
      input_table: table,
      input_row_number: index + 1,
      role,
      purchase_sku: skuField ? (row[skuField] ?? '') : '',
      // All supplied keys are retained, including source IDs, observation IDs,
      // date variants, unit, data_kind, and unknown future source columns.
      input_row: {...row},
    }] : []));
  return {
    provenance_scope: 'MENU_INPUT_CONTEXT_NOT_SELECTION_OR_PURCHASE_PROOF',
    provenance_verification: 'NOT_VERIFIED',
    input_provenance_json: JSON.stringify({schema_version: 1, menu_id: menuId, inputs}),
  };
}
