"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProxyProperty = (propertyName) => function classDecorator(constructor) {
    return class extends constructor {
        constructor(...args) {
            super(...args);
            return new Proxy(this, {
                get: (target, prop) => {
                    if (target[prop] !== undefined) {
                        return target[prop];
                    }
                    else if (target[propertyName].hasOwnProperty(prop)) {
                        return target[propertyName][prop];
                    }
                }
            });
        }
    };
};
//# sourceMappingURL=proxy.js.map