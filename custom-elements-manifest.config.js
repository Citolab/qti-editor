export default {
  globs: ['custom-elements/**/*.ts'],
  exclude: ['custom-elements/**/*.d.ts'],
  outdir: '.',
  
  plugins: [
    // Add JSDoc descriptions and custom element tags
    {
      name: 'qti-elements-plugin',
      analyzePhase({ts, node, moduleDoc}) {
        // Look for customElements.define calls to identify custom elements
        if (ts.isCallExpression(node) && 
            ts.isPropertyAccessExpression(node.expression) &&
            ts.isIdentifier(node.expression.expression) &&
            node.expression.expression.escapedText === 'customElements' &&
            ts.isIdentifier(node.expression.name) &&
            node.expression.name.escapedText === 'define') {
          
          const tagName = node.arguments[0];
          const className = node.arguments[1];
          
          if (ts.isStringLiteral(tagName) && ts.isIdentifier(className)) {
            // Find the class declaration in the same module
            const classDeclaration = moduleDoc.declarations?.find(
              decl => decl.name === className.escapedText
            );
            
            if (classDeclaration && classDeclaration.kind === 'class') {
              classDeclaration.tagName = tagName.text;
              classDeclaration.customElement = true;
              
              // Add QTI-specific metadata
              if (tagName.text.startsWith('qti-')) {
                classDeclaration.summary = `QTI ${tagName.text} element based on 1EdTech QTI specification`;
              }
            }
          }
        }
      }
    }
  ]
};