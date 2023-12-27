function setupControllers(app, controllers) {
	controllers.forEach((Controller) => {
	  const instance = new Controller();
	  if (instance.routes) {
		instance.routes.forEach((route) => {
			console.log(`Enregistrement de la route: ${route.type.toUpperCase()} ${route.path}`);
		  app[route.type](route.path, route.handler.bind(instance)); 
		});
	  }
	});
  }
  
module.exports = setupControllers;
