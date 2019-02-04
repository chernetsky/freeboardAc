(function() {
  var acGlobal;


  freeboard.loadWidgetPlugin({
    "type_name": "anychart_freeboard_plugin",

    "display_name": "Anychart Freeboard",

    "description": "AnyChart -- <strong>best charting solutions!</strong>",

    "external_scripts": [
      "https://cdn.anychart.com/releases/8.5.0/js/anychart-bundle.min.js"
    ],

    "fill_size": true,
    "settings": [
      {
        "name": "type",
        "display_name": "Chart type",
        "type": "option",
        "options": [
          {
            "name": "line",
            "value": "line"
          },
          {
            "name": "column",
            "value": "column"
          },
          {
            "name": "pie",
            "value": "pie"
          }
        ]
      },
      {
        "name": "size",
        "display_name": "Size",
        "type": "option",
        "options": [
          {
            "name": "2",
            "value": 2
          },
          {
            "name": "3",
            "value": 3
          },
          {
            "name": "4",
            "value": 4
          },
          {
            "name": "5",
            "value": 5
          }
        ]
      }
    ],

    newInstance: function(settings, newInstanceCallback) {
      acGlobal = window['anychart'];
      newInstanceCallback(new anychartWidget(settings));
    }
  });


  var anychartWidget = function(settings) {
    var self = this;
    var chart;
    var container;
    var currentSettings = settings;

    self.render = function(containerElement) {
      if (!chart) {
        container = containerElement;
        chart = acGlobal[currentSettings.type]([1, 4, 6, 3]);
        chart.container(containerElement);
        chart.draw();
      }
      console.log('render() call', currentSettings.type);
    };

    self.getHeight = function() {
      var size = Number(currentSettings.size);
      return !isNaN(size) ? size : 2;
    };

    self.onSettingsChanged = function(newSettings) {
      var oldType = currentSettings.type;
      currentSettings = newSettings;

      if (newSettings.type !== oldType && chart) {
        console.log("chart.dispose()");
        chart.dispose();
        chart = null;
        self.render(container);
      }
    };


    self.onDispose = function() {
      if (chart)
        chart.dispose();
    };
  }
}());