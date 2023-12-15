module.exports = function (babel) {
  var t = babel.types;
  return {
    name: "custom-jsx-plugin",
    visitor: {
      JSXText(path) {
        // if the child of JSX Element is normal string
        var stringChild = t.stringLiteral(path.node.value);
        console.log(path.scope);
        path.replaceWith(stringChild, path.node);
      },
      JSXElement(path) {
        //get the opening element from jsxElement node
        var openingElement = path.node.openingElement;
        //tagname is name of tag like div, p etc
        var tagName = openingElement.name.name;
        // arguments for React.createElement function
        var args = [];
        //adds "div" or any tag as a string as one of the argument
        args.push(t.stringLiteral(tagName));
        var attribs = t.nullLiteral();
        attribs = openingElement.attributes;
        if (attribs.length) {
          var _props = [];
          while (attribs.length) {
            var prop = attribs.shift();
            if (t.isJSXSpreadAttribute(prop)) {
              prop.arguments._isSpread = true;
              _props.push(t.spreadElement(prop.argument));
            } else {
              _props.push(convertAttribute(prop, false));
            }
          }
          attribs = t.objectExpression(_props);
          args.push(attribs);
        } else {
          attribs = t.nullLiteral();
        }
        // order in AST Top to bottom -> (CallExpression => MemberExpression => Identifiers)
        // below are the steps to create a callExpression
        var reactIdentifier = t.identifier("encours"); //object
        var createElementIdentifier = t.identifier("createElement"); //property of object
        var callee = t.memberExpression(
          reactIdentifier,
          createElementIdentifier
        );
        var callExpression = t.callExpression(callee, args);
        //now add children as a third argument
        callExpression.arguments = callExpression.arguments.concat(
          path.node.children
        );
        // replace jsxElement node with the call expression node made above
        path.replaceWith(callExpression, path.node);
      },
    },
  };

  function convertAttribute(node, addArrow) {
    var value = convertAttributeValue(node.value || t.booleanLiteral(true));
    if (t.isStringLiteral(value) && !t.isJSXExpressionContainer(node.value)) {
      value.value = value.value.replace(/\n\s+/g, " ");
    }
    if (t.isValidIdentifier(node.name.name)) {
      node.name.type = "Identifier";
    } else {
      node.name = t.stringLiteral(node.name.name);
    }

    // extra option to add arrow around every attribute value that is js expression
    if (addArrow && t.isJSXExpressionContainer(node.value)) {
      value = t.arrowFunctionExpression([], value);
    }
    return t.inherits(t.objectProperty(node.name, value), node);
  }

  function convertAttributeValue(node) {
    if (t.isJSXExpressionContainer(node)) {
      return node.expression;
    } else {
      return node;
    }
  }
};
