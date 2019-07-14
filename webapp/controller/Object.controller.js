sap.ui.define([
	/*	"./BaseController",
		"sap/ui/model/json/JSONModel",
		"sap/ui/core/routing/History",
		"../model/formatter",
		"sap/m/Dialog",
		"sap/m/Button"*/
	"demo/oft/zoft_etag_support/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/routing/History",
	"demo/oft/zoft_etag_support/model/formatter",
	"sap/m/Dialog",
	"sap/m/Button"
], function (BaseController, JSONModel, History, formatter, Dialog, Button) {
	"use strict";

	return BaseController.extend("demo.oft.zoft_etag_support.controller.Object", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the worklist controller is instantiated.
		 * @public
		 */
		onInit: function () {
			// Model used to manipulate control states. The chosen values make sure,
			// detail page is busy indication immediately so there is no break in
			// between the busy indication for loading the view's meta data
			var iOriginalBusyDelay,
				oViewModel = new JSONModel({
					busy: true,
					delay: 0
				});

			this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);

			// Store original busy indicator delay, so it can be restored later on
			iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();
			this.setModel(oViewModel, "objectView");
			this.getOwnerComponent().getModel().metadataLoaded().then(function () {
				// Restore original busy indicator delay for the object view
				oViewModel.setProperty("/delay", iOriginalBusyDelay);
			});
		},

		// <!-- Added content	Begin- Tirumala 07/05/19	-->
		onSave: function (oEvent) {
			this._update(false);
		},
		_update: function (ignoreChangedVersion) {
			var sPath = this.getView().getBindingContext().getPath();
			var oSalesOrder = this.getView().getBindingContext().getObject();
			var that = this;
			this._fireUpdate(sPath, oSalesOrder, ignoreChangedVersion)
				.then(function () {
					debugger;
					sap.m.MessageToast.show("Update was successful..");
				}).catch(function (oErr) {
					debugger;
					if (oErr === "412") {
						that._openChoice();
					}
				});
		},
		_fireUpdate: function (sPath, oSalesOrder, ignoreChangedVersion) {
			debugger;
			var oDataModel = this.getView().getModel();
			return new Promise(function (resolve, reject) {
				debugger;
				var mParameter = {
					success: resolve,
					error: function (oErr) {
						reject(oErr.statusCode);
					}
				};
				if (ignoreChangedVersion === true) {
					mParameter.eTag = "*";
				}
				oDataModel.update(sPath, oSalesOrder, mParameter);
			});
		},
		_openChoice: function () {
			var that = this;
			var dialog = new Dialog({
				title: "Concurrent Update detected",
				type: "Message",
				content: new Text({
					text: "Hey, looks like this sales order was changed by some of your colleague already, What would you want to do now?"
				}),
				beginButton: new Button({
					text: "Overwrite",
					press: function () {
						that._update(true);
						dialog.close();
					}
				}),
				endButton: new Button({
					text: "Refresh",
					press: function () {
						//code to refresh the UI
						dialog.close();
					}
				}),
				afterClose: function () {
					dialog.destory();
				}
			});

			dialog.open();
		},

		// <!-- Added content end - Tirumala 07/05/19	-->

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * Event handler when the share in JAM button has been clicked
		 * @public
		 */
		onShareInJamPress: function () {
			var oViewModel = this.getModel("objectView"),
				oShareDialog = sap.ui.getCore().createComponent({
					name: "sap.collaboration.components.fiori.sharing.dialog",
					settings: {
						object: {
							id: location.href,
							share: oViewModel.getProperty("/shareOnJamTitle")
						}
					}
				});
			oShareDialog.open();
		},

		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */

		/**
		 * Binds the view to the object path.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
		_onObjectMatched: function (oEvent) {
			var sObjectId = oEvent.getParameter("arguments").objectId;
			this.getModel().metadataLoaded().then(function () {
				var sObjectPath = this.getModel().createKey("zapr_sales_order_kt", {
					SalesOrder: sObjectId
				});
				this._bindView("/" + sObjectPath);
			}.bind(this));
		},

		/**
		 * Binds the view to the object path.
		 * @function
		 * @param {string} sObjectPath path to the object to be bound
		 * @private
		 */
		_bindView: function (sObjectPath) {
			var oViewModel = this.getModel("objectView"),
				oDataModel = this.getModel();

			this.getView().bindElement({
				path: sObjectPath,
				events: {
					change: this._onBindingChange.bind(this),
					dataRequested: function () {
						oDataModel.metadataLoaded().then(function () {
							// Busy indicator on view should only be set if metadata is loaded,
							// otherwise there may be two busy indications next to each other on the
							// screen. This happens because route matched handler already calls '_bindView'
							// while metadata is loaded.
							oViewModel.setProperty("/busy", true);
						});
					},
					dataReceived: function () {
						oViewModel.setProperty("/busy", false);
					}
				}
			});
		},

		_onBindingChange: function () {
			var oView = this.getView(),
				oViewModel = this.getModel("objectView"),
				oElementBinding = oView.getElementBinding();

			// No data for the binding
			if (!oElementBinding.getBoundContext()) {
				this.getRouter().getTargets().display("objectNotFound");
				return;
			}

			var oResourceBundle = this.getResourceBundle(),
				oObject = oView.getBindingContext().getObject(),
				sObjectId = oObject.SalesOrder,
				sObjectName = oObject.SalesOrder;

			oViewModel.setProperty("/busy", false);
			// Add the object page to the flp routing history
			this.addHistoryEntry({
				title: this.getResourceBundle().getText("objectTitle") + " - " + sObjectName,
				icon: "sap-icon://enter-more",
				intent: "#ConcurrentupdatesusingStatelesscommunication-display&/zapr_sales_order_kt/" + sObjectId
			});

			oViewModel.setProperty("/saveAsTileTitle", oResourceBundle.getText("saveAsTileTitle", [sObjectName]));
			oViewModel.setProperty("/shareOnJamTitle", sObjectName);
			oViewModel.setProperty("/shareSendEmailSubject",
				oResourceBundle.getText("shareSendEmailObjectSubject", [sObjectId]));
			oViewModel.setProperty("/shareSendEmailMessage",
				oResourceBundle.getText("shareSendEmailObjectMessage", [sObjectName, sObjectId, location.href]));
		}

	});

});