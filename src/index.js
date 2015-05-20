// Modules
let path = require("path");
let watch = require("node-watch");

// Functions
let getFile = require("./functions/getFile");
let loadFavIcon = require("./functions/loadFavIcon");
let loadPages = require("./functions/loadPages");
let launchServer = require("./functions/launchServer");

// Classes
let Page = require("./classes/Page");
let Layout = require("./classes/Layout");
let Server = require("./classes/Server");
let LiveReload = require("./classes/LiveReload");
let EventEmitter = require("./classes/EventEmitter");

// Aero
let aero = {
	events: new EventEmitter(),
	pages: new Map(),
	server: new Server(),
	liveReload: new LiveReload(),

	// run
	run: function(configPath) {
		configPath = configPath || "package.json";

		// Register event listeners
		this.registerEventListeners();

		// Load default aero configuration
		let defaultConfig = require("../default/config");

		// Load aero config from package.json
		getFile(configPath, defaultConfig, function(json) {
			aero.package = JSON.parse(json);

			// Set config to the data in the "aero" field
			aero.config = aero.package.aero;

			// Let the world know that we're ready
			aero.events.emit("initialized", aero);

			// Watch for changes
			watch(aero.config.path.pages, function(filePath) {
				let relativeFilePath = path.relative(aero.config.path.pages, filePath);
				let pageId = path.dirname(relativeFilePath);

				aero.events.emit("page modified", pageId);
			});
		});
	},

	// registerEventListeners
	registerEventListeners: function() {
		this.events.on("initialized", function() {
			loadFavIcon(aero.config.favIcon, function(imageData) {
				aero.server.favIconData = imageData;
			});

			// Layout
			aero.layout = new Layout(aero.config.path.layout);

			// Pages
			loadPages(aero.config.path.pages, aero.loadPage);

			// Launch the server
			launchServer(aero);
		});

		// Page modifications
		this.events.on("page modified", function(pageId) {
			aero.loadPage(pageId);
			aero.liveReload.server.broadcast(pageId);
		});

		// Page loaded
		this.events.on("page loaded", function(page) {
			// Register a raw route
			aero.pages.set(page.id, page);
			aero.server.raw.set(page.url, page.controller.get.bind(page.controller));
			
			let contentType = {
				"Content-Type": "text/html"
			};
			
			let staticLayoutDynamicPage = function(request, response) {
				response.writeHead(200, contentType);
				
				page.controller.render(request, function(params) {
					response.end(aero.layout.renderTemplate({
						content: page.renderTemplate(params)
					}));
				});
			};
			
			// Routing
			if(aero.layout.controller) {
				// TODO: ...
			} else {
				if(page.controller.render) {
					aero.server.routes.set(page.url, staticLayoutDynamicPage);
				} else { // Static layout + Completely user-controlled dynamic page
					aero.server.routes.set(page.url, page.controller.get.bind(page.controller));
				}
			}
		});
	},

	// loadPage
	loadPage: function(pageId) {
		return new Page(pageId, path.join(aero.config.path.pages, pageId), function(page) {
			aero.events.emit("page loaded", page);
		});
	},

	// get
	get: function() {
		// Not implemented yet
	}
};

module.exports = aero;