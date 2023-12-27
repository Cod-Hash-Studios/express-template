
function HttpGet(path) {
  return function (target, key, descriptor) {
    if (!target.routes) target.routes = [];
    target.routes.push({
      type: 'get',
      path,
      handler: descriptor.value,
    });
  };
}

function HttpPost(path) {
  return function (target, key, descriptor) {
    if (!target.routes) {
      target.routes = [];
    }
    target.routes.push({
      type: 'post',
      path,
      handler: descriptor.value
    });
  };
}

function HttpPut(path) {
  return function (target, key, descriptor) {
    if (!target.routes) target.routes = [];
    target.routes.push({
      type: 'put',
      path,
      handler: descriptor.value,
    });
  };
}

function HttpPatch(path) {
  return function (target, key, descriptor) {
    if (!target.routes) target.routes = [];
    target.routes.push({
      type: 'patch',
      path,
      handler: descriptor.value,
    });
  };
}

function HttpDelete(path) {
  return function (target, key, descriptor) {
    if (!target.routes) target.routes = [];
    target.routes.push({
      type: 'delete',
      path,
      handler: descriptor.value,
    });
  };
}

function Authorize({ roles }) {
  return function (target, key, descriptor) {
    const originalFunction = descriptor.value;
    descriptor.value = function (...args) {
      // Logique de vérification des rôles
      // Exemple : Vérifier si l'utilisateur a les rôles requis
      // Si non, renvoie une erreur ou un statut d'autorisation refusée
      return originalFunction.apply(this, args);
    };
  };
}

module.exports = { HttpGet, HttpPost, HttpPut, HttpPatch, HttpDelete, Authorize };

