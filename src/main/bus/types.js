/**
 * number、string、object、Boolean、null、undefined,function
 */

function TYPES() {
    this.NUMBER = 'number';
    this.STRING = 'string';
    this.OBJECT = 'object';
    this.BOOLEAN = 'boolean';
    this.UNDEFINED = 'undefined';
    this.FUNCTION = 'function';
    this.ARRAY='array';
}

function getType(obj) {
    if (typeof obj != 'object') {
        return (typeof obj);

    } else {
        if (isArray(obj)) {
            return 'array';
        } else {
            return 'object';
        }
    }
}

function isArray(arr) {
    return Object.prototype.toString.call(arr) === '[object Array]';
}

module.exports = {
    TYPES,getType
}