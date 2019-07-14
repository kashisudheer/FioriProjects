/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"demo/oft/zoft_etag_support/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});