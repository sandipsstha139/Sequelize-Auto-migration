export function diffSchemas(oldSchema, newSchema) {
  const actions = [];

  // New tables
  for (const table of Object.keys(newSchema)) {
    if (!oldSchema[table]) {
      actions.push({ type: "createTable", table, columns: newSchema[table] });
    }
  }

  // Removed tables
  for (const table of Object.keys(oldSchema)) {
    if (!newSchema[table]) {
      actions.push({ type: "dropTable", table });
    }
  }

  // Column changes inside existing tables
  for (const table of Object.keys(newSchema)) {
    if (!oldSchema[table]) continue;

    const oldCols = oldSchema[table];
    const newCols = newSchema[table];

    // New columns
    for (const col of Object.keys(newCols)) {
      if (!oldCols[col]) {
        actions.push({ type: "addColumn", table, column: col, def: newCols[col] });
      }
    }

    // Removed columns
    for (const col of Object.keys(oldCols)) {
      if (!newCols[col]) {
        actions.push({ type: "removeColumn", table, column: col });
      }
    }

    // Modified columns
    for (const col of Object.keys(newCols)) {
      if (!oldCols[col]) continue;

      if (JSON.stringify(oldCols[col]) !== JSON.stringify(newCols[col])) {
        actions.push({
          type: "changeColumn",
          table,
          column: col,
          def: newCols[col]
        });
      }
    }
  }

  return actions;
}
