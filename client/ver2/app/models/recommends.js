exports.definition = {
  config: {
    'columns': {
      'data': 'TEXT',
      'state': 'INTEGER',
      // 0: unread, 1: passed, 2: viewSummary, 3: viewOriginal, 4: keepUnread, 5: star
      'id': 'TEXT NOT NULL PRIMARY KEY'
    },
    'defaults': {
      'state': 0,
    },
    'adapter': {
      'type': 'sql',
      'collection_name': 'recommends',
      'db_name': 'recommends',
      'idAttribute': 'id'
    }
  },

  extendModel: function(Model) {
    _.extend(Model.prototype, {
      // Extend, override or implement Backbone.Model
    });

    return Model;
  },

  extendCollection: function(Collection) {
    _.extend(Collection.prototype, {
      // Extend, override or implement Backbone.Collection
    });

    return Collection;
  }
};
