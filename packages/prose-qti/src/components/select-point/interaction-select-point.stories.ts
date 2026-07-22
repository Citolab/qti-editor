import '@citolab/prose-qti/components/select-point';
import '@citolab/prose-qti/components/shared';
import { html } from 'lit';

export default {
  title: 'Interactions/Select Point',
  parameters: {
    layout: 'fullscreen',
  },
};

const SAMPLE_IMAGE_DATA_URI =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 360'><defs><linearGradient id='bg' x1='0' y1='0' x2='1' y2='1'><stop offset='0%25' stop-color='%23f8fafc'/><stop offset='100%25' stop-color='%23dbeafe'/></linearGradient></defs><rect width='640' height='360' rx='24' fill='url(%23bg)'/><circle cx='170' cy='122' r='54' fill='%2393c5fd'/><rect x='332' y='108' width='188' height='128' rx='18' fill='%23bfdbfe'/><path d='M110 275 Q260 220 392 250 T585 230' fill='none' stroke='%232563eb' stroke-width='12' stroke-linecap='round'/></svg>";

const renderFixture = (content: unknown, note: string) => html`
  <style>
    .fixture-shell { min-height: 100vh; padding: 32px; background: linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%); box-sizing: border-box; }
    .fixture-card { max-width: 960px; margin: 0 auto; padding: 28px; border: 1px solid #dbe4f0; border-radius: 20px; background: rgba(255, 255, 255, 0.9); box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08); }
    .fixture-note { margin-top: 16px; color: #475569; font: 500 12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: 0.02em; text-transform: uppercase; }
  </style>
  <div class="fixture-shell"><div class="fixture-card">${content}<div class="fixture-note">${note}</div></div></div>
`;

export const AuthoringFixture = {
  render: () => renderFixture(html`
    <qti-select-point-interaction
      response-identifier="RESPONSE_SELECT_POINT"
      max-choices="1"
      min-choices="0"
      area-mappings='[{"id":"area-1","shape":"circle","coords":"170,122,54","mappedValue":1,"defaultValue":0}]'
      correct-response="170 122"
      score="3"
    >
      <qti-prompt>Select the highlighted review hotspot on the diagram.</qti-prompt>
      <img
        src=${SAMPLE_IMAGE_DATA_URI}
        alt="Sample review map"
        width="640"
        height="360"
      />
    </qti-select-point-interaction>
  `, 'image-based hotspot fixture with an inline SVG data URI'),
};
