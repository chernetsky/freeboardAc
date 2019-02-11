(function() {
  var acGlobal;

  freeboard.loadWidgetPlugin({
    type_name: 'anychart_freeboard_plugin',
    display_name: 'Anychart',
    description: '<strong>AnyChart</strong> -- best charting solutions!',
    external_scripts: [
      'https://cdn.anychart.com/releases/8.5.0/js/anychart-bundle.min.js',
      'plugins/thirdparty/anychart-editor.min.js',
      'plugins/thirdparty/anychart-editor.min.css'
    ],

    fill_size: true,
    settings: [
      {
        name: 'data_source',
        display_name: 'Data source',
        type: 'calculated',
        multi_input: true,
        required: true,
        default_value: [[1, 0, 3, 6, 10]]
      },
      {
        name: 'max_points',
        display_name: 'Maximum points',
        type: 'number',
        default_value: 5
      },
      {
        name: 'size',
        display_name: 'Size',
        type: 'option',
        default_value: 4,
        options: [
          {
            name: '2',
            value: 2
          },
          {
            name: '3',
            value: 3
          },
          {
            name: '4',
            value: 4
          },
          {
            name: '5',
            value: 5
          }
        ]
      },
      {
        name: 'run_editor',
        display_name: 'Run editor',
        type: 'boolean',
        default_value: true,
        description: 'Run chart editor after close this dialog'
      },
      {
        name: 'chart_code',
        display_name: 'Chart code',
        type: 'calculated'
      }
    ],

    newInstance: function(settings, newInstanceCallback) {
      acGlobal = window['anychart'];
      newInstanceCallback(new anychartWidget(settings));
    }
  });

  var anychartWidget = function(settings) {
    var self = this;
    var container;
    var editor;
    var chart;
    var dataSet = acGlobal.data.set();
    var currentSettings = settings;
    var editorComplete = false;

    self.render = function(element) {
      container = element;
      if (currentSettings.chart_code)
        self.drawChart();
    };

    self.drawChart = function () {
      if (chart)
        chart.dispose();

      var codeSplit = currentSettings.chart_code.split(/\/\*=rawData.+rawData=\*\//);
      if (codeSplit.length === 2) {
        // Chart creation code part
        var code1 = '(function(){' + codeSplit[0] + 'return chart;})();';

        // Data apply and chart settings code part
        var code2 = '(function(){ return function(chart, dataSet){' + codeSplit[1] + '}})();';

        // Create chart instance
        chart = eval(code1);

        if (!chart) return null;

        // Invoke second part of code: pass data and apply chart appearance settings
        var code2func = eval(code2);
        code2func.apply(null, [chart, dataSet]);

        chart['container'](container);
        chart['draw']();
      }
    };

    self.onCalculatedValueChanged = function(settingName, newValue) {
      //console.log("onCalculatedValueChanged", settingName, newValue);
      switch (settingName) {
        case 'data_source': {
          dataSet.append(newValue);
          if (dataSet.getRowsCount() > currentSettings.max_points)
            dataSet.remove(0);

          if (!currentSettings.chart_code) {
            self.runEditor();
            currentSettings.run_editor = false;
          }
          break;
        }
      }
    };

    self.runEditor = function() {
      if (!editor) {
        editor = new acGlobal['chartEditor'];
        editor.step('data', false);
        editor.step('export', false);
        editor.data({data: dataSet});
        editor.dialogRender();

        editor.listen('editorComplete', function() {
          editorComplete = true;

          // Get from editor javascript code that creates configured chart
          currentSettings.chart_code = editor['getJavascript']({
            'minify': true,
            'addData': false,
            'addMarkers': true,
            'wrapper': '',
            'container': ''
          });

          self.closeEditor(true);
        });

        editor.listen('close', function(evt) {
          if (!editorComplete && evt.target === editor)
            self.closeEditor(false);
        });
      }

      editorComplete = false;
      editor.dialogVisible(true);
    };

    self.closeEditor = function(update){
      editor.dispose();
      editor = null;

      if (update)
        self.render(container);
    };

    self.onSettingsChanged = function(newSettings) {
      var previousSettings = Object.assign(currentSettings);
      currentSettings = newSettings;

      if (newSettings.run_editor) {
        self.runEditor();
        newSettings.run_editor = false;
      } else {
        self.render(container);
      }

      if (previousSettings.max_points !== newSettings.max_points) {
        newSettings.max_points = newSettings.max_points > 0 ? newSettings.max_points : previousSettings.max_points;
        var rowsToRemove = dataSet.getRowsCount() - newSettings.max_points;
        for (; rowsToRemove > 0; rowsToRemove--) {
          dataSet.remove(0);
        }
      }
    };

    self.getHeight = function() {
      var size = Number(currentSettings.size);
      return !isNaN(size) ? size : 2;
    };

    self.onDispose = function() {
      if (chart) {
        chart.dispose();
        dataSet.dispose();
      }
    };
  }
}());