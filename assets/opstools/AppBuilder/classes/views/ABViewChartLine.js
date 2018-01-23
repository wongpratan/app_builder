/*
 * ABViewChartLine
 *
 * An ABViewChartLine defines a ChartLine view type.
 *
 */

import ABViewWidget from "./ABViewWidget"
import ABPropertyComponent from "../ABPropertyComponent"
// import ABViewChart from "./ABViewChart"

function L(key, altText) {
	return AD.lang.label.getLabel(key) || altText;
}


var ABViewChartLinePropertyComponentDefaults = {
	lineType: 'line',
	linePreset: 'plot',
	isLegend: true,
	// chartWidth: 600,
	chartHeight: 200,
	labelFontSize: 12,

}


var ABViewDefaults = {
	key: 'line',		// {string} unique key for this view
	icon: 'line-chart',		// {string} fa-[icon] reference for this view
	labelKey: 'ab.components.chart.line' // {string} the multilingual label key for the class label
}



export default class ABViewChartLine extends ABViewWidget {

	/**
	 * @param {obj} values  key=>value hash of ABView values
	 * @param {ABApplication} application the application object this view is under
	 * @param {ABView} parent the ABView this view is a child of. (can be null)
	 */
	constructor(values, application, parent) {

		super(values, application, parent, ABViewDefaults);

		OP.Multilingual.translate(this, this, ['lineLabel']);

	}


	static common() {
		return ABViewDefaults;
	}

	///
	/// Instance Methods
	///

	/**
	 * @method fromValues()
	 *
	 * initialze this object with the given set of values.
	 * @param {obj} values
	 */
	fromValues(values) {

		super.fromValues(values);

		this.settings.isLegend = JSON.parse(this.settings.isLegend || ABViewChartLinePropertyComponentDefaults.isLegend);

		// this.settings.chartWidth = parseInt(this.settings.chartWidth || ABViewChartLinePropertyComponentDefaults.chartWidth);
		this.settings.height = parseInt(this.settings.height || ABViewChartLinePropertyComponentDefaults.height);

		this.settings.labelFontSize = parseInt(this.settings.labelFontSize || ABViewChartLinePropertyComponentDefaults.labelFontSize);

	}



	//
	//	Editor Related
	//


	/** 
	 * @method editorComponent
	 * return the Editor for this UI component.
	 * the editor should display either a "block" view or "preview" of 
	 * the current layout of the view.
	 * @param {string} mode what mode are we in ['block', 'preview']
	 * @return {Component} 
	 */
	editorComponent(App, mode) {

		var idBase = 'ABViewChartLineEditorComponent';
		var ids = {
			component: App.unique(idBase + '_component')
		}
		var component = this.component(App);
		var _ui = component.ui;
		_ui.id = ids.component;

		var _init = (options) => {
			component.init(options);
		}

		var _logic = component.logic;

		return {
			ui: _ui,
			init: _init,
			logic: _logic
		}
	}



	//
	// Property Editor
	// 

	static propertyEditorDefaultElements(App, ids, _logic, ObjectDefaults) {

		var commonUI = super.propertyEditorDefaultElements(App, ids, _logic, ObjectDefaults);


		// in addition to the common .label  values, we 
		// ask for:
		return commonUI.concat([
			{
				name: 'lineType',
				view: 'richselect',
				label: L('ab.component.chart.line.lineType', '*Chart Type'),
				labelWidth: App.config.labelWidthLarge,
				options: [
					{ id: 'line', value: L('ab.component.chart.line.line', '*Line') },
					{ id: 'spline', value: L('ab.component.chart.line.spline', '*Spline') }
				]
			},
			{
				name: 'linePreset',
				view: 'richselect',
				label: L('ab.component.chart.line.linePreset', '*Chart Preset'),
				labelWidth: App.config.labelWidthLarge,
				options: [
					{ id: 'plot', value: L('ab.component.chart.line.plot', '*Plot') },
					{ id: 'diamond', value: L('ab.component.chart.line.diamond', '*Diamond') },
					{ id: 'simple', value: L('ab.component.chart.line.simple', '*Simple') }
				]
			},
			// {
			// 	name: 'chartWidth',
			// 	view: 'counter',
			// 	min: 1,
			// 	label: L('ab.component.chart.line.chartWidth', '*Width')
			// },
			{
				name: 'height',
				view: 'counter',
				min: 1,
				label: L('ab.component.chart.line.chartHeight', '*Height')
			},
			{
				name: 'labelFontSize',
				view: 'counter',
				min: 1,
				label: L('ab.component.chart.line.labelFontSize', '*Label Font Size'),
				labelWidth: App.config.labelWidthXLarge
			},
			{
				name: 'isLegend',
				view: 'checkbox',
				labelRight: L('ab.component.chart.isLegend', '*Show Legend'),
				labelWidth: App.config.labelWidthCheckbox
			},

		]);

	}


	static propertyEditorPopulate(ids, view) {

		super.propertyEditorPopulate(ids, view);

		// Make sure you set the values for this property editor in Webix
		// $$(ids.chartWidth).setValue(view.settings.chartWidth != null ? view.settings.chartWidth : ABViewChartLinePropertyComponentDefaults.chartWidth);
		// $$(ids.chartHeight).setValue(view.settings.chartHeight != null ? view.settings.chartHeight : ABViewChartLinePropertyComponentDefaults.chartHeight);
		$$(ids.labelFontSize).setValue(view.settings.labelFontSize != null ? view.settings.labelFontSize : ABViewChartLinePropertyComponentDefaults.labelFontSize);
		$$(ids.lineType).setValue(view.settings.lineType != null ? view.settings.lineType : ABViewChartLinePropertyComponentDefaults.lineType);
		$$(ids.linePreset).setValue(view.settings.linePreset != null ? view.settings.linePreset : ABViewChartLinePropertyComponentDefaults.linePreset);
		$$(ids.isLegend).setValue(view.settings.isLegend != null ? view.settings.isLegend : ABViewChartLinePropertyComponentDefaults.isLegend);
	}


	static propertyEditorValues(ids, view) {

		super.propertyEditorValues(ids, view);

		// Retrive the values of your properties from Webix and store them in the view
		view.settings.lineType = $$(ids.lineType).getValue();
		view.settings.linePreset = $$(ids.linePreset).getValue();
		view.settings.isLegend = $$(ids.isLegend).getValue();
		// view.settings.chartWidth = $$(ids.chartWidth).getValue();
		// view.settings.chartHeight = $$(ids.chartHeight).getValue();
		view.settings.labelFontSize = $$(ids.labelFontSize).getValue();

	}

	/*
	 * @component()
	 * return a UI component based upon this view.
	 * @param {obj} App 
	 * @return {obj} UI component
	 */
	component(App) {

		// get a UI component for each of our child views
		var viewComponents = [];
		this.views().forEach((v) => {
			viewComponents.push(v.component(App));
		})


		var idBase = 'ABViewChartLine_' + this.id;
		var ids = {
			component: App.unique(idBase + '_component'),
		}

		var _ui = {
			id: ids.component,
			cols: []
		};

		var reportData = this.parent.getReportData();
		var maxValue = this.getMaxValue(reportData, "value");
		var dataCount = Object.keys(reportData).length;
		var stepValue = 0;
		var endValue = 0;
		if (dataCount > 0 && maxValue) {
			if(this.parent.settings.isPercentage) {
				endValue = 100;
				stepValue = 20;
			}
			else {
				endValue = maxValue["value"];
				stepValue = Math.round(endValue / dataCount);
			}
		};

		_ui.cols.push({
			view: "chart",
			type: this.settings.lineType != null ? this.settings.lineType : ABViewChartLinePropertyComponentDefaults.lineType,
			preset: this.settings.linePreset != null ? this.settings.linePreset : ABViewChartLinePropertyComponentDefaults.linePreset,
			value: "#value#",
			color: "#color#",
			yAxis: {
				start: 0,
				step: stepValue,
				end: endValue
			},
			xAxis: {
				template: this.settings.isLegend == true ? "<div style='font-size:" + this.settings.labelFontSize + "px;'>#label#</div>" : ""
			},
			legend: this.settings.isLegend == true ? "<div style='font-size:" + this.settings.labelFontSize + "px;'>#label#</div>" : "",
			height: this.settings.height != null ? this.settings.height : ABViewChartLinePropertyComponentDefaults.height,
			// width: this.settings.chartWidth != null ? this.settings.chartWidth : ABViewChartLinePropertyComponentDefaults.chartWidth,
			data: reportData
		});

		// make sure each of our child views get .init() called
		var _init = (options) => {
		}


		var _logic = {
		}


		return {
			ui: _ui,
			init: _init,
			logic: _logic
		}
	}


	/*
	 * @method componentList
	 * return the list of components available on this view to display in the editor.
	 */
	componentList() {
		return [];
	}

	getMaxValue (arr, prop) {
		var max;
		for (var i=0 ; i<arr.length ; i++) {
			if (!max || parseInt(arr[i][prop]) > parseInt(max[prop]))
			max = arr[i];
		}
		return max;
	}

}