export function formatXml(xml: string): string {
    const PADDING = '  ';
    const reg = /(>)(<)(\/*)/g;
    let pad = 0;

    xml = xml.replace(reg, '$1\n$2$3');
    return xml
      .split('\n')
      .map(node => {
        let indent = 0;
        if (node.match(/^<\/\w/)) pad -= 1;
        indent = pad;
        if (node.match(/^<\w[^>]*[^\/]>.*$/)) pad += 1;
        return PADDING.repeat(indent) + node;
      })
      .join('\n');
  }