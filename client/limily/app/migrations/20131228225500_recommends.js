migration.up = function(migrator) {
  migrator.createTable({
    "columns": {
      'data': 'TEXT',
      'state': 'INTEGER',
      'id': 'TEXT NOT NULL PRIMARY KEY'
    }
  });
};

migration.down = function(migrator) {
  migrator.dropTable("recommends");
};
