exports.definition = {
  config: {
    'columns': {
      'data': 'TEXT',
      'read': 'Boolean',
      'viewOriginal': 'Boolean',
      'star': 'Boolean',
      'id': 'INTEGER PRIMARY KEY AUTOINCREMENT'
    },
    'adapter': {
      'type': 'sql',
      'collection_name': 'recommends',
      'db_file': '/recommends.sqlite', // preload
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
