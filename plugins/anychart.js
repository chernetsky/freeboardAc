(function() {
  /**
   * Global options for all anychart products
   */
  var acConfig = {
    credits: {
      // You can customize following settings if you've provided valid license key.
      // Otherwise they are ignored.

      // enabled: true,
      // text: "",
      // url: "",
      // logoSrc: "",

      licenseKey: ""
    },

    //localization: {
      // inputLocale: "",
      // outputLocale: "",
      // inputDateTimeFormat: "",
      // outputDateFormat: "",
      // outputDateTimeFormat: "",
      // outputTimeFormat: "",
      // outputTimezone: ""
    //},


    /**
     * Default theme
     *
     * To use additional themes you should include appropriate theme scripts to dashboard.
     * You can find all additional scripts here: https://www.anychart.com/download/cdn
     *
     * For example, to be able to use the 'darkBlue' theme, you should include this script: https://cdn.anychart.com/releases/8.5.0/themes/dark_blue.min.js
     */
     defaultTheme: "darkBlue"
  };

  var acGlobal;

  (function() {
    freeboard.addStyle("#setting-row-chart_code", "display:none");
    freeboard.addStyle("#setting-row-editor_model", "display:none");
    freeboard.addStyle("#setting-row-widget_id", "display:none");
  })();

  freeboard.loadWidgetPlugin({
    type_name: 'anychart_freeboard_plugin',
    display_name: 'Anychart',
    description: '<strong>AnyChart</strong> -- best charting solutions!',
    external_scripts: [
      'https://cdn.anychart.com/releases/8.5.0/js/anychart-bundle.min.js',
      'https://cdn.anychart.com/releases/8.5.0/fonts/css/anychart-font.min.css',
      //'plugins/thirdparty/anychart-editor.min.js',
      //'plugins/thirdparty/anychart-editor.min.css'
      'https://static.anychart.com/demos/editor/anychart-editor.min.js',
      'https://static.anychart.com/demos/editor/anychart-editor.min.css'
    ],

    fill_size: true,
    settings: [
      {
        name: 'data_source',
        display_name: 'Data source',
        type: 'calculated',
        multi_input: true,
        required: true
      },
      {
        name: 'max_points',
        display_name: 'Maximum points',
        type: 'number',
        default_value: 100
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
      // Hidden fields for widget inner purpose
      {
        name: 'chart_code',
        display_name: 'Chart code',
        type: 'text',
        description: "This field is for widget's internal using purpose"
      },
      {
        name: 'editor_model',
        display_name: 'Editor model',
        type: 'text',
        description: "This field is for widget's internal using purpose"
      },
      {
        name: 'widget_id',
        type: 'text',
        description: "This field is for widget's internal using purpose"
      }
    ],

    newInstance: function(settings, newInstanceCallback) {
      acGlobal = window['anychart'];

      if (acConfig.defaultTheme) {
        acGlobal.theme(acConfig.defaultTheme);
      }
      newInstanceCallback(new anychartWidget(settings));
    }
  });

  var anychartWidget = function(settings) {
    var self = this;
    var currentSettings = settings;
    var container;

    var chart;
    var dataSet = acGlobal.data.set();

    var editor;
    var editorOptions = {
      run: false,
      complete: false
    };

    self.render = function(element) {
      container = element;
      if (currentSettings.chart_code)
        self.drawChart();
    };

    self.drawChart = function() {
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

    self.runEditor = function() {
      if (!editor) {
        editorOptions.run = false;
        editor = new acGlobal['chartEditor'];
        editor.deserializeModel(currentSettings.editor_model);
        editor.step('data', false);
        editor.step('export', false);
        editor.data({data: dataSet});

        editor.listen('editorComplete', function() {
          // Get javascript code that creates configured chart
          currentSettings.chart_code = editor['getJavascript']({
            'minify': true,
            'addData': false,
            'addMarkers': true,
            'wrapper': '',
            'container': ''
          });

          currentSettings.editor_model = editor.serializeModel();

          editor.saveToCloud(function(err, id){
            if (id)
              currentSettings.widget_id = id;
          }, {
            'id': currentSettings.widget_id || void 0,
            'code': currentSettings.code,
            'model': currentSettings.editor_model
          });

          editorOptions.complete = true;
          self.closeEditor();
        });

        editor.listen('close', function(evt) {
          if (!editorOptions.complete && evt.target === editor)
            self.closeEditor();
        });

        editorOptions.complete = false;
        editor.dialogRender();
        editor.dialogVisible(true, 'anychart-ce-freeboard-dialog');
      }
    };

    self.closeEditor = function() {
      editor.dispose();
      editor.removeAllListeners();
      editor = null;

      if (editorOptions.complete)
        self.drawChart();
    };

    self.onCalculatedValueChanged = function(settingName, newValue) {
      switch (settingName) {
        case 'data_source': {
          dataSet.append(newValue);
          if (dataSet.getRowsCount() > currentSettings.max_points)
            dataSet.remove(0);

          if (editorOptions.run) {
            if (freeboard.isEditing())
              self.runEditor();
            else
              editorOptions.run = false;
          }
          break;
        }
      }
    };

    self.onSettingsChanged = function(newSettings) {
      // console.log(currentSettings, newSettings);
      var previousSettings = typeof currentSettings === 'object' ? Object.assign(currentSettings) : currentSettings;
      currentSettings = newSettings;

      if (newSettings.run_editor && freeboard.isEditing()) {
        editorOptions.run = true;
      } else {
        self.drawChart();
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
  };
}());