/** @license MIT License (c) copyright 2010-2013 original author or authors */

/**
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 *
 * @author Brian Cavalier
 * @author John Hann
 */

var paths = require('../lib/path');
var domPointer = require('./domPointer');
var fn = require('../lib/fn');

module.exports = DomTreeMap;

function DomTreeMap(node) {
	this.root = node;
	this.rebuild();
}

function removeNode (node, forest) {
	forest.some(function (tree, i) {
		if (tree.node === node) {
			forest.splice(i, 1);
			return true;
		}
	});
	return forest;
}

DomTreeMap.prototype = {
	rebuild: function() {
		this._tree = build(this.root);
	},

	add: function(path, node) {
		var t = findParent(this._tree, path);
		if (t !== void 0) {
			var key = paths.basename(path);
			if (t.isList) {
				t.list.splice(parseInt(key, 10), 0, build(node));
			} else {
				t.hash[key] = append(build(node), t.hash[key]);
			}
		}
	},

	replace: function(path, node) {
		var t = findParent(this._tree, path);
		if (t !== void 0) {
			var key = paths.basename(path);
			if (t.isList) {
				t.list[key] = build(node);
			} else {
				var forest = removeNode(node, t.hash[key]);
				t.hash[key] = append(build(node), forest);
			}
		}
	},

	remove: function(node) {
		var t = findParent(this._tree, domPointer(this.root, node));
		if (t) {
			var key = paths.basename(domPointer(this.root, node));
			if (t.isList) {
				t.list.splice(parseInt(key, 10), 1);
			} else {
				removeNode(node, t.hash[key]);
			}
		}
	},

	findNode: function(path) {
		var t = findParent(this._tree, path);
		var key = paths.basename(path);
		if(key) {
			t = t && getSubtree(t, key);
		}
		return t && t.node;
	},

	findNodes: function(path) {
		var t = findParent(this._tree, path);
		var key = paths.basename(path);
		if(key) {
			t = t && getSubtree(t, key);
		}

		if(t === void 0) {
			return [];
		}

		return Array.isArray(t) ? fn.map(function(t) {
			return t.node;
		}, t) : [t.node];
	}
};

function findParent(tree, path) {
	var parts = paths.split(paths.dirname(path));
	return fn.reduce(function(tree, part) {
		return (tree && part) ? getSubtree(tree, part) : tree;
	}, tree, parts);
}

function getSubtree(tree, key) {
	return tree && tree.isList ? getArray(key, tree.list) : getObject(key, tree.hash);
}

function getObject(k, o) {
	return o === void 0 ? void 0 : o[k];
}

function getArray(i, a) {
	return a === void 0 ? void 0 : a[i];
}

function build(node) {
	return appendChildren({ node: node, hash: void 0, list: void 0, isList: false }, node);
}

function appendChildren(tree, node) {
	if(domPointer.isListNode(node)) {
		tree.isList = true;
		return appendListChildren(tree, node.children);
	}

	return appendHashChildren(tree, node.children);
}

function appendListChildren(tree, children) {
	var list = tree.list === void 0
		? (tree.list = []) : tree.list;

	fn.reduce(function(list, child) {
		list.push(build(child));
		return list;
	}, list, children);

	return tree;
}

function appendHashChildren(tree, children) {
	var hash = tree.hash === void 0
		? (tree.hash = {}) : tree.hash;

	var i, child, key;
	for(i=0; i<children.length; ++i) {
		child = children[i];
		if(child.hasAttribute('data-path')) {
			key = child.getAttribute('data-path');
			hash[key] = append(build(child), hash[key]);
		} else if(child.hasAttribute('name')) {
			key = child.getAttribute('name');
			hash[key] = append(build(child), hash[key]);
		} else {
			appendChildren(tree, child);
		}
	}
	return tree;
}

function append(x, list) {
	if(list === void 0) {
		return [x];
	}
	list.push(x);
	return list;
}
