migration.up = function(migrator) {
  migrator.createTable({
    "columns": {
      'data': 'TEXT',
      'state': 'INTEGER', // 0: unread, 1: passed, 2: viewSummary, 3: viewOriginal, 4: keepUnread, 5: star
      'id': 'TEXT NOT NULL PRIMARY KEY'
    }
  });
};

migration.down = function(migrator) {
  migrator.dropTable("recommends");
};
