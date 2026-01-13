import { jsDocTagsPlugin } from "@wc-toolkit/jsdoc-tags";
import { getTsProgram, typeParserPlugin } from "@wc-toolkit/type-parser";
import { cemSorterPlugin } from "@wc-toolkit/cem-sorter";

const proseMirrorTags = {
  pmNode: { mappedName: "proseMirrorNode" },
  pmGroup: { mappedName: "proseMirrorGroup" },
  pmContent: { mappedName: "proseMirrorContent" },
  pmMarks: { mappedName: "proseMirrorMarks" },
  pmAtom: { mappedName: "proseMirrorAtom" },
  pmSelectable: { mappedName: "proseMirrorSelectable" },
  pmDefining: { mappedName: "proseMirrorDefining" },
  pmIsolating: { mappedName: "proseMirrorIsolating" },
  pmToolbar: { mappedName: "proseMirrorToolbar" },
};

export default {
  globs: ["custom-elements/**/*.ts"],
  exclude: ["custom-elements/**/*.d.ts", "**/dist/**", "**/build/**"],
  outdir: ".",
  packagejson: false,

  overrideModuleCreation({ts, globs}) {
    const program = getTsProgram(ts, globs, "tsconfig.json");
    return program
      .getSourceFiles()
      .filter((sf) => globs.find((glob) => sf.fileName.includes(glob)));
  },

  plugins: [
    typeParserPlugin({
      outdir: '.'
    }),
    jsDocTagsPlugin({ tags: proseMirrorTags }),
    cemSorterPlugin({
      deprecatedLast: true,
    }),
    // Add JSDoc descriptions and custom element tags
    {
      name: "qti-elements-plugin",
      analyzePhase({ ts, node, moduleDoc }) {
        // Look for customElements.define calls to identify custom elements
        if (
          ts.isCallExpression(node) &&
          ts.isPropertyAccessExpression(node.expression) &&
          ts.isIdentifier(node.expression.expression) &&
          node.expression.expression.escapedText === "customElements" &&
          ts.isIdentifier(node.expression.name) &&
          node.expression.name.escapedText === "define"
        ) {
          const tagName = node.arguments[0];
          const className = node.arguments[1];

          if (ts.isStringLiteral(tagName) && ts.isIdentifier(className)) {
            // Find the class declaration in the same module
            const classDeclaration = moduleDoc.declarations?.find(
              (decl) => decl.name === className.escapedText
            );

            if (classDeclaration && classDeclaration.kind === "class") {
              classDeclaration.tagName = tagName.text;
              classDeclaration.customElement = true;

              // Add QTI-specific metadata
              if (tagName.text.startsWith("qti-")) {
                classDeclaration.summary = `QTI ${tagName.text} element based on 1EdTech QTI specification`;
              }
            }
          }
        }
      },
    },
  ],
};
