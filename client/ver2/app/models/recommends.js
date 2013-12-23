exports.definition = {
  config: {
    'columns': {
      'data': 'TEXT',
      //'read': 'INTEGER',
      //'viewOriginal': 'INTEGER',
      //'star': 'INTEGER',
      'id': 'TEXT NOT NULL PRIMARY KEY'
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
