import { describe, expect, it } from 'vitest';

import { roundtripItemBody } from './index';

const parse = (xml: string): XMLDocument =>
  new DOMParser().parseFromString(xml, 'text/xml');

const itemXml = (itemAttrs: string, bodyAttrs = '') =>
  parse(`<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" ${itemAttrs}>
  <qti-item-body${bodyAttrs ? ' ' + bodyAttrs : ''}><p>body</p></qti-item-body>
</qti-assessment-item>`);

describe('roundtripItemBody', () => {
  it('copies identifier and title from the assessment item onto the item-body', () => {
    const doc = itemXml('identifier="ITEM42" title="My Item"');
    roundtripItemBody(doc);
    const body = doc.querySelector('qti-item-body')!;
    expect(body.getAttribute('identifier')).toBe('ITEM42');
    expect(body.getAttribute('title')).toBe('My Item');
  });

  it('is idempotent — preserves existing identifier/title on the item-body', () => {
    const doc = itemXml('identifier="ITEM42" title="My Item"', 'identifier="existing" title="Existing"');
    roundtripItemBody(doc);
    const body = doc.querySelector('qti-item-body')!;
    expect(body.getAttribute('identifier')).toBe('existing');
    expect(body.getAttribute('title')).toBe('Existing');
  });

  it('does nothing when the assessment item lacks the attributes', () => {
    const doc = itemXml('');
    roundtripItemBody(doc);
    const body = doc.querySelector('qti-item-body')!;
    expect(body.hasAttribute('identifier')).toBe(false);
    expect(body.hasAttribute('title')).toBe(false);
  });
});
