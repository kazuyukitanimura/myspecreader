exports.definition = {
  config: {
    'columns': {
      'data': 'TEXT',
      'state': 'INTEGER',
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
    },
    STATES: {
      UNREAD: 0,
      PASSED: 1,
      VIEWSUMMARY: 2,
      VIEWORIGINAL: 3,
      STAR: 4,
      KEEPUNREAD: 254,
      DISLIKE: 255
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
