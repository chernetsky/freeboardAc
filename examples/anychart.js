(function() {
  var acGlobal;

  freeboard.loadWidgetPlugin({
    type_name: 'anychart_freeboard_plugin',
    display_name: 'Anychart',
    description: 'AnyChart -- <strong>best charting solutions!</strong>',
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
        name: 'type',
        display_name: 'Chart type',
        type: 'option',
        options: [
          {
            name: 'line',
            value: 'line'
          },
          {
            name: 'column',
            value: 'column'
          },
          {
            name: 'pie',
            value: 'pie'
          }
        ]
      },
      {
        name: 'size',
        display_name: 'Size',
        type: 'option',
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
    var code;
    var dataSet = acGlobal.data.set();
    var currentSettings = settings;
    var editorComplete = false;
    // var editorWrapper = $('<div id="editor-wrapper" style="z-index: 1000;"></div>');

    self.runEditor = function(){
      if (!editor) {
        editor = new acGlobal['chartEditor'];
        editor.step('data', false);
        editor.step('export', false);
        editor.data([
          {'x': 'Hello', 'value': 10},
          {'x': 'Freeboard', 'value': 20},
          {'x': 'World', 'value': 15}
        ]);
        editor.dialogRender();

        editor.listenOnce('editorComplete', function() {
          editorComplete = true;

          // Get from editor javascript code that creates configured chart
          code = editor['getJavascript']({
            'minify': true,
            'addData': false,
            'addMarkers': true,
            'wrapper': '',
            'container': ''
          });

          // Save code and close editor dialog
          self.closeEditor(code);
        });

        editor.listen('close', function(evt) {
          if (!editorComplete && evt.target === editor)
            self.closeEditor(null);
        });
      }

      editorComplete = false;
      editor.dialogVisible(true);
    };

    self.closeEditor = function(opt_code){
      if (opt_code)
        self.render(container);
    };

    self.render = function(element) {
      if (!code) {
        container = element;
        self.runEditor();
      } else {
        self.drawChart();
      }
    };

    self.drawChart = function () {
      if (chart) {
        chart.dispose();
      }

      var codeSplit = code.split(/\/\*=rawData.+rawData=\*\//);
      if (codeSplit.length === 2) {
        // Chart creation code part
        var code1 = '(function(){' + codeSplit[0] + 'return chart;})();';

        // Data apply and chart settings code part
        var code2 = '(function(){ return function(chart, rawData){' + codeSplit[1] + '}})();';
        console.log(code1, code2);

        // Create chart instance
        chart = eval(code1);

        if (!chart) return null;

        // Invoke second part of code: pass data and apply chart appearance settings
        var code2func = eval(code2);
        code2func.apply(null, [chart, dataSet.data()]);

        // todo: DEBUG
        // chart.data(dataSet);

        chart['container'](container);
        chart['draw']();
      }
    };

    self.getHeight = function() {
      var size = Number(currentSettings.size);
      return !isNaN(size) ? size : 2;
    };

    self.onSettingsChanged = function(newSettings) {
      console.log("onSettingsChanged", newSettings);
      currentSettings = newSettings;

      if (currentSettings.run_editor) {
        self.runEditor();
        currentSettings.run_editor = false;
        dataSet.append(currentSettings.data_source);
      } else {
        self.render(container);
      }
    };

    self.onCalculatedValueChanged = function(settingName, newValue) {
      switch (settingName) {
        case 'data_source':
          dataSet.append(newValue);
          break;
        case 'mapping':
          break;
      }
    };

    self.onDispose = function() {
      if (chart) {
        chart.dispose();
        dataSet.dispose();
      }
    };
  }
}());